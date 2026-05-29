import { NextApiRequest, NextApiResponse } from 'next';
import { serialize } from 'cookie';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Clear the access_token cookie
    const cookieOptions = {
        httpOnly: true,
        secure: true,
        sameSite: 'lax' as const,
        maxAge: 0, // Expire immediately
        path: '/',
    };

    res.setHeader('Set-Cookie', serialize('access_token', '', cookieOptions));
    res.status(200).json({ ok: true });
}