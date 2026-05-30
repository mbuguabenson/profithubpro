import { Analytics } from '@deriv-com/analytics';
import { ACTION, form_name } from './constants';

/* eslint-disable @typescript-eslint/no-explicit-any */

export const rudderStackSendDashboardClickEvent = ({ dashboard_click_name, subpage_name }: any) => {
    Analytics.trackEvent('ce_bot_form', {
        action: ACTION.DASHBOARD_CLICK,
        form_name,
        subpage_name,
        dashboard_click_name,
    } as any);
};

export const rudderStackSendAnnouncementClickEvent = ({ announcement_name }: any) => {
    Analytics.trackEvent('ce_bot_form', {
        action: ACTION.ANNOUNCEMENT_CLICK,
        form_name,
        subform_name: 'announcements',
        subform_source: 'dashboard',
        announcement_name,
    } as any);
};

export const rudderStackSendAnnouncementActionEvent = ({
    announcement_name,
    announcement_action,
}: any) => {
    Analytics.trackEvent('ce_bot_form', {
        action: ACTION.ANNOUNCEMENT_ACTION,
        form_name,
        subform_name: 'announcements',
        subform_source: 'dashboard',
        announcement_name,
        announcement_action,
    } as any);
};
