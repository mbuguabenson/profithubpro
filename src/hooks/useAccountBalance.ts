import { useEffect, useState } from 'react';
import derivApiService, { TDerivResponse } from '@/lib/deriv-api-service';
import { transformBalanceRequest } from '@/utils/api-migration-adapter';

export type TBalance = {
    amount: number;
    currency: string;
    loginid: string;
};

export const useAccountBalance = (subscribe: boolean = true) => {
    const [balance, setBalance] = useState<TBalance | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setIsLoading(true);
        setError(null);

        // Transform to new API format (removes deprecated loginid, account params)
        const legacyRequest = { balance: 1, subscribe: subscribe ? 1 : 0 };
        const request = transformBalanceRequest(legacyRequest);

        const unsubscribe = derivApiService.subscribe(request, (data: TDerivResponse) => {
            if (data.error) {
                setError(data.error.message);
            } else if (data.balance) {
                setBalance({
                    amount: data.balance.balance,
                    currency: data.balance.currency,
                    loginid: data.balance.loginid,
                });
            }
            setIsLoading(false);
        });

        return () => {
            if (subscribe) {
                unsubscribe();
            }
        };
    }, [subscribe]);

    return { balance, isLoading, error };
};

export default useAccountBalance;
