# API Endpoint Usage Inventory

**Purpose**: Maps all Deriv API endpoint usage across the codebase for targeted migration  
**Status**: Generated from workspace scan - Phase 2 migration complete, remaining endpoints identified

---

## Endpoints Updated ✅

### 1. `active_symbols` - UPDATED
**Files Modified**:
- `src/hooks/useActiveSymbols.ts` - Uses adapter ✅
- `src/hooks/use-deriv.ts` - Uses adapter ✅

**Transformation Applied**: Removes `product_type`, `landing_company_short`

---

### 2. `balance` - UPDATED
**Files Modified**:
- `src/hooks/useAccountBalance.ts` - Uses adapter ✅
- `src/app/CoreStoreProvider.tsx` - Uses adapter + response transformation ✅

**Transformation Applied**: Removes deprecated params, transforms response to multi-account format

---

### 3. `proposal` - UPDATED
**Files Modified**:
- `src/hooks/useTrading.ts` - Uses adapter ✅
- `src/lib/digit-trade-engine.ts` - Uses adapter ✅

**Transformation Applied**: Removes `loginid`, `barrier_range`, `product_type`

---

### 4. `buy` - UPDATED
**Files Modified**:
- `src/hooks/useTrading.ts` - Uses adapter ✅
- `src/lib/digit-trade-engine.ts` - Uses adapter ✅

**Transformation Applied**: Removes `loginid`

---

### 5. `sell` - UPDATED
**Files Modified**:
- `src/hooks/useTrading.ts` - Uses adapter ✅

**Transformation Applied**: Removes `loginid`, validates price ≥ 0

---

### 6. `proposal_open_contract` - UPDATED
**Files Modified**:
- `src/lib/digit-trade-engine.ts` - Uses adapter (monitorTrade method) ✅

**Transformation Applied**: Removes `loginid`

---

## Endpoints Requiring Updates ❌

### High Priority (Trading Core)

#### 7. `contracts_for`
**Purpose**: Get available contracts for a symbol  
**Breaking Changes**: Remove `currency`, `landing_company_short`, `product_type`, `loginid`

**Files Using (Search Results)**:
- Need to locate with: `grep_search("contracts_for")`  
- Likely in: Bot configuration pages, contract selection components

**Current Usage Pattern**:
```typescript
// Legacy
api.send({
    contracts_for: symbol,
    currency: 'USD',
    landing_company_short: 'maltainvest',
    product_type: 'basic',
})
```

**Required Update**:
```typescript
// New API
const transformedRequest = transformContractsForRequest({
    contracts_for: symbol,
    // Remove currency, landing_company_short, product_type, loginid
});
api.send(transformedRequest);
```

---

#### 8. `portfolio`
**Purpose**: Get open positions  
**Breaking Changes**: Remove `loginid` parameter, transform `symbol` → `underlying_symbol`

**Files Using (Likely)**:
- Components displaying open positions/contracts
- Bot monitoring/management pages
- Account dashboard/summary pages

**Transformation Required**:
```typescript
// Before
api.send({ portfolio: 1, loginid: userLoginId })

// After
const transformedRequest = transformPortfolioRequest({ portfolio: 1 });
api.send(transformedRequest);

// Response transformation
const transformed = transformPortfolioResponse(response);
// Now includes symbol field for backwards compatibility
```

---

#### 9. `profit_table`
**Purpose**: Get account's profit/loss history  
**Breaking Changes**: Remove `loginid`, response `transactions` can be `null`

**Files Using (Likely)**:
- Account statements/history pages
- Performance analytics
- Profit/loss reporting components

**Transformation Required**:
```typescript
// Before
api.send({ profit_table: 1, loginid: userLoginId })

// After
const transformedRequest = transformProfitTableRequest({ profit_table: 1 });
api.send(transformedRequest);
```

---

#### 10. `statement`
**Purpose**: Get account transaction history  
**Breaking Changes**: Remove `loginid`, remove all transfer-related fields

**Files Using (Likely)**:
- Account history/statements display
- Transaction ledger
- Account activity feed

**Transformation Required**:
```typescript
// Before
api.send({ statement: 1, offset: 0, limit: 100, loginid: userLoginId })

// After
const transformedRequest = transformStatementRequest({
    statement: 1,
    offset: 0,
    limit: 100,
    // loginid removed
});
api.send(transformedRequest);

// Response: Filter out transfer_fee, transfer_to, etc.
```

---

#### 11. `transaction`
**Purpose**: Get specific transaction details  
**Breaking Changes**: Remove `loginid`, transform `symbol` → `underlying_symbol`

**Files Using (Likely)**:
- Transaction detail views
- Trade history display
- Account ledger

**Transformation Required**:
```typescript
// Before
api.send({ transaction: 1, transaction_id: id, loginid: userLoginId })

// After
const transformedRequest = transformTransactionRequest({
    transaction: 1,
    transaction_id: id,
    // loginid removed
});
api.send(transformedRequest);

// Response transformation
const transformed = transformTransactionResponse(response);
```

---

### Medium Priority (Advanced Features)

#### 12. `ticks` (Subscription)
**Purpose**: Real-time price updates  
**Breaking Changes**: 
- `epoch` field now required
- `quote` field now required
- `symbol` field always present
- `pip_size` validation required

**Files Using (Likely)**:
- `src/lib/deriv-websocket.ts` (if exists)
- Components showing live prices
- Price charts/candles
- Real-time ticker display

**Current Issue**: Response handler must validate new required fields

