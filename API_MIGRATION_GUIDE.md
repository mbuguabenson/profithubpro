# Legacy API → New API (v4) Migration Guide

**Status**: Phase 2 Complete - Infrastructure & Core Hooks Updated  
**Target**: Complete migration of all 20+ endpoints to New API v4  
**Reference**: https://developers.deriv.com/comparison/

---

## Executive Summary

The system is migrating from **Deriv Legacy API** to **Deriv New API (v4)** to modernize the codebase and align with current platform standards. This migration involves:

- **17 main endpoints** with breaking changes
- **Field name transformations** (symbol → underlying_symbol, pip → pip_size, etc.)
- **Parameter removals** (loginid, product_type, landing_company_short, currency in requests)
- **Response structure changes** (single-account vs multi-account, field type changes)
- **Backwards compatibility layer** for existing code

---

## Completed Work ✅

### 1. API Migration Adapter (`src/utils/api-migration-adapter.ts`)
**Purpose**: Centralized transformation layer for all Legacy↔New API conversions

**Components**:
- **Request Transformers**: 17 functions to strip deprecated parameters
  - `transformActiveSymbolsRequest()` - Removes product_type, landing_company_short
  - `transformBalanceRequest()` - Removes account, loginid
  - `transformProposalRequest()` - Changes symbol→underlying_symbol
  - `transformBuyRequest()` - Removes loginid
  - `transformSellRequest()` - Removes loginid, validates price ≥ 0
  - ... (and 12 more for other endpoints)

- **Response Transformers**: 8 functions to add backwards-compatibility
  - `transformActiveSymbolsResponse()` - Adds legacy field aliases
  - `transformBalanceResponse()` - Creates multi-account structure from single-account response
  - `transformPortfolioResponse()` - Adds symbol field aliases
  - ... (and 5 more)

- **Master Dispatchers**:
  - `transformRequest(request, msgType)` - Routes to correct request transformer
  - `transformResponse(response, msgType, enableBackwardsCompat)` - Routes to correct response transformer

**Key Strategy**: Adapter creates backwards-compatible responses so existing store/component logic continues working without modification.

### 2. Hook Updates ✅
Updated following hooks to use transformation adapter:

#### `src/hooks/useAccountBalance.ts`
```typescript
// OLD: Sends balance request with deprecated params
const request = { balance: 1, subscribe: subscribe ? 1 : 0 };

// NEW: Uses adapter to transform
const legacyRequest = { balance: 1, subscribe: subscribe ? 1 : 0 };
const request = transformBalanceRequest(legacyRequest);
```

#### `src/hooks/useActiveSymbols.ts`
```typescript
// OLD: Sends with product_type parameter (removed in New API)
sendRequest({ active_symbols: 'brief', product_type: 'basic' })

// NEW: Transforms and adds legacy field names to response
const request = transformActiveSymbolsRequest({ active_symbols: 'brief', product_type: 'basic' });
const response = transformActiveSymbolsResponse(data);
```

#### `src/hooks/use-deriv.ts`
- Updated active_symbols request transformation
- Updated ticks subscription transformation

#### `src/hooks/useTrading.ts`
```typescript
// Proposal request now uses adapter
const proposalRequest = transformProposalRequest(legacyProposalRequest);

// Buy request now uses adapter
const buyRequest = transformBuyRequest(legacyBuyRequest);

// Sell request now uses adapter & validates price ≥ 0
const sellRequest = transformSellRequest(legacySellRequest);
```

### 3. Core Store Updates ✅

#### `src/app/CoreStoreProvider.tsx`
```typescript
// Transforms balance response to backwards-compatible format
const transformedData = transformBalanceResponse(data);
const balance = transformedData.balance;
// Now balance.accounts exists even in New API (adapter creates it)
```

**Impact**: Existing balance handling logic (setting current account, currency, etc.) works unchanged.

### 4. Trade Engine Updates ✅

#### `src/lib/digit-trade-engine.ts`
Updated three critical request types:
```typescript
// Proposal request transformation
const transformedProposalData = transformProposalRequest(proposal_data);

// Buy request transformation  
const transformedBuyRequest = transformBuyRequest(buy_request);

// Contract monitoring request transformation
const pocRequest = transformProposalOpenContractRequest({ 
    proposal_open_contract: 1, 
    contract_id 
});
```

---

## Remaining Work 📋

### High Priority: Core Trading Endpoints

#### 1. `contracts_for` Endpoint
**File**: Multiple - needs search for usage
**Changes**:
- Remove: `currency`, `landing_company_short`, `product_type`, `loginid`
- Keep: `contracts_for` (required)

