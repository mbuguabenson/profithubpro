// Domain and App ID configurations for multi-tenant sites
export interface DomainAppConfig {
    domain: string;
    appId: string;
    title: string;
    logoUrl: string;
    backgroundUrl: string;
    // Add other customizable properties as needed
}

// Dynamically load configs from src/configs/ directory
const loadDomainConfigs = async (): Promise<Record<string, DomainAppConfig>> => {
    const configs: Record<string, DomainAppConfig> = {};

    // In a build environment, this would be handled differently
    // For now, we'll use a simple approach
    try {
        // This is a placeholder - in reality, we'd scan the configs directory
        // For dynamic loading, we might need to use import() or fetch
        const response = await fetch('/configs/index.json');
        if (response.ok) {
            const data = await response.json();
            Object.assign(configs, data);
        }
    } catch (error) {
        console.warn('Failed to load domain configs:', error);
    }

    return configs;
};

let domainAppConfigs: Record<string, DomainAppConfig> = {};

// Initialize configs
loadDomainConfigs().then(configs => {
    domainAppConfigs = configs;
});

// Function to get config by domain
export const getConfigByDomain = (domain: string): DomainAppConfig | null => {
    return domainAppConfigs[domain] || null;
};

// Function to get config by app ID
export const getConfigByAppId = (appId: string): DomainAppConfig | null => {
    for (const config of Object.values(domainAppConfigs)) {
        if (config.appId === appId) {
            return config;
        }
    }
    return null;
};

// Function to update config (used by editor)
export const updateDomainConfig = async (domain: string, config: Partial<DomainAppConfig>) => {
    // This would be implemented to update the file and commit
    console.log('Updating config for', domain, config);
    // Placeholder
};
