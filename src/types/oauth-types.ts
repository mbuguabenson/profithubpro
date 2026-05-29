/**
 * OAuth 2.0 TypeScript Types and Interfaces
 */

export type OAuthScope = 'read' | 'trade' | 'payments' | 'trading_information' | 'admin';

export interface OAuthConfig {
    siteUrl: string;
    clientId: string;
    legacyAppId: string;
    redirectUri: string;
    authUrl: string;
    tokenUrl: string;
    revokeUrl: string;
    scopes: OAuthScope[];
    enableLegacyMode: boolean;
    codeChallengeMethod: 'S256' | 'plain';
}

export interface PKCEParameters {
    codeVerifier: string;
    codeChallenge: string;
    state: string;
    nonce: string;
}

export interface OAuthToken {
    accessToken: string;
    refreshToken: string;
    idToken: string;
    expiresIn: number;
    tokenType: 'Bearer';
    scope: string;
    issuedAt: number;
}

export interface OAuthUser {
    userId: string;
    email: string;
    name: string;
    picture?: string;
    tradingAccounts: TradingAccount[];
}

export interface TradingAccount {
    loginId: string;
    currency: string;
    accountType: 'demo' | 'real';
    balance: number;
    isActive: boolean;
}

export interface OAuthTokenResponse {
    access_token: string;
    refresh_token: string;
    id_token: string;
    expires_in: number;
    token_type: 'Bearer';
    scope: string;
}

export interface OAuthErrorResponse {
    error: string;
    error_description?: string;
    error_uri?: string;
    state?: string;
}

export interface OAuthState {
    isAuthenticated: boolean;
    isLoading: boolean;
    error: OAuthErrorResponse | null;
    user: OAuthUser | null;
    token: OAuthToken | null;
    lastRefreshTime: number | null;
}

export interface LegacySession {
    accountsList: Record<string, string>;
    clientAccounts: Record<string, any>;
    activeLoginId: string;
    authToken: string;
    accountCurrency: string;
}

export interface MigrationConfig {
    detectLegacySessions: boolean;
    autoMigrationEnabled: boolean;
    preserveIntegrations: boolean;
    supportFutureUpgrades: boolean;
}

export interface OnboardingStep {
    id: string;
    title: string;
    description: string;
    completed: boolean;
    optional: boolean;
}

export interface AdminOnboardingConfig {
    siteUrl: string;
    clientId: string;
    legacyAppId: string;
    redirectUri: string;
    authUrl: string;
    tokenUrl: string;
    revokeUrl: string;
    scopes: OAuthScope[];
    enableLegacyMode: boolean;
}

export interface WebSocketAuthState {
    isConnected: boolean;
    isAuthenticated: boolean;
    lastHeartbeat: number;
    reconnectAttempts: number;
    maxReconnectAttempts: number;
}

export interface TradeSession {
    sessionId: string;
    userId: string;
    loginId: string;
    authToken: string;
    createdAt: number;
    expiresAt: number;
    isActive: boolean;
    wsAuthToken: string;
}

export interface SessionRecovery {
    lastKnownState: any;
    pendingTrades: any[];
    shouldReconnect: boolean;
    recoveryAttempts: number;
}

export interface RateLimitConfig {
    windowMs: number;
    maxRequests: number;
    message: string;
}

export interface SecurityHeaders {
    'Content-Security-Policy': string;
    'X-Content-Type-Options': string;
    'X-Frame-Options': string;
    'X-XSS-Protection': string;
    'Strict-Transport-Security': string;
}

export interface TokenCacheEntry {
    token: OAuthToken;
    cachedAt: number;
    expiresAt: number;
}
