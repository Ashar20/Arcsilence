# Order Accumulation Issue - Root Cause & Fix

## Problem Summary

The Arcium MPC transaction was failing with "RangeError: offset out of range" because **18 old orders from previous test runs were accumulating on-chain**, causing the encrypted transaction to exceed Solana's 1,232-byte limit.

### Root Cause
- Orders placed during testing were never cleaned up
- Each test run added more orders to the chain
- The solver processed ALL open orders (18 total), not just the 2 new ones
- 18 orders × 7 encrypted fields = 126 encrypted values → exceeded transaction size limit

## Immediate Fix Applied

### ✅ Created Order Cleanup Script

Created [close-all-orders.ts](close-all-orders.ts) to cancel all old orders and reclaim rent:

**Key Learnings:**
1. Must use `program.account.order.all()` (not `getProgramAccounts` with memcmp)
2. `cancelOrder` instruction requires ALL accounts: order, owner, market, userBaseAccount, userQuoteAccount, baseVault, quoteVault, tokenProgram

**Result**: Successfully closed all 18 orders, verified with test showing 2 fresh orders work fine.

## Permanent Solution (To Implement)

To prevent this issue from happening again, we need two fixes:

### 1. Backend: Automatic Order Cleanup

**Add cleanup logic to solver after settlement:**

```typescript
// In services/solver-relayer/src/index.ts
async function cleanupFilledOrders(fills: ExecutionPlanFill[]) {
  console.log(`🧹 Cleaning up ${fills.length} filled orders...`);

  for (const fill of fills) {
    try {
      // Check if order is fully filled
      const order = await program.account.order.fetch(new PublicKey(fill.order));
      if (order.filledAmountIn.eq(order.amountIn)) {
        // Order fully filled, close it
        await program.methods
          .cancelOrder()
          .accounts({
            order: new PublicKey(fill.order),
            owner: order.owner,
            market: order.market,
            userBaseAccount: await getAssociatedTokenAddress(marketAccount.baseMint, order.owner),
            userQuoteAccount: await getAssociatedTokenAddress(marketAccount.quoteMint, order.owner),
            baseVault: marketAccount.baseVault,
            quoteVault: marketAccount.quoteVault,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .rpc();
        console.log(`  ✅ Closed filled order: ${fill.order}`);
      }
    } catch (error) {
      console.log(`  ⚠️  Failed to close order ${fill.order}:`, error.message);
    }
  }
}

// Call after settlement:
app.post('/match-and-settle', async (req, res) => {
  // ... existing matching logic ...

  if (plan.fills.length > 0) {
    const signature = await submitExecutionPlan(plan);

    // Clean up filled orders
    await cleanupFilledOrders(plan.fills);

    res.json({ success: true, signature, fills: plan.fills.length });
  }
});
```

**Files to Modify:**
- `services/solver-relayer/src/index.ts` - Add cleanup function
- `services/solver-relayer/src/solanaClient.ts` - Add helper to check order status

### 2. Frontend: Order Management UI

**Create a new component for users to view and cancel their orders:**

```typescript
// apps/web/src/components/OrderManagement.tsx
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Program } from '@coral-xyz/anchor';

export function OrderManagement() {
  const wallet = useWallet();
  const { connection } = useConnection();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    async function fetchUserOrders() {
      if (!wallet.publicKey) return;

      const program = getProgram(connection, wallet);
      const allOrders = await program.account.order.all();

      // Filter to show only user's orders
      const userOrders = allOrders.filter(
        o => o.account.owner.equals(wallet.publicKey)
      );

      setOrders(userOrders);
    }

    fetchUserOrders();
  }, [wallet.publicKey]);

  async function cancelOrder(orderPubkey: PublicKey) {
    // Call cancelOrder instruction
    // ... implementation ...
  }

  return (
    <div>
      <h2>My Open Orders</h2>
      {orders.map(order => (
        <div key={order.publicKey.toString()}>
          <span>{order.account.side === 'Bid' ? 'BUY' : 'SELL'}</span>
          <span>{order.account.amountIn.toString()} tokens</span>
          <button onClick={() => cancelOrder(order.publicKey)}>
            Cancel
          </button>
        </div>
      ))}
    </div>
  );
}
```

**Integration Points:**
1. Add route `/orders` to show order management page
2. Add "My Orders" link to navigation
3. Show badge with open order count
4. Add real-time updates when orders are filled/cancelled

### 3. Test Cleanup Hook

**Add automatic cleanup after tests:**

```typescript
// test-end-to-end.ts
async function cleanup() {
  console.log('🧹 Cleaning up test orders...');
  const allOrders = await program.account.order.all();
  const myOrders = allOrders.filter(o => o.account.owner.equals(wallet.publicKey));

  for (const { publicKey } of myOrders) {
    await program.methods.cancelOrder().accounts({...}).rpc();
  }
}

// At end of test:
testEndToEnd()
  .then(cleanup)
  .catch(cleanup)
  .finally(() => process.exit(0));
```

## Impact Analysis

### Before Fix
- 18 accumulated orders → Transaction size exceeded
- Real MPC failed with "offset out of range"
- Users couldn't test with real Arcium MPC

### After Immediate Fix
- All old orders closed
- Transaction size within limits (2 orders work fine)
- Can test with real MPC again

### After Permanent Fix
- Orders auto-cleanup after being filled
- Users can manually cancel unwanted orders
- Test runs automatically clean up
- Problem cannot recur

## Action Items

**Priority 1 (Backend - High Priority):**
- [ ] Implement `cleanupFilledOrders()` in solver
- [ ] Add error handling for cleanup failures
- [ ] Test with multiple settlement rounds

**Priority 2 (Frontend - Medium Priority):**
- [ ] Create `OrderManagement` component
- [ ] Add `/orders` route
- [ ] Integrate with wallet adapter
- [ ] Add loading/error states

**Priority 3 (Testing - Low Priority):**
- [ ] Add cleanup hooks to test scripts
- [ ] Create integration test for auto-cleanup
- [ ] Document testing best practices

## Files Referenced

1. [close-all-orders.ts](close-all-orders.ts) - Cleanup script (created)
2. `services/solver-relayer/src/solanaClient.ts` - Order fetching logic
3. `services/solver-relayer/src/index.ts` - Settlement endpoint
4. `test-end-to-end.ts` - E2E test script
5. `target/idl/darkpool.json` - Program IDL with cancel_order instruction

## Testing Verification

```bash
# 1. Verify no old orders remain
pnpm exec tsx close-all-orders.ts

# 2. Place fresh orders and test
pnpm exec tsx test-end-to-end.ts

# 3. Verify solver processes only new orders
curl -X POST http://localhost:8080/match-and-settle \
  -H "Content-Type: application/json" \
  -d '{"marketPubkey": "DeLq8EMHPuQkn27GuMM744HMhBvi8jkFYyZvWbq1WoKo"}'
```

## Conclusion

The order accumulation issue has been **immediately resolved** by cleaning up all 18 old orders. The **permanent fix** requires implementing automatic cleanup in the backend and adding order management UI in the frontend. These changes will prevent the issue from recurring and provide users with proper order management capabilities.
