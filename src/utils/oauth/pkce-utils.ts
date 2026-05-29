/**
 * OAuth 2.0 PKCE Code Generation Utilities
 * Implements SHA256 and Base64 URL encoding as per RFC 7636
 */

// Generate a random string for code_verifier
export const generateCodeVerifier = (): string => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    const length = 128; // Between 43-128 characters
    let result = '';
    const randomValues = new Uint8Array(length);
    crypto.getRandomValues(randomValues);
    
    for (let i = 0; i < length; i++) {
        result += characters[randomValues[i] % characters.length];
    }
    
    return result;
};

// Base64 URL encode without padding
const base64urlEncode = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

// Generate code_challenge from code_verifier using SHA256
export const generateCodeChallenge = async (codeVerifier: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return base64urlEncode(hash);
};

// Generate a random nonce for ID tokens
export const generateNonce = (): string => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const length = 32;
    let result = '';
    const randomValues = new Uint8Array(length);
    crypto.getRandomValues(randomValues);
    
    for (let i = 0; i < length; i++) {
        result += characters[randomValues[i] % characters.length];
    }
    
    return result;
};

// Generate a random state parameter
export const generateState = (): string => {
    return generateNonce(); // State can use same format as nonce
};

// Generate PKCE parameters object
export const generatePKCEParameters = async (): Promise<{
    codeVerifier: string;
    codeChallenge: string;
    state: string;
    nonce: string;
}> => {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const state = generateState();
    const nonce = generateNonce();
    
    return {
        codeVerifier,
        codeChallenge,
        state,
        nonce,
    };
};

// Validate code_verifier format
export const isValidCodeVerifier = (verifier: string): boolean => {
    return /^[A-Za-z0-9\-._~]{43,128}$/.test(verifier);
};

// Store PKCE parameters securely
export const storePKCEParameters = (params: {
    codeVerifier: string;
    state: string;
    nonce: string;
}): void => {
    const sessionData = {
        ...params,
        timestamp: Date.now(),
    };
    
    // Use sessionStorage for sensitive PKCE parameters (cleared on tab close)
    sessionStorage.setItem('oauth_pkce_params', JSON.stringify(sessionData));
};

// Retrieve and validate PKCE parameters
export const getPKCEParameters = (): {
    codeVerifier: string;
    state: string;
    nonce: string;
} | null => {
    const stored = sessionStorage.getItem('oauth_pkce_params');
    if (!stored) return null;
    
    try {
        const params = JSON.parse(stored);
        const now = Date.now();
        
        // Parameters expire after 10 minutes
        if (now - params.timestamp > 10 * 60 * 1000) {
            sessionStorage.removeItem('oauth_pkce_params');
            return null;
        }
        
        return {
            codeVerifier: params.codeVerifier,
            state: params.state,
            nonce: params.nonce,
        };
    } catch {
        return null;
    }
};

// Clear PKCE parameters after use
export const clearPKCEParameters = (): void => {
    sessionStorage.removeItem('oauth_pkce_params');
};

// Validate OAuth response state
export const validateOAuthState = (responseState: string): boolean => {
    const stored = getPKCEParameters();
    if (!stored) return false;
    
    return responseState === stored.state;
};

// Validate redirect URI format
export const isValidRedirectURI = (uri: string): boolean => {
    try {
        const url = new URL(uri);
        return url.protocol === 'https:' || url.hostname === 'localhost';
    } catch {
        return false;
    }
};
