import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { fetchContentByAppId, fetchSiteByDomain } from '@/utils/supabase-client';

type SiteContent = {
    app_id: string;
    domain: string;
    content: Record<string, any>;
    updated_at?: string;
};

type SiteContentContextValue = {
    siteContent: SiteContent | null;
    isLoading: boolean;
    error: string | null;
};

const SiteContentContext = createContext<SiteContentContextValue>({
    siteContent: null,
    isLoading: false,
    error: null,
});

export const SiteContentProvider = ({ children }: { children: React.ReactNode }) => {
    const [siteContent, setSiteContent] = useState<SiteContent | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadContent = async () => {
            try {
                const currentDomain = window.location.hostname.replace(/^www\./, '').toLowerCase();
                const site = await fetchSiteByDomain(currentDomain);
                if (!site) {
                    setSiteContent(null);
                    return;
                }

                window.localStorage.setItem('siteprojects.domain', site.domain);
                window.localStorage.setItem('config.app_id', site.app_id.toString());

                const content = await fetchContentByAppId(site.app_id);
                setSiteContent({
                    app_id: site.app_id,
                    domain: site.domain,
                    content: content?.content_json ?? {},
                    updated_at: content?.updated_at,
                });
            } catch (err: any) {
                setError(err.message || 'Failed to load site content');
            } finally {
                setIsLoading(false);
            }
        };

        loadContent();
    }, []);

    useEffect(() => {
        if (!siteContent?.content?.theme) return;
        const theme = siteContent.content.theme;
        Object.entries(theme).forEach(([key, value]) => {
            if (typeof value === 'string') {
                document.documentElement.style.setProperty(`--site-${key}`, value);
            }
        });
    }, [siteContent]);

    useEffect(() => {
        if (!siteContent?.content?.branding?.title) return;
        document.title = siteContent.content.branding.title;
    }, [siteContent]);

    const value = useMemo(() => ({ siteContent, isLoading, error }), [siteContent, isLoading, error]);

    return <SiteContentContext.Provider value={value}>{children}</SiteContentContext.Provider>;
};

export const useSiteContent = () => useContext(SiteContentContext);
