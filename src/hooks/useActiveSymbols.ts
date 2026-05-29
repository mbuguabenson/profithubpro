import { useEffect, useState } from 'react';
import derivApiService from '@/lib/deriv-api-service';
import { transformActiveSymbolsRequest, transformActiveSymbolsResponse } from '@/utils/api-migration-adapter';

export type TSymbol = {
    symbol: string;
    display_name: string;
    market: string;
    submarket: string;
};

export const useActiveSymbols = () => {
    const [symbols, setSymbols] = useState<TSymbol[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setIsLoading(true);
        setError(null);

        // Transform to new API format (removes product_type, landing_company_short, etc.)
        const legacyRequest = { active_symbols: 'brief', product_type: 'basic' };
        const request = transformActiveSymbolsRequest(legacyRequest);

        derivApiService
            .sendRequest(request)
            .then(data => {
                // Transform response to include legacy field names for backwards compatibility
                const transformedData = transformActiveSymbolsResponse(data);
                if (transformedData.active_symbols) {
                    setSymbols(transformedData.active_symbols);
                }
            })
            .catch(err => {
                setError(err.message || 'Failed to fetch active symbols');
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, []);

    return { symbols, isLoading, error };
};

export default useActiveSymbols;
