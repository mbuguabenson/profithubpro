/**
 * OAuth 2.0 Service - Core Authentication Logic
 */

import {
    OAuthConfig,
    OAuthToken,
    OAuthTokenResponse,
    OAuthErrorResponse,
    PKCEParameters,
} from '@/types/oauth-types';
import {
    generatePKCEParameters,
    generateCodeChallenge,
    getPKCEParameters,
    clearPKCEParameters,
    validateOAuthState,
    isValidRedirectURI,
} from '@/utils/oauth/pkce-utils';

export class OAuth2Service {
    private config: OAuthConfig;
    private tokenCache: OAuthToken | null = null;
    private tokenRefreshTimer: NodeJS.Timeout | null = null;

    constructor(config: OAuthConfig) {
        this.validateConfig(config);
        this.config = config;
    }

    /**
     * Validate OAuth configuration
     */
    private validateConfig(config: OAuthConfig): void {
        const requiredFields = [
            'siteUrl',
            'clientId',
            'redirectUri',
            'authUrl',
            'tokenUrl',
        ];

        for (const field of requiredFields) {
            if (!config[field as keyof OAuthConfig]) {
                throw new Error(`Missing required OAuth config: ${field}`);
            }
        }

        if (!isValidRedirectURI(config.redirectUri)) {
            throw new Error('Invalid redirect URI: must be HTTPS or localhost');
        }
    }

    /**
     * Generate OAuth authorization URL
     */
    async generateAuthorizationUrl(): Promise<string> {
        const pkceParams = await generatePKCEParameters();
        
        // Store PKCE parameters for later verification
        localStorage.setItem('oauth_pkce_params', JSON.stringify(pkceParams));

        const params = new URLSearchParams({
            client_id: this.config.clientId,
            redirect_uri: this.config.redirectUri,
            response_type: 'code',
            scope: this.config.scopes.join(' '),
            state: pkceParams.state,
            nonce: pkceParams.nonce,
            code_challenge: pkceParams.codeChallenge,
            code_challenge_method: this.config.codeChallengeMethod,
            prompt: 'login',
        });

        return `${this.config.authUrl}?${params.toString()}`;
    }

    /**
     * Exchange authorization code for tokens
     */
    async exchangeCodeForToken(code: string, state: string): Promise<OAuthToken> {
        // Validate state parameter
        if (!validateOAuthState(state)) {
            throw new Error('Invalid OAuth state - possible CSRF attack');
        }

        const pkceParams = getPKCEParameters();
        if (!pkceParams) {
            throw new Error('PKCE parameters not found - session may have expired');
        }

        try {
            const response = await fetch(this.config.tokenUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json',
                },
                body: new URLSearchParams({
                    grant_type: 'authorization_code',
                    code,
                    client_id: this.config.clientId,
                    redirect_uri: this.config.redirectUri,
                    code_verifier: pkceParams.codeVerifier,
                }),
            });

            if (!response.ok) {
                const error = await response.json() as OAuthErrorResponse;
                throw new Error(`Token exchange failed: ${error.error_description || error.error}`);
            }

            const tokenResponse = await response.json() as OAuthTokenResponse;
            const token = this.convertTokenResponse(tokenResponse);

            // Cache the token
            this.cacheToken(token);

            // Clear PKCE parameters after successful exchange
            clearPKCEParameters();

            // Set automatic token refresh
            this.scheduleTokenRefresh(token);

            return token;
        } catch (error) {
            throw new Error(`Token exchange failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Refresh access token using refresh token
     */
    async refreshAccessToken(refreshToken: string): Promise<OAuthToken> {
        try {
            const response = await fetch(this.config.tokenUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json',
                },
                body: new URLSearchParams({
                    grant_type: 'refresh_token',
                    refresh_token: refreshToken,
                    client_id: this.config.clientId,
                }),
            });

            if (!response.ok) {
                const error = await response.json() as OAuthErrorResponse;
                throw new Error(`Token refresh failed: ${error.error_description || error.error}`);
            }

            const tokenResponse = await response.json() as OAuthTokenResponse;
            const token = this.convertTokenResponse(tokenResponse);

            // Cache the new token
            this.cacheToken(token);

            // Reschedule token refresh
            this.scheduleTokenRefresh(token);

            return token;
        } catch (error) {
            throw new Error(`Token refresh failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Revoke tokens (logout)
     */
    async revokeToken(token: string): Promise<void> {
        try {
            await fetch(this.config.revokeUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    token,
                    client_id: this.config.clientId,
                }),
            });

            this.clearCache();
        } catch (error) {
            console.error('Token revocation failed:', error);
            // Clear cache locally even if revocation fails
            this.clearCache();
        }
    }

    /**
     * Convert OAuth token response to internal format
     */
    private convertTokenResponse(response: OAuthTokenResponse): OAuthToken {
        return {
            accessToken: response.access_token,
            refreshToken: response.refresh_token,
            idToken: response.id_token,
            expiresIn: response.expires_in,
            tokenType: response.token_type,
            scope: response.scope,
            issuedAt: Date.now(),
        };
    }

    /**
     * Cache token in memory
     */
    private cacheToken(token: OAuthToken): void {
        this.tokenCache = token;
    }

    /**
     * Retrieve cached token
     */
    getToken(): OAuthToken | null {
        if (!this.tokenCache) {
            return null;
        }

        // Check if token is expired
        const expiryTime = this.tokenCache.issuedAt + this.tokenCache.expiresIn * 1000;
        if (Date.now() > expiryTime) {
            this.clearCache();
            return null;
        }

        return this.tokenCache;
    }

    /**
     * Schedule automatic token refresh
     */
    private scheduleTokenRefresh(token: OAuthToken): void {
        // Clear existing timer
        if (this.tokenRefreshTimer) {
            clearTimeout(this.tokenRefreshTimer);
        }

        // Calculate when to refresh (5 minutes before expiry)
        const refreshBuffer = 5 * 60 * 1000; // 5 minutes
        const refreshTime = token.expiresIn * 1000 - refreshBuffer;

        this.tokenRefreshTimer = setTimeout(() => {
            if (token.refreshToken) {
                this.refreshAccessToken(token.refreshToken).catch(err => {
                    console.error('Automatic token refresh failed:', err);
                });
            }
        }, Math.max(refreshTime, 0));
    }

    /**
     * Clear cached token and timers
     */
    private clearCache(): void {
        this.tokenCache = null;
        if (this.tokenRefreshTimer) {
            clearTimeout(this.tokenRefreshTimer);
            this.tokenRefreshTimer = null;
        }
    }

    /**
     * Update configuration
     */
    updateConfig(config: Partial<OAuthConfig>): void {
        this.config = { ...this.config, ...config };
        this.validateConfig(this.config);
    }

    /**
     * Get current configuration
     */
    getConfig(): OAuthConfig {
        return { ...this.config };
    }
}

// Singleton instance
let oauth2Service: OAuth2Service | null = null;

export const initializeOAuth2Service = (config: OAuthConfig): OAuth2Service => {
    oauth2Service = new OAuth2Service(config);
    return oauth2Service;
};

export const getOAuth2Service = (): OAuth2Service => {
    if (!oauth2Service) {
        throw new Error('OAuth2Service not initialized. Call initializeOAuth2Service first.');
    }
    return oauth2Service;
};
