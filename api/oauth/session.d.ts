/**
 * Express session type augmentation for the OAuth routes.
 * Adds `session` to the Express Request interface so TypeScript
 * is satisfied without requiring the full express-session package.
 */
declare namespace Express {
    interface Request {
        session?: {
            csrfToken?: string;
            oauthState?: string;
            stateTimestamp?: number;
            accessToken?: string;
            refreshToken?: string;
            idToken?: string;
            tokenExpiry?: number;
            userId?: string;
            email?: string;
            name?: string;
            tradingAccounts?: unknown[];
            tradeSession?: {
                sessionId: string;
                loginId: string;
                wsAuthToken: string;
                createdAt: number;
            };
            destroy(callback: (err?: Error | null) => void): void;
        };
    }
}
