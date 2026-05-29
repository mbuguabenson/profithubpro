import { useCallback, useState } from 'react';
import derivApiService from '@/lib/deriv-api-service';
import { transformProposalRequest, transformBuyRequest, transformSellRequest } from '@/utils/api-migration-adapter';

export type TBuyParams = {
    amount: number;
    basis: 'stake' | 'payout';
    contract_type: string;
    currency: string;
    duration: number;
    duration_unit: 't' | 's' | 'm' | 'h' | 'd';
    symbol: string;
    barrier?: string;
};

export const useTrading = () => {
    const [isExecuting, setIsExecuting] = useState(false);
    const [lastResult, setLastResult] = useState<Record<string, unknown> | null>(null);
    const [error, setError] = useState<string | null>(null);

    const buy = useCallback(async (params: TBuyParams) => {
        setIsExecuting(true);
        setError(null);
        try {
            // Transform proposal request to new API format (removes symbol→underlying_symbol, loginid, etc.)
            const legacyProposalRequest = {
                amount: params.amount,
                basis: params.basis,
                contract_type: params.contract_type,
                currency: params.currency,
                duration: params.duration,
                duration_unit: params.duration_unit,
                symbol: params.symbol,
                barrier: params.barrier,
            };
            const proposalRequest = transformProposalRequest(legacyProposalRequest);

            const proposal = await derivApiService.getProposal(proposalRequest);

            if (proposal.error) {
                throw new Error(proposal.error.message);
            }

            // Transform buy request to new API format (removes loginid)
            const legacyBuyRequest = {
                buy: proposal.proposal.id,
                price: params.amount,
            };
            const buyRequest = transformBuyRequest(legacyBuyRequest);

            const result = await derivApiService.buy(buyRequest);

            if (result.error) {
                throw new Error(result.error.message);
            }

            setLastResult(result.buy);
            return result.buy;
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Trade execution failed';
            setError(msg);
            throw new Error(msg);
        } finally {
            setIsExecuting(false);
        }
    }, []);

    const sell = useCallback(async (contractId: number, price: number = 0) => {
        setIsExecuting(true);
        setError(null);
        try {
            // Transform sell request to new API format (removes loginid, validates price >= 0)
            const legacySellRequest = {
                sell: contractId,
                price: price,
            };
            const sellRequest = transformSellRequest(legacySellRequest);

            const result = await derivApiService.sell(contractId, sellRequest.price);
            if (result.error) {
                throw new Error(result.error.message);
            }
            return result.sell;
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Contract sale failed';
            setError(msg);
            throw new Error(msg);
        } finally {
            setIsExecuting(false);
        }
    }, []);

    return { buy, sell, isExecuting, lastResult, error };
};

export default useTrading;