**Migration Pattern**:
```typescript
// Before
api.send({
    contracts_for: symbol,
    currency: 'USD',
    landing_company_short: 'maltainvest',
    product_type: 'basic',
})

// After
api.send({
    contracts_for: symbol,
    // All others removed
})
```

**Files to Update**:
- Find with: `grep_search("contracts_for")`

---

#### 2. `ticks` Subscription Updates
**Affected Files**: 
- `src/hooks/use-deriv.ts` (handleTick callback)
- `src/lib/deriv-websocket.ts` (if exists)
- Any components directly using ticks

**Response Changes**:
- `epoch` field: Now required (was optional)
- `quote` field: Now required (was optional)  
- `symbol` field: Always present (now required)
- `pip_size`: Remains optional but should be validated

**Migration Pattern**:
```typescript
// Validation in response handler
const tick = {
    ...data.tick,
    epoch: data.tick.epoch ?? Math.floor(Date.now() / 1000),
    quote: data.tick.quote ?? data.tick.ask ?? 0,
    symbol: data.tick.symbol, // Now guaranteed present
};
```

---

#### 3. `ticks_history` Endpoint
**Changes**:
- `prices` array: Now required (was optional)
- `times` array: Now required (was optional)
- `ohlc` object: Now optional (was required)
- `open_time` field: Removed

**Migration Pattern**:
```typescript
// Response handler must validate arrays exist
if (!data.ticks_history?.prices || !data.ticks_history?.times) {
    throw new Error('Invalid ticks_history response');
}
```

---

#### 4. `portfolio` Endpoint
**Changes**:
- Remove: `loginid` parameter from request
- Transform: `symbol` → `underlying_symbol` (in request)
- Add back: `symbol` field in response (for backwards compatibility)

**Files to Update**: 
- Find with: `grep_search("portfolio")`

---

#### 5. `profit_table` Endpoint
**Changes**:
- Remove: `loginid` parameter
- Remove: `skip` parameter (use `offset` instead)
- Response: `transactions` array may be `null`

**Migration Pattern**:
```typescript
// Before
api.send({ profit_table: 1, loginid: 'CR123456' })

// After  
api.send({ profit_table: 1 })
// loginid is implicit in current session
```

---

#### 6. `statement` Endpoint
**Changes**:
- Remove: `loginid` parameter
- Remove: `currency` parameter (implicit)
- Remove: All transfer-related response fields
  - `transfer`, `transfer_fee`, `transfer_to`, etc.
- Keep: Only trading transaction fields

---

#### 7. `transaction` Endpoint
**Changes**:
- Remove: `loginid` parameter  
- Transform: `symbol` → `underlying_symbol`
- Response: Add `symbol` alias for backwards compatibility

---

#### 8. `contract_update` Endpoint
**Changes**:
- Remove: `loginid` parameter
- Field: `limit_order` now has stricter validation
- Field: `take_profit` and `stop_loss` must be ≥ 0 if provided

---

#### 9. `contract_update_history` Endpoint
**Changes**:
- Remove: `loginid` parameter
- Response: Same structure but with field type changes

---

#### 10. `forget` & `forget_all` Endpoints
**Changes**:
- No parameter changes (still work with subscription streaming)
- Response type: May return boolean instead of object

---

### Medium Priority: Market Data & Streaming

#### Update `subscribe()` and streaming handlers
**Affected Components**:
- Components that use market data subscriptions
- Components that display real-time prices
- Components with contract monitoring

**Changes Required**:
- All subscription setup: Remove loginid from request
- All response handlers: Handle new required fields
- Error handling: New error codes may appear

---

### Low Priority: UI/Display Updates

#### Handle Removed Display Fields
Some fields are removed entirely in New API - no replacement:
- `market_display_name`
- `spot_display_value` 
- `display_name` (in some contexts)
- `barrier_display` (in some contexts)

**Solution**:
- UI components should construct these from available data
- Example: Use `underlying_symbol_name` instead of `display_name`

---

## Implementation Checklist

### Week 1: Core Endpoints
- [ ] Update `contracts_for` calls across codebase
- [ ] Update `portfolio` subscription/display
- [ ] Update `profit_table` display
- [ ] Update `statement` display
- [ ] Update `transaction` display

### Week 2: Advanced Features
- [ ] Update `ticks_history` for chart data
- [ ] Update `contract_update` logic
- [ ] Update `forget/forget_all` implementations
- [ ] Add error handling for new API error codes

