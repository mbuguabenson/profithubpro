import { Analytics } from '@deriv-com/analytics';
import { ACTION, form_name, TFormStrategy } from './constants';
import { getRsStrategyType } from './utils';

/* eslint-disable @typescript-eslint/no-explicit-any */

export const rudderStackSendOpenEvent = ({
    subpage_name,
    subform_source,
    subform_name,
    load_strategy_tab,
}: any) => {
    Analytics.trackEvent('ce_bot_form', {
        action: ACTION.OPEN,
        form_name,
        subpage_name,
        subform_name,
        subform_source,
        load_strategy_tab,
    } as any);
};

export const rudderStackSendCloseEvent = ({
    subform_name,
    quick_strategy_tab,
    selected_strategy,
    load_strategy_tab,
    announcement_name,
}: any & TFormStrategy) => {
    Analytics.trackEvent('ce_bot_form', {
        action: ACTION.CLOSE,
        form_name,
        subform_name,
        quick_strategy_tab,
        strategy_name: getRsStrategyType(selected_strategy),
        load_strategy_tab,
        announcement_name,
    } as any);
};

export const rudderStackSendRunBotEvent = ({ subpage_name }: any) => {
    Analytics.trackEvent('ce_bot_form', {
        action: ACTION.RUN_BOT,
        form_name,
        subpage_name,
    } as any);
};

export const rudderStackSendUploadStrategyStartEvent = ({ upload_provider, upload_id }: any) => {
    Analytics.trackEvent('ce_bot_form', {
        action: ACTION.UPLOAD_STRATEGY_START,
        form_name,
        subform_name: 'load_strategy',
        subpage_name: 'bot_builder',
        upload_provider,
        upload_id,
    } as any);
};

export const rudderStackSendUploadStrategyCompletedEvent = ({
    upload_provider,
    upload_id,
    upload_type,
}: any) => {
    Analytics.trackEvent('ce_bot_form', {
        action: ACTION.UPLOAD_STRATEGY_COMPLETED,
        form_name,
        subform_name: 'load_strategy',
        subpage_name: 'bot_builder',
        upload_provider,
        upload_id,
        upload_type,
    } as any);
};

export const rudderStackSendUploadStrategyFailedEvent = ({
    upload_provider,
    upload_id,
    upload_type,
    error_message,
    error_code,
}: any) => {
    Analytics.trackEvent('ce_bot_form', {
        action: ACTION.UPLOAD_STRATEGY_FAILED,
        form_name,
        subform_name: 'load_strategy',
        subpage_name: 'bot_builder',
        upload_provider,
        upload_id,
        upload_type,
        error_message,
        error_code,
    } as any);
};

export const rudderStackSendGoogleDriveConnectEvent = () => {
    Analytics.trackEvent('ce_bot_form', {
        action: ACTION.GOOGLE_DRIVE_CONNECT,
        form_name,
        subpage_name: 'bot_builder',
    } as any);
};

export const rudderStackSendGoogleDriveDisconnectEvent = () => {
    Analytics.trackEvent('ce_bot_form', {
        action: ACTION.GOOGLE_DRIVE_DISCONNECT,
        form_name,
        subpage_name: 'bot_builder',
    } as any);
};
