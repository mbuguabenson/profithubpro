import { createCodeChallenge, createCodeVerifier, createState, storePKCEState } from '@/utils/pkce';
import { isStaging } from '../url/helpers';

export const DERIV_NEW_AUTH_URL = 'https://auth.deriv.com/oauth2/auth';
export const DERIV_NEW_TOKEN_URL = 'https://auth.deriv.com/oauth2/token';

export const APP_IDS = {
    LOCALHOST: 36300,
    TMP_STAGING: 113536,
    STAGING: 113536,
    STAGING_BE: 113536,
    STAGING_ME: 113536,
    PRODUCTION: 113536,
    PRODUCTION_BE: 113536,
    PRODUCTION_ME: 113536,
};

export const livechat_license_id = 12049137;
export const livechat_client_id = '66aa088aad5a414484c1fd1fa8a5ace7';

export const domain_app_ids = {
    'binaryhat.site': 113536,
};

export const normalizeDomain = (hostname: string) =>
    hostname
        ?.toLowerCase()
        .trim()
        .replace(/^www\./, '');

export const getCurrentProductionDomain = () => {
    const normalized_hostname = normalizeDomain(window.location.hostname);
    if (/^staging\./.test(normalized_hostname)) return undefined;
    return Object.keys(domain_app_ids).find(domain => normalizeDomain(domain) === normalized_hostname);
};

export const isProduction = () => {
    const normalized_hostname = normalizeDomain(window.location.hostname);
    return Object.keys(domain_app_ids).some(domain => normalizeDomain(domain) === normalized_hostname);
};

export const isTestLink = () => {
    return (
        window.location.origin?.includes('.binary.sx') ||
        window.location.origin?.includes('bot-65f.pages.dev') ||
        isLocal()
    );
};

export const isLocal = () => /localhost(:\d+)?$/i.test(window.location.hostname);

const getDefaultServerURL = () => {
    const server = 'ws';
    const server_url = `${server}.derivws.com`;

    return server_url;
};

export const getDefaultAppIdAndUrl = () => {
    const server_url = getDefaultServerURL();

    if (isTestLink()) {
        return { app_id: APP_IDS.LOCALHOST, server_url };
    }

    const current_domain = getCurrentProductionDomain() ?? '';
    const app_id = domain_app_ids[current_domain as keyof typeof domain_app_ids] ?? APP_IDS.PRODUCTION;

    return { app_id, server_url };
};

export const getAppId = () => {
    // Check localStorage first for user-configured app ID
    const stored_app_id = window.localStorage.getItem('config.app_id');
    if (stored_app_id) return Number(stored_app_id);

    let app_id = null;
    const current_domain = getCurrentProductionDomain() ?? '';

    if (isStaging()) {
        app_id = APP_IDS.STAGING;
    } else if (isTestLink()) {
        app_id = APP_IDS.LOCALHOST;
    } else {
        app_id = domain_app_ids[current_domain as keyof typeof domain_app_ids] ?? APP_IDS.PRODUCTION;
    }

    window.localStorage.setItem('config.app_id', app_id.toString());
    return app_id;
};

export const getSocketURL = () => {
    const local_storage_server_url = window.localStorage.getItem('config.server_url');
    if (local_storage_server_url) return local_storage_server_url;

    const server_url = getDefaultServerURL();

    return server_url;
};

export const checkAndSetEndpointFromUrl = () => {
    if (isTestLink()) {
        const url_params = new URLSearchParams(location.search.slice(1));

        if (url_params.has('qa_server') && url_params.has('app_id')) {
            const qa_server = url_params.get('qa_server') || '';
            const app_id = url_params.get('app_id') || '';

            url_params.delete('qa_server');
            url_params.delete('app_id');

            if (/^(^(www\.)?qa[0-9]{1,4}\.deriv.dev|(.*)\.derivws\.com)$/.test(qa_server) && /^[0-9]+$/.test(app_id)) {
                localStorage.setItem('config.app_id', app_id);
                localStorage.setItem('config.server_url', qa_server.replace(/"/g, ''));
            }

            const params = url_params.toString();
            const hash = location.hash;

            location.href = `${location.protocol}//${location.hostname}${location.pathname}${
                params ? `?${params}` : ''
            }${hash || ''}`;

            return true;
        }
    }

    return false;
};

export const getDebugServiceWorker = () => {
    const debug_service_worker_flag = window.localStorage.getItem('debug_service_worker');
    if (debug_service_worker_flag) return !!parseInt(debug_service_worker_flag);

    return false;
};

export const getClientId = () => {
    return process.env.OAUTH_CLIENT_ID || '33p2ypvZpsMU9BVEK4fkV';
};

export const getRedirectUri = () => {
    if (isLocal()) {
        return `${window.location.origin}/callback`;
    }
    return process.env.REDIRECT_URI || `${window.location.origin}/`;
};

export const generateOAuthURL = async (prompt?: string) => {
    const client_id = getClientId();
    const redirect_uri = getRedirectUri();
    const code_verifier = createCodeVerifier();
    const code_challenge = await createCodeChallenge(code_verifier);
    const state = createState();
    storePKCEState(code_verifier, state);

    console.log('🔐 OAuth URL Parameters:', { client_id, redirect_uri, scope: 'trade+account_manage' });

    let oauthUrl = `${DERIV_NEW_AUTH_URL}?response_type=code`;
    oauthUrl += `&client_id=${encodeURIComponent(client_id)}`;
    oauthUrl += `&redirect_uri=${encodeURIComponent(redirect_uri)}`;
    oauthUrl += `&scope=trade+account_manage`;
    oauthUrl += `&state=${encodeURIComponent(state)}`;
    oauthUrl += `&code_challenge=${encodeURIComponent(code_challenge)}`;
    oauthUrl += `&code_challenge_method=S256`;

    const app_id = getAppId();
    if (app_id) {
        oauthUrl += `&app_id=${encodeURIComponent(app_id)}`;
    }

    if (prompt) {
        oauthUrl += `&prompt=${encodeURIComponent(prompt)}`;
    }

    return oauthUrl;
};
