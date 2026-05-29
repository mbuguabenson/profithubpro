import { NextApiRequest, NextApiResponse } from 'next';
import { serialize } from 'cookie';

const OAUTH_CLIENT_ID = process.env.OAUTH_CLIENT_ID || '33p2ypvZpsMU9BVEK4fkV';
// Base redirect/origin for the app (may be set to e.g. https://profithubpro.vercel.app)
const REDIRECT_URI = process.env.REDIRECT_URI || 'https://profithubpro.vercel.app';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    let body = req.body;
    if (typeof body === 'string') {
        try {
            const params = new URLSearchParams(body);
            body = {
                code: params.get('code'),
                code_verifier: params.get('code_verifier'),
                redirect_uri: params.get('redirect_uri'),
            };
        } catch (e) {
            body = {};
        }
    }

    const { code, code_verifier, redirect_uri } = body || {};

    if (!code || !code_verifier || !redirect_uri) {
        return res.status(400).json({ error: 'Invalid request' });
    }

    // Allow the canonical REDIRECT_URI or same-origin callback path (e.g. <origin>/callback).
    // This accepts a redirect_uri whose origin matches the configured REDIRECT_URI origin
    // and whose path is either '/' or '/callback' (with or without trailing slash).
    try {
        const incoming = new URL(redirect_uri);
        const base = new URL(REDIRECT_URI);
        const incoming_path = incoming.pathname.replace(/\/$/, '') || '/';
        const is_incoming_localhost = incoming.hostname === 'localhost' || incoming.hostname === '127.0.0.1';
        const base_origin_matches = incoming.origin === base.origin || is_incoming_localhost;
        const allowed_paths = ['/', '/callback'];

        if (!base_origin_matches || !allowed_paths.includes(incoming_path)) {
            console.warn('Rejecting unexpected redirect_uri', { redirect_uri, allowed_origin: base.origin, incoming_origin: incoming.origin, incoming_path });
            return res.status(400).json({ error: 'Invalid redirect_uri' });
        }
    } catch (err) {
        console.warn('Invalid redirect_uri format', { redirect_uri, err });
        return res.status(400).json({ error: 'Invalid redirect_uri' });
    }

    try {
        console.log('🔑 [Backend] Deriv token exchange request:', {
            client_id: OAUTH_CLIENT_ID,
            code: code.substring(0, 20) + '...',
            redirect_uri,
            code_verifier: code_verifier.substring(0, 20) + '...',
        });
        const tokenResponse = await fetch('https://auth.deriv.com/oauth2/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                client_id: OAUTH_CLIENT_ID,
                code,
                code_verifier,
                // Use the same redirect_uri that was sent by the frontend
                redirect_uri,
            }).toString(),
        });

        if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text();
            let errorData: any = null;
            try {
                errorData = JSON.parse(errorText);
            } catch {
                errorData = null;
            }

            console.error('Token exchange failed:', {
                status: tokenResponse.status,
                body: errorData ?? errorText,
            });

            return res.status(400).json({
                error: errorData?.error || 'Token exchange failed',
                error_description: errorData?.error_description || errorData?.message || errorText,
            });
        }

        const tokenData = await tokenResponse.json();
        const { access_token, expires_in } = tokenData;

        // Set HTTP-only cookie
        const cookieOptions = {
            httpOnly: true,
            secure: true,
            sameSite: 'lax' as const,
            maxAge: expires_in,
            path: '/',
        };

        res.setHeader('Set-Cookie', serialize('access_token', access_token, cookieOptions));

        // Return the token data to the client as well so front-end can store non-HTTP-only values if needed
        res.status(200).json(tokenData);
    } catch (error) {
        console.error('Error exchanging token:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}