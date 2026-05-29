/**
 * React Hooks for OAuth 2.0 Integration
 */

import { useCallback, useEffect, useReducer, useRef } from 'react';
import { OAuthState, OAuthUser, OAuthToken, OAuthErrorResponse } from '@/types/oauth-types';
import { OAuth2Service, getOAuth2Service } from '@/services/oauth/oauth2.service';

interface UseOAuthState extends OAuthState {
    tokenRefreshScheduled: boolean;
}

type OAuthAction =
    | { type: 'INIT_START' }
    | { type: 'AUTH_START' }
    | { type: 'AUTH_SUCCESS'; payload: { user: OAuthUser; token: OAuthToken } }
    | { type: 'AUTH_ERROR'; payload: OAuthErrorResponse }
    | { type: 'LOGOUT' }
    | { type: 'TOKEN_REFRESH' ; payload: OAuthToken }
    | { type: 'SET_ERROR'; payload: OAuthErrorResponse | null }
    | { type: 'SET_LOADING'; payload: boolean };

const initialState: UseOAuthState = {
    isAuthenticated: false,
    isLoading: false,
    error: null,
    user: null,
    token: null,
    lastRefreshTime: null,
    tokenRefreshScheduled: false,
};

const oauthReducer = (state: UseOAuthState, action: OAuthAction): UseOAuthState => {
    switch (action.type) {
        case 'INIT_START':
            return { ...state, isLoading: true };
        case 'AUTH_START':
            return { ...state, isLoading: true, error: null };
        case 'AUTH_SUCCESS':
            return {
                ...state,
                isAuthenticated: true,
                isLoading: false,
                user: action.payload.user,
                token: action.payload.token,
                error: null,
            };
        case 'AUTH_ERROR':
            return {
                ...state,
                isAuthenticated: false,
                isLoading: false,
                error: action.payload,
            };
        case 'LOGOUT':
            return initialState;
        case 'TOKEN_REFRESH':
            return {
                ...state,
                token: action.payload,
                lastRefreshTime: Date.now(),
            };
        case 'SET_ERROR':
            return { ...state, error: action.payload };
        case 'SET_LOADING':
            return { ...state, isLoading: action.payload };
        default:
            return state;
    }
};

/**
 * useOAuth - Main OAuth authentication hook
 */
export const useOAuth = () => {
    const [state, dispatch] = useReducer(oauthReducer, initialState);
    const oauthService = useRef<OAuth2Service | null>(null);

    // Initialize OAuth service
    useEffect(() => {
        try {
            oauthService.current = getOAuth2Service();
        } catch (error) {
            console.error('Failed to initialize OAuth service:', error);
        }
    }, []);

    // Check if user is already authenticated
    useEffect(() => {
        const checkAuth = async () => {
            dispatch({ type: 'INIT_START' });
            
            try {
                const token = oauthService.current?.getToken();
                
                if (token) {
                    // Restore user from session storage
                    const storedUser = localStorage.getItem('oauth_user');
                    if (storedUser) {
                        dispatch({
                            type: 'AUTH_SUCCESS',
                            payload: {
                                user: JSON.parse(storedUser),
                                token,
                            },
                        });
                    }
                } else {
                    dispatch({ type: 'SET_LOADING', payload: false });
                }
            } catch (error) {
                dispatch({ type: 'SET_LOADING', payload: false });
            }
        };

        checkAuth();
    }, []);

    const login = useCallback(async () => {
        if (!oauthService.current) {
            dispatch({
                type: 'AUTH_ERROR',
                payload: {
                    error: 'oauth_service_unavailable',
                    error_description: 'OAuth service not initialized',
                },
            });
            return;
        }

        dispatch({ type: 'AUTH_START' });
        
        try {
            const authUrl = await oauthService.current.generateAuthorizationUrl();
            window.location.href = authUrl;
        } catch (error) {
            dispatch({
                type: 'AUTH_ERROR',
                payload: {
                    error: 'auth_url_generation_failed',
                    error_description: error instanceof Error ? error.message : 'Failed to generate auth URL',
                },
            });
        }
    }, []);

    const handleOAuthCallback = useCallback(async (code: string, state: string) => {
        if (!oauthService.current) {
            dispatch({
                type: 'AUTH_ERROR',
                payload: {
                    error: 'oauth_service_unavailable',
                    error_description: 'OAuth service not initialized',
                },
            });
            return;
        }

        dispatch({ type: 'AUTH_START' });
        
        try {
            const token = await oauthService.current.exchangeCodeForToken(code, state);
            
            // Fetch user info
            const response = await fetch('/api/oauth/user', {
                headers: {
                    'Authorization': `Bearer ${token.accessToken}`,
                },
            });
            
            if (response.ok) {
                const user = await response.json() as OAuthUser;
                
                // Store user in localStorage
                localStorage.setItem('oauth_user', JSON.stringify(user));
                
                dispatch({
                    type: 'AUTH_SUCCESS',
                    payload: { user, token },
                });
            } else {
                throw new Error('Failed to fetch user information');
            }
        } catch (error) {
            dispatch({
                type: 'AUTH_ERROR',
                payload: {
                    error: 'token_exchange_failed',
                    error_description: error instanceof Error ? error.message : 'Token exchange failed',
                },
            });
        }
    }, []);

    const logout = useCallback(async () => {
        if (!oauthService.current || !state.token) return;

        try {
            await oauthService.current.revokeToken(state.token.accessToken);
            
            // Clear storage
            localStorage.removeItem('oauth_user');
            localStorage.removeItem('oauth_pkce_params');
            
            dispatch({ type: 'LOGOUT' });
        } catch (error) {
            console.error('Logout error:', error);
            // Still clear local state even if revocation fails
            dispatch({ type: 'LOGOUT' });
        }
    }, [state.token]);

    const refreshToken = useCallback(async () => {
        if (!oauthService.current || !state.token?.refreshToken) return;

        try {
            const newToken = await oauthService.current.refreshAccessToken(state.token.refreshToken);
            dispatch({ type: 'TOKEN_REFRESH', payload: newToken });
        } catch (error) {
            dispatch({
                type: 'AUTH_ERROR',
                payload: {
                    error: 'token_refresh_failed',
                    error_description: error instanceof Error ? error.message : 'Token refresh failed',
                },
            });
            // If refresh fails, logout user
            logout();
        }
    }, [state.token, logout]);

    return {
        ...state,
        login,
        logout,
        refreshToken,
        handleOAuthCallback,
    };
};

/**
 * useTokenRefreshEffect - Auto-refresh token before expiry
 */
export const useTokenRefreshEffect = (token: OAuthToken | null, onRefresh: () => Promise<void>) => {
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!token || !onRefresh) return;

        // Calculate when to refresh (5 minutes before expiry)
        const refreshBuffer = 5 * 60 * 1000; // 5 minutes
        const refreshTime = token.expiresIn * 1000 - refreshBuffer;

        timerRef.current = setTimeout(() => {
            onRefresh().catch(err => {
                console.error('Auto token refresh failed:', err);
            });
        }, Math.max(refreshTime, 0));

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, [token, onRefresh]);
};

/**
 * useOAuthCallback - Handle OAuth callback from redirect
 */
export const useOAuthCallback = () => {
    const { handleOAuthCallback } = useOAuth();

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const state = params.get('state');
        const error = params.get('error');

        if (error) {
            console.error('OAuth error:', error);
            // Handle error
        } else if (code && state) {
            handleOAuthCallback(code, state);
        }
    }, [handleOAuthCallback]);
};

/**
 * useOAuthUserData - Fetch user-specific trading data
 */
export const useOAuthUserData = (token: OAuthToken | null) => {
    const [userData, setUserData] = useReducer(
        (state, action: any) => ({ ...state, ...action }),
        { data: null, isLoading: false, error: null }
    );

    useEffect(() => {
        if (!token) return;

        const fetchUserData = async () => {
            setUserData({ isLoading: true });
            
            try {
                const response = await fetch('/api/oauth/user', {
                    headers: {
                        'Authorization': `Bearer ${token.accessToken}`,
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    setUserData({ data, isLoading: false, error: null });
                } else {
                    throw new Error('Failed to fetch user data');
                }
            } catch (error) {
                setUserData({
                    error: error instanceof Error ? error.message : 'Unknown error',
                    isLoading: false,
                });
            }
        };

        fetchUserData();
    }, [token]);

    return userData;
};
