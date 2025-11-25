# Deployment Scripts

Scripts for deploying and testing the darkpool on devnet.

## bootstrap-market.ts

Initializes the config and creates a market on devnet.

**Prerequisites**:
- Program must be deployed to devnet
- Admin keypair must have SOL
- Base and quote mints must exist

**Usage**:
```bash
export DARKPOOL_PROGRAM_ID="<your-program-id>"
export DARKPOOL_ADMIN_KEYPAIR="~/.config/solana/id.json"
export BASE_MINT="<base-mint-address>"
export QUOTE_MINT="<quote-mint-address>"
ts-node scripts/bootstrap-market.ts
```

**What it does**:
1. Initializes the config PDA with admin pubkey
2. Creates a market PDA for the given base/quote mint pair
3. Initializes base and quote vault PDAs
4. Prints all addresses for reference

## Future Scripts

- `place-test-orders.ts` - Place sample orders for testing
- `verify-settlement.ts` - Verify settlement transactions
- `check-market-state.ts` - Check market and order states

