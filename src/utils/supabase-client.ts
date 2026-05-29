const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

const headers = {
    apikey: SUPABASE_ANON_KEY || '',
    Authorization: `Bearer ${SUPABASE_ANON_KEY || ''}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
};

export type SiteRecord = {
    app_id: string;
    domain: string;
    id?: string;
    title?: string;
};

export type SiteContentRecord = {
    content_json: Record<string, any>;
    updated_at: string;
};

const buildUrl = (path: string) => {
    if (!SUPABASE_URL) {
        throw new Error('Missing SUPABASE_URL environment variable');
    }
    return `${SUPABASE_URL}/rest/v1/${path}`;
};

export async function fetchSiteByDomain(domain: string) {
    const normalizedDomain = domain
        .toLowerCase()
        .replace(/^www\./, '')
        .trim();
    const url = buildUrl(
        `sites?domain=eq.${encodeURIComponent(normalizedDomain)}&select=app_id,domain,title,id&limit=1`
    );
    const response = await fetch(url, { headers });
    if (!response.ok) {
        throw new Error(`Failed to fetch site by domain: ${response.status}`);
    }
    const data = (await response.json()) as SiteRecord[];
    return data[0] ?? null;
}

export async function fetchContentByAppId(appId: string) {
    const url = buildUrl(`site_content?app_id=eq.${encodeURIComponent(appId)}&select=content_json,updated_at&limit=1`);
    const response = await fetch(url, { headers });
    if (!response.ok) {
        throw new Error(`Failed to fetch site content: ${response.status}`);
    }
    const data = (await response.json()) as SiteContentRecord[];
    return data[0] ?? null;
}
