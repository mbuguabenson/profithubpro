import { Analytics } from '@deriv-com/analytics';
import { ACTION, form_name, type TFormStrategy } from './constants';
import { getRsStrategyType, getTradeParameterData } from './utils';

/* eslint-disable @typescript-eslint/no-explicit-any */

export const rudderStackSendQsRunStrategyEvent = ({
    form_values,
    selected_strategy,
}: any & TFormStrategy) => {
    Analytics.trackEvent('ce_bot_form', {
        action: ACTION.RUN_QUICK_STRATEGY,
        form_name,
        subform_name: 'quick_strategy',
        strategy_name: getRsStrategyType(selected_strategy) as any,
        ...getTradeParameterData({ form_values, selected_strategy }),
    } as any);
};

export const rudderStackSendQsEditStrategyEvent = ({
    form_values,
    selected_strategy,
}: any & TFormStrategy) => {
    Analytics.trackEvent('ce_bot_form', {
        action: ACTION.EDIT_QUICK_STRATEGY,
        form_name,
        subform_name: 'quick_strategy',
        strategy_name: getRsStrategyType(selected_strategy) as any,
        ...getTradeParameterData({ form_values, selected_strategy }),
    } as any);
};

export const rudderStackSendQsSelectedTabEvent = ({ quick_strategy_tab }: any) => {
    Analytics.trackEvent('ce_bot_form', {
        action: ACTION.SWITCH_QUICK_STRATEGY_TAB,
        form_name,
        subform_name: 'quick_strategy',
        quick_strategy_tab,
    } as any);
};
