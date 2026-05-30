/**
 * PKCE utilities for OAuth 2.0 Authorization Code with PKCE
 */

export function generateRandomString(length: number): string {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    // Use base64url encoding for higher entropy per character (PKCE spec compliant charset)
    const base64 = btoa(String.fromCharCode(...array));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export function createCodeVerifier(): string {
    // 32 random bytes → ~43 base64url chars (meets PKCE 43-128 char requirement)
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
    const verifier = sessionStorage.getItem('pkce_code_verifier');
    sessionStorage.removeItem('pkce_code_verifier');
    return verifier;
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
