type TTabsTitle = {
    [key: string]: string | number;
};

type TDashboardTabIndex = {
    [key: string]: number;
};

export const tabs_title: TTabsTitle = Object.freeze({
    WORKSPACE: 'Workspace',
    CHART: 'Chart',
});

export const DBOT_TABS: TDashboardTabIndex = Object.freeze({
    DASHBOARD: 0,
    BOT_BUILDER: 1,
    D_CIRCLES: 2,
    CHART: 3,
    FREE_BOTS: 4,
    COPY_TRADING: 5,
    SMART_TRADER: 6,
    DTRADER: 7,
    TRADINGVIEW: 8,
    // New Pro tabs
    PRO_ANALYSIS_TOOL: 9,
    PRO_CIRCLES_ANALYSIS: 10,
    PRO_EASY_TOOL: 11,
    PRO_MARKETKILLER: 12,
    PRO_MULTI_TRADER: 13,
    PRO_OVER_UNDER: 14,
    PRO_RISK_MANAGEMENT: 15,
    PRO_SIGNALS: 16,
    PRO_STRATEGIES: 17,
    PRO_TOOLHUB: 18,
    PRO_TOOL: 19,
    // Keep TUTORIAL as a non-active sentinel to avoid index mismatches in legacy checks
    TUTORIAL: 999,
});

export const MAX_STRATEGIES = 10;

export const TAB_IDS = [
    'id-dbot-dashboard',
    'id-bot-builder',
    'id-d-circles',
    'id-charts',
    'id-free-bots',
    'id-copy-trading',
    'id-smart-trader',
    'id-dtrader',
    'id-tradingview',
    // Pro tabs
    'id-pro-analysis-tool',
    'id-pro-circles-analysis',
    'id-pro-easy-tool',
    'id-pro-marketkiller',
    'id-pro-multi-trader',
    'id-pro-over-under',
    'id-pro-risk-management',
    'id-pro-signals',
    'id-pro-strategies',
    'id-pro-toolhub',
    'id-pro-tool',
];

export const DEBOUNCE_INTERVAL_TIME = 500;