**Required Update**:
```typescript
// Response validation
handleTickUpdate(data) {
    if (data.msg_type === 'tick') {
        const tick = {
            ...data.tick,
            epoch: data.tick.epoch ?? Math.floor(Date.now() / 1000),
            quote: data.tick.quote ?? data.tick.ask ?? 0,
            symbol: data.tick.symbol, // Now guaranteed present
        };
        // ... process tick
    }
}
```

---

#### 13. `ticks_history`
**Purpose**: Historical price data  
**Breaking Changes**:
- `prices` array now required
- `times` array now required
- `ohlc` object now optional
- `open_time` field removed

**Files Using (Likely)**:
- Chart components (price history)
- Technical analysis tools
- Bot backtesting/strategy preview

**Required Update**:
```typescript
// Request
const transformedRequest = transformTicksHistoryRequest({
    ticks_history: symbol,
    adjust_start_time: 1,
    count: 100,
    granularity: 60,
    subscribe: 0,
});

// Response validation
handleTicksHistory(data) {
    if (!data.ticks_history?.prices || !data.ticks_history?.times) {
        throw new Error('Invalid response structure');
    }
}
```

---

#### 14. `contract_update`
**Purpose**: Update stop-loss/take-profit on open contracts  
**Breaking Changes**: Remove `loginid`, stricter field validation

**Files Using (Likely)**:
- Risk management/SL-TP adjustment UI
- Contract management pages
- Bot contract update logic

**Required Update**:
```typescript
// Before
api.send({
    contract_update: 1,
    contract_id: id,
    stop_loss: 50,
    take_profit: 100,
    loginid: userLoginId,
})

// After
const transformedRequest = transformContractUpdateRequest({
    contract_update: 1,
    contract_id: id,
    stop_loss: 50,
    take_profit: 100,
    // loginid removed
});
api.send(transformedRequest);
```

---

#### 15. `contract_update_history`
**Purpose**: Get contract update history  
**Breaking Changes**: Remove `loginid`

**Files Using (Likely)**:
- Contract audit trails
- Contract modification history views

**Required Update**:
```typescript
// Before
api.send({ contract_update_history: 1, contract_id: id, loginid: userLoginId })

// After
const transformedRequest = transformContractUpdateHistoryRequest({
    contract_update_history: 1,
    contract_id: id,
    // loginid removed
});
api.send(transformedRequest);
```

---

### Low Priority (Edge Cases)

#### 16. `forget` & `forget_all`
**Purpose**: Unsubscribe from streaming data  
**Breaking Changes**: Minor response type changes

**Files Using (Likely)**:
- Subscription cleanup in useEffect cleanup functions
- Unmounting components with live data

**Current Status**: May work without changes, but should test for new response format

---

## Implementation Roadmap

### Week 1: Core Endpoints (High Priority)
1. Create transformers for contracts_for, portfolio, profit_table, statement, transaction
2. Identify all files using each endpoint
3. Update identified files to use adapters
4. Test each endpoint independently

### Week 2: Advanced Features (Medium Priority)
1. Update ticks subscription handlers
2. Update ticks_history handlers
3. Update contract_update calls
4. Update contract_update_history calls
5. Add validation for new required fields

### Week 3: Integration & Testing
1. Test complete workflows
2. Verify UI displays correct data
3. Test account balance updates
4. Test live price streaming
5. Test contract lifecycle

### Week 4: Consolidation
1. Remove legacy auth flow (per user request)
2. Clean up adapter usage
3. Performance optimization
4. Final integration testing

---

## Next Steps

1. **Search for endpoint usage**:
   ```bash
   grep -r "contracts_for" src/ --include="*.ts" --include="*.tsx"
   grep -r "portfolio" src/ --include="*.ts" --include="*.tsx"
   grep -r "profit_table" src/ --include="*.ts" --include="*.tsx"
   grep -r "statement" src/ --include="*.ts" --include="*.tsx"
   grep -r "transaction" src/ --include="*.ts" --include="*.tsx"
   ```

2. **Update adapter with remaining transformers** (already added in api-migration-adapter.ts)

3. **Add transformations to each identified file**

4. **Test with updated API responses**

---

## Adapter Status

**Completed Transformers**:
- ✅ transformActiveSymbolsRequest/Response
- ✅ transformBalanceRequest/Response
- ✅ transformProposalRequest
- ✅ transformBuyRequest
- ✅ transformSellRequest
- ✅ transformProposalOpenContractRequest/Response
- ✅ transformPortfolioRequest/Response
- ✅ transformTransactionRequest/Response
- ✅ transformContractsForRequest/Response
- ✅ transformProfitTableRequest
- ✅ transformStatementRequest
- ✅ transformContractUpdateRequest
- ✅ transformContractUpdateHistoryRequest
- ✅ transformTicksRequest/Response
- ✅ transformTicksHistoryRequest/Response

**Master Dispatchers**:
- ✅ transformRequest(request, msgType)
- ✅ transformResponse(response, msgType, enableBackwardsCompat)

---

## Test Coverage Needed

### Unit Tests
- [ ] Each adapter function transforms correctly
- [ ] Backwards compatibility responses work
- [ ] Removed fields don't appear in transformed requests

### Integration Tests
- [ ] Full trading flow works
- [ ] Balance updates correctly
- [ ] Portfolio displays correctly
- [ ] History displays correctly
- [ ] Live prices stream correctly

### Manual Tests
- [ ] Login and account display
- [ ] View available contracts
- [ ] Place a trade
- [ ] View open positions
- [ ] Monitor live trades
- [ ] View account history
- [ ] Adjust trade parameters (SL/TP)

---

**Last Updated**: Current session (2025)  
**Migration Phase**: Phase 2 Complete - Core Infrastructure Ready  
**Next Phase**: High Priority Endpoints (contracts_for, portfolio, etc.)
