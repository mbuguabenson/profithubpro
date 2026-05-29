/**
 * PKCE utilities for OAuth 2.0 Authorization Code with PKCE
 */

export function generateRandomString(length: number): string {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

export function createCodeVerifier(): string {
    return generateRandomString(32);
}

export function createCodeChallenge(verifier: string): Promise<string> {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
        .then(hash => {
            const base64 = btoa(String.fromCharCode(...new Uint8Array(hash)));
            return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
        });
}

export function createState(): string {
    return generateRandomString(16);
}

export const storePKCEState = (verifier: string, state: string) => {
    sessionStorage.setItem('pkce_code_verifier', verifier);
    sessionStorage.setItem('pkce_state', state);
};

export const popPKCEVerifier = (): string | null => {
    return sessionStorage.getItem('pkce_code_verifier');
};

export const clearPKCEVerifier = () => {
    sessionStorage.removeItem('pkce_code_verifier');
    sessionStorage.removeItem('pkce_state');
};

export const validatePKCEState = (incomingState: string): boolean => {
    const savedState = sessionStorage.getItem('pkce_state');
    return incomingState === savedState;
};

export const generateState = (): string => generateRandomString(32);
