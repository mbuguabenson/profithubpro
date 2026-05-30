import { Analytics } from '@deriv-com/analytics';
import { ACTION, form_name } from './constants';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const rudderStackSendSwitchLoadStrategyTabEvent = ({ load_strategy_tab }: any) => {
    Analytics.trackEvent('ce_bot_form', {
        action: ACTION.SWITCH_QUICK_STRATEGY_TAB,
        form_name,
        load_strategy_tab,
        subform_name: 'load_strategy',
        subpage_name: 'bot_builder',
    } as any);
};
