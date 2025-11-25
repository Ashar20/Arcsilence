# ArcSilence

Private dark pool on Solana powered by Arcium's encrypted compute. Order matching happens inside MPC, only settlement occurs on-chain.

## Architecture

```
┌──────────────┐      ┌──────────────────┐      ┌──────────────┐
│   Web App    │─────▶│ Solver Relayer   │─────▶│   Solana     │
│  (Next.js)   │      │   (TypeScript)   │      │  (Anchor)    │
└──────────────┘      └────────┬─────────┘      └──────────────┘
                               │
                               ▼
                      ┌──────────────────┐
                      │  Arcium MXE      │
                      │  (Encrypted)     │
                      │  match_orders_mpc│
                      └──────────────────┘
```

## Workspaces

- **[programs/darkpool](programs/darkpool)** - Solana program (Anchor): markets, orders, vaults, settlement
- **[services/solver-relayer](services/solver-relayer)** - Off-chain solver: aggregates orders, calls Arcium, submits settlements
- **[darkpool-matcher](darkpool-matcher)** - Arcium MPC project: encrypted FIFO matching engine
- **[apps/web](apps/web)** - Next.js dApp: place private orders, trigger matching

## Flow

1. **Place Order** → User locks tokens via `place_order` instruction
2. **Aggregate** → Solver fetches open orders from Solana
3. **Match (Private)** → Solver calls Arcium MPC with encrypted orders
4. **Settle** → Solver submits execution plan via `settle_batch`
5. **Complete** → Program moves tokens, updates order statuses

## Quick Start

```bash
# Install dependencies
pnpm install

# Build Solana program
cd programs/darkpool
anchor build
anchor deploy --provider.cluster devnet

# Start solver
cd ../../services/solver-relayer
pnpm dev

# Start web app
cd ../../apps/web
pnpm dev
```

## Arcium Integration

The encrypted matching engine lives in [darkpool-matcher/](darkpool-matcher/):

```bash
cd darkpool-matcher
arcium build            # Build with Arcium SDK
arcium localnet         # Test locally
arcium deploy --cluster testnet
```

See [darkpool-matcher/README.md](darkpool-matcher/README.md) for deployment guide.

## Status

✅ Solana program complete
✅ Solver relayer complete
✅ Encrypted matcher complete (17/17 tests)
✅ Arcium project setup complete
✅ Builds with Arcium SDK
⏳ Web dApp in progress

## Documentation

- [darkpool-matcher/README.md](darkpool-matcher/README.md) - Arcium deployment guide
- [darkpool-matcher/encrypted-ixs/src/circuits.rs](darkpool-matcher/encrypted-ixs/src/circuits.rs) - Encrypted instruction source
- [services/solver-relayer/README.md](services/solver-relayer/README.md) - Solver architecture
- [STATUS.md](STATUS.md) - Detailed implementation status
