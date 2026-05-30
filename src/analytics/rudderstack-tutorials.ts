import { Analytics } from '@deriv-com/analytics';
import { ACTION, form_name, TSelectedStrategy } from './constants';
import { getRsStrategyType } from './utils';

/* eslint-disable @typescript-eslint/no-explicit-any */

export const rudderStackSendSelectQsStrategyGuideEvent = ({ selected_strategy }: TSelectedStrategy) => {
    Analytics.trackEvent('ce_bot_form', {
        action: ACTION.SELECT_QUICK_STRATEGY_GUIDE,
        form_name,
        subpage_name: 'tutorials',
        strategy_name: getRsStrategyType(selected_strategy) as any,
    } as any);
};

export const rudderStackSendTutorialSearchEvent = ({ search_term }: any) => {
    Analytics.trackEvent('ce_bot_form', {
        action: 'search',
        form_name: 'ce_bot_form',
        subpage_name: 'tutorials',
        search_term,
    } as any);
};
