import React from 'react';
import { useOauth2 } from '@/hooks/auth/useOauth2';
import useTMB from '@/hooks/useTMB';
import ChunkLoader from '@/components/loader/chunk-loader';
import { localize } from '@deriv-com/translations';

type AuthLoadingWrapperProps = {
    children: React.ReactNode;
};

const AuthLoadingWrapper = ({ children }: AuthLoadingWrapperProps) => {
    const { isSingleLoggingIn } = useOauth2();
    const { is_tmb_enabled: tmbEnabledFromHook } = useTMB();

    const is_tmb_enabled = tmbEnabledFromHook || window.is_tmb_enabled === true;

    if (isSingleLoggingIn && !is_tmb_enabled) {
        return <ChunkLoader message={localize('Authorizing account...')} />;
    }

    return <>{children}</>;
};

export default AuthLoadingWrapper;

