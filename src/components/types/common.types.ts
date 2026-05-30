// Shared common types for data-list and data-table components
import type { TContractInfo } from '@/types';

export type TRow = {
    [key: string]: any;
    contract_info?: TContractInfo;
};

export type TPassThrough = {
    [key: string]: any;
};
