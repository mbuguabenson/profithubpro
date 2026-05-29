import { useEffect, useRef, useState } from 'react';
import derivApiService from '@/lib/deriv-api-service';
import {
    transformTicksHistoryRequest,
    transformTicksRequest,
    transformTicksResponse,
} from '@/utils/api-migration-adapter';

export type TTick = {
    symbol: string;
    quote: number;
    epoch: number;
};

export type TMarketTicksOptions = {
    count?: number;
    subscribe?: boolean;
};

export const useMarketTicks = (symbol: string, options: TMarketTicksOptions = {}) => {
    const { count = 100, subscribe = true } = options;
    const [ticks, setTicks] = useState<TTick[]>([]);
    const [history, setHistory] = useState<number[]>([]);
    const [lastTick, setLastTick] = useState<TTick | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Ref to avoid stale closures in callbacks
    const symbolRef = useRef(symbol);
    symbolRef.current = symbol;

    useEffect(() => {
        if (!symbol) return;

        setIsLoading(true);
        setError(null);

        const historyRequest = transformTicksHistoryRequest({
            ticks_history: symbol,
            adjust_start_time: 1,
            count,
            end: 'latest',
            style: 'ticks',
        });

        derivApiService.send(historyRequest);

        // 2. Subscribe if requested
        let unsubscribe: (() => void) | null = null;

        if (subscribe) {
            const ticksRequest = transformTicksRequest({
                ticks: symbol,
                subscribe: 1,
            });

            unsubscribe = derivApiService.subscribe(ticksRequest, data => {
                const transformedData = transformTicksResponse(data);

                if (transformedData.msg_type === 'tick' && transformedData.tick) {
                    if (transformedData.tick.symbol === symbolRef.current) {
                        const newTick = {
                            symbol: transformedData.tick.symbol,
                            quote: parseFloat(transformedData.tick.quote),
                            epoch: transformedData.tick.epoch,
                        };
                        setLastTick(newTick);
                        setTicks(prev => [...prev.slice(-count + 1), newTick]);
                    }
                } else if (transformedData.msg_type === 'history' && transformedData.echo_req?.ticks_history === symbolRef.current) {
                    if (transformedData.error) {
                        setError(transformedData.error.message);
                    } else if (transformedData.history?.prices) {
                        setHistory(transformedData.history.prices);
                        const lastPrice = transformedData.history.prices[transformedData.history.prices.length - 1];
                        setLastTick({
                            symbol: symbolRef.current,
                            quote: lastPrice,
                            epoch: transformedData.history.times[transformedData.history.times.length - 1],
                        });
                    }
                    setIsLoading(false);
                } else if (transformedData.error && transformedData.echo_req?.ticks === symbolRef.current) {
                    setError(transformedData.error.message);
                }
            });
        }

        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [symbol, count, subscribe]);

    return {
        ticks,
        history,
        lastTick,
        error,
        isLoading,
    };
};

export default useMarketTicks;
