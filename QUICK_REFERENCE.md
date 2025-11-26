# ArcSilence Quick Reference

## Start Everything

```bash
# Terminal 1 - Solver
cd services/solver-relayer
source .env
node dist/index.js

# Terminal 2 - Web App
cd apps/web
pnpm dev
```

## Test Scripts

```bash
# Check deployment
./check-deployment.sh

# Run full flow test (creates market, places orders, runs MPC)
./run-test.sh
```

## Key Addresses (Devnet)

```
Darkpool:  CMrfhDiq5gLBwbT3nxQvGH1UTcxtaAY9r4we2PvjbjAg
Arcium:    GXMjSxNzrAee7KNdiWfGaUXh783bXyB87aW6TYvmQ3r1
TOKEN1:    yXJUy2a1YgKDJ5CfngRN7djwX3Dtbv85f9jUFCgutdj
TOKEN2:    4eYgX7VZj4eQ5Vf5MbmzCgAwcbhkP1rSMhR5jZmdZN5H
Market:    2Av4Zp7zSQ4ZbQD9YdpULftfcAL69NXbYVR5PAKbbkDD
```

## Architecture

```
User → Web dApp → Darkpool Program (on-chain orders)
                       ↓
Operator → Solver → Arcium MPC (private matching)
                       ↓
                   Settlement (on-chain)
```

## Real Arcium MPC Integration

**Location**: `services/solver-relayer/src/arciumClient.ts`

- Line 106-109: x25519 key exchange
- Line 166-168: RescueCipher encryption
- Line 210-227: MPC submission
- Line 233-238: Await finalization
- Line 251: **NO FALLBACK** (throws on error)

## Quick Checks

```bash
# Solver health
curl http://localhost:8080/health

# Web app
curl http://localhost:3000

# Your tokens
spl-token accounts --url devnet

# View on-chain
solana program show CMrfhDiq5gLBwbT3nxQvGH1UTcxtaAY9r4we2PvjbjAg --url devnet
```

## Common Issues

**"Missing required environment variable"**
→ Check `.env` files exist in `services/solver-relayer` and `apps/web/.env.local`

**"AccountNotFound"**
→ Try with Helius RPC (already configured in .env)

**"Failed to place order"**
→ Need token accounts for both tokens:
```bash
spl-token create-account yXJUy2a1YgKDJ5CfngRN7djwX3Dtbv85f9jUFCgutdj --url devnet
spl-token create-account 4eYgX7VZj4eQ5Vf5MbmzCgAwcbhkP1rSMhR5jZmdZN5H --url devnet
```

**"Market not found"**
→ Run `./run-test.sh` to create it, or use the create-market script

## File Structure

```
├── programs/darkpool/              # Solana program
│   └── src/lib.rs                  # Order placement, settlement
├── services/solver-relayer/        # Arcium MPC solver
│   ├── src/arciumClient.ts         # Real MPC integration
│   └── src/index.ts                # HTTP API
├── apps/web/                       # Next.js dApp
│   ├── src/components/darkpool/    # UI components
│   └── src/lib/darkpoolClient.ts   # Anchor integration
├── test-full-flow.ts               # End-to-end test
└── run-test.sh                     # Test runner
```

## Bounty Checklist

✅ Functional Solana project (deployed)
✅ Front end integrated with Arcium (Real MPC, no mocks)
✅ GitHub repo (public)
✅ English documentation
✅ Dark pool matching with privacy
✅ On-chain settlement
✅ Arcium MPC proof verification