### Week 3: Integration Testing  
- [ ] Test full contract lifecycle (proposal → buy → monitor → sell)
- [ ] Test balance updates across multiple API calls
- [ ] Test market data streaming with new required fields
- [ ] Test account switching (if applicable)
- [ ] Verify UI displays correct data without deprecated fields

### Week 4: Consolidation & Cleanup
- [ ] Remove deprecated OIDC auth flow (per user request)
- [ ] Clean up adapter usage - promote common patterns
- [ ] Add integration tests for API layer
- [ ] Performance testing and optimization

---

## Testing Strategy

### Unit Tests
```typescript
// Test adapter transformations
test('transformActiveSymbolsRequest removes product_type', () => {
    const legacy = { active_symbols: 'brief', product_type: 'basic' };
    const result = transformActiveSymbolsRequest(legacy);
    expect(result.product_type).toBeUndefined();
    expect(result.active_symbols).toBe('brief');
});
```

### Integration Tests
```typescript
// Test full workflow
test('complete trading flow with API migrations', async () => {
    // 1. Get symbols
    const symbols = await getActiveSymbols();
    // 2. Get contracts
    const contracts = await getContractsFor(symbols[0]);
    // 3. Create proposal
    const proposal = await getProposal({...});
    // 4. Buy contract
    const trade = await buyContract(proposal);
    // 5. Monitor contract
    const status = await getOpenContract(trade.id);
    expect(status.contract_id).toBe(trade.id);
});
```

### Manual Testing
1. **Login** → Verify balance displays
2. **View Markets** → Verify symbols load
3. **Place Trade** → Verify proposal and execution
4. **Monitor** → Verify real-time updates with new field requirements
5. **Review History** → Verify profit/statement displays

---

## Error Handling

### New API Error Codes
Watch for these new error codes that may appear:
- `InvalidParamValue` - Parameter validation stricter
- `RequestLimit` - Rate limiting
- `DuplicateRequest` - Request already in flight

### Deprecated Parameter Errors
If API receives deprecated parameters like `loginid` on new endpoint:
- May receive `InvalidParamValue` error
- Adapter prevents this by stripping parameters
- If error occurs, check adapter isn't being bypassed

---

## Backwards Compatibility Strategy

### Multi-Account Response Handling
New API doesn't return `balance.accounts` object. Adapter creates it:

```typescript
// New API Response
{
    balance: {
        loginid: 'CR123',
        balance: 1000.00,
        currency: 'USD'
    }
}

// After transformBalanceResponse()
{
    balance: {
        loginid: 'CR123',
        balance: 1000.00,
        currency: 'USD',
        accounts: {
            'CR123': {
                balance: 1000.00,
                currency: 'USD',
                // ... other fields
            }
        }
    }
}
```

### Field Aliases
Response transformers add legacy field names:
- New field: `underlying_symbol` → Alias: `symbol`
- New field: `underlying_symbol_name` → Alias: `display_name`
- New field: `pip_size` → Alias: `pip`

This allows components to continue using old names during migration.

---

## Performance Considerations

### Adapter Overhead
- Transformation functions are lightweight (object spreading)
- No network overhead - all transformations client-side
- Minimal memory impact - creates new objects (acceptable for API layer)

### Recommendation
- Use adapter as permanent layer, don't remove after migration
- Enables gradual deprecation of legacy API in future
- Acts as API version abstraction layer

---

## Rollback Plan

If issues arise:
1. **Revert individual files** to previous commit
2. **Keep adapter** - useful for debugging
3. **Add feature flag** to disable new API transformation:
   ```typescript
   const response = transformResponse(
       data, 
       msgType, 
       enableBackwardsCompat && featureFlags.useNewApi
   );
   ```

---

## Questions & Support

When encountering issues:
1. Check adapter for field transformations first
2. Verify response structure matches new API docs
3. Add logging: `console.log('Transformed request:', transformedRequest);`
4. Compare legacy vs new API responses
5. Check error handling for new error codes

---

## Related Documentation

- [Deriv New API Documentation](https://developers.deriv.com/)
- [API Comparison (Legacy vs New)](https://developers.deriv.com/comparison/)
- [WebSocket Connection Guide](https://developers.deriv.com/)
- [Current Implementation](./src/lib/deriv-api-service.ts)
- [Adapter Implementation](./src/utils/api-migration-adapter.ts)

---

**Last Updated**: 2025 (API v4 migration in progress)  
**Migration Lead**: [Your Name]  
**Status**: Core infrastructure complete, endpoint migration ongoing
