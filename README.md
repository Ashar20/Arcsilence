# ArcSilence - Private Dark Pool on Solana

Privacy-first dark pool exchange using Arcium's MPC network. Orders are encrypted and matched privately, preventing front-running and MEV.

## 🎯 Live on Devnet!

**Program ID**: `CMy5ru8L5nwnn4RK8TZJiCLs4FVkouV2PKPnuPCLFedB`
**Market**: `DeLq8EMHPuQkn27GuMM744HMhBvi8jkFYyZvWbq1WoKo`
**Status**: ✅ Fully deployed with working transactions

---

**⚡ Quick Start**: See [QUICK_REFERENCE.md](QUICK_REFERENCE.md) for commands and addresses.

**🐛 Troubleshooting**: See [ERRORS_AND_FIXES.md](ERRORS_AND_FIXES.md) for all errors we faced and how we fixed them.

**✅ Fully Deployed**: Program, config, and market are live on devnet with working transactions!

## What You Need

- Node.js 18+, pnpm
- Solana CLI tools
- Phantom or Solflare wallet with devnet SOL
- Rust and Anchor (if building programs)

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Set up environment
cd services/solver-relayer
cp .env.example .env  # Or use existing .env
# Edit .env and set your paths

cd ../apps/web
cp .env.local.example .env.local  # Or use existing .env.local

# 3. Build everything
cd ../..
pnpm build
```

## Running It

### Start Solver (Terminal 1)
```bash
cd services/solver-relayer
source .env
node dist/index.js
```

You should see: `Using Real Arcium client` and `solver-relayer listening on :8080`

### Start Web App (Terminal 2)
```bash
cd apps/web
pnpm dev
```

Open http://localhost:3000

## Common Errors & Fixes

### Error: "Missing required environment variable"
**Fix**: Make sure .env file exists and has all variables:
```bash
cd services/solver-relayer
cat .env  # Should show SOLANA_RPC_URL, DARKPOOL_PROGRAM_ID, etc.
```

### Error: "solana program show: AccountNotFound"
**Fix**: Use the correct RPC and program ID:
```bash
solana program show CMy5ru8L5nwnn4RK8TZJiCLs4FVkouV2PKPnuPCLFedB --url devnet
```

### Error: "Failed to place order"
**Fix**: You need token accounts for both tokens:
```bash
# Check your token accounts
spl-token accounts --url devnet

# Create if missing
spl-token create-account yXJUy2a1YgKDJ5CfngRN7djwX3Dtbv85f9jUFCgutdj --url devnet
spl-token create-account 4eYgX7VZj4eQ5Vf5MbmzCgAwcbhkP1rSMhR5jZmdZN5H --url devnet
```

### Error: "Market not found"
**Fix**: Market is already initialized! Make sure you have the latest `.env.local`:
```bash
NEXT_PUBLIC_MARKET_PUBKEY=DeLq8EMHPuQkn27GuMM744HMhBvi8jkFYyZvWbq1WoKo
```
Then restart: `pnpm dev`

## Testing

### Check Deployment Status
Quick check to verify all programs and tokens are deployed:
```bash
./check-deployment.sh
```

Shows:
- Darkpool program details
- Arcium MXE program details
- Token mints info
- Market account status
- Explorer links

### Run Full End-to-End Test
This script demonstrates the ENTIRE flow with real Arcium MPC:
```bash
./run-test.sh
```

What it does:
1. ✅ Initializes config (if needed)
2. ✅ Creates market (if needed)
3. ✅ Checks token accounts
4. ✅ Places BID and ASK orders
5. ✅ Triggers Arcium MPC matching (real encryption!)
6. ✅ Settles matches on-chain
7. ✅ Verifies final state

**NOTE**: Make sure solver is running first! This takes ~60 seconds.

### Manual Tests

#### Test Solver Health
```bash
curl http://localhost:8080/health
# Should return: {"ok":true}
```

#### Test Web App
```bash
curl http://localhost:3000
# Should return: HTML with "ArcSilence"
```

#### Check Your Tokens
```bash
spl-token accounts --url devnet
# Should show:
# yXJUy2a1YgKDJ5CfngRN7djwX3Dtbv85f9jUFCgutdj   1000
# 4eYgX7VZj4eQ5Vf5MbmzCgAwcbhkP1rSMhR5jZmdZN5H  10000
```

## Deployed Addresses (Devnet)

| Component | Address |
|-----------|---------|
| Darkpool Program | `CMy5ru8L5nwnn4RK8TZJiCLs4FVkouV2PKPnuPCLFedB` |
| Config Account | `9TxfdohkD5DKuLWuEfvg7vRtEB3RNd8c1YteDAxJpt8e` |
| Market PDA | `DeLq8EMHPuQkn27GuMM744HMhBvi8jkFYyZvWbq1WoKo` |
| Base Token (TOKEN1) | `yXJUy2a1YgKDJ5CfngRN7djwX3Dtbv85f9jUFCgutdj` |
| Quote Token (TOKEN2) | `4eYgX7VZj4eQ5Vf5MbmzCgAwcbhkP1rSMhR5jZmdZN5H` |
| Base Vault | `8pEfTyTPY2wx6ZRPL49Hec48HmsrPED1LGgPoNH6uk8W` |
| Quote Vault | `JAoucAfQ6bAYSsfDoKs4wTe9VYozWnnenuJeTW68kLdh` |
| Arcium MXE | `GXMjSxNzrAee7KNdiWfGaUXh783bXyB87aW6TYvmQ3r1` |

**Status**: ✅ All deployed and working on devnet!

## How It Works

1. **User places order** → Stored on-chain with encrypted details
2. **Operator clicks "Run Match"** → Solver fetches orders
3. **Solver encrypts orders** → x25519 + RescueCipher encryption
4. **Submit to Arcium MPC** → Computation runs in secure enclave
5. **MPC returns matches** → Solver decrypts results
6. **Settlement on-chain** → Darkpool program transfers tokens

**No mocks, no simulation** - Real Arcium MPC integration.

## Project Structure

```
├── programs/darkpool/          # Solana program (Anchor)
├── services/solver-relayer/    # Node.js solver with Arcium MPC
├── apps/web/                   # Next.js dApp
└── endgoal.md                  # Bounty requirements
```

## Key Files

**Solver Config**: `services/solver-relayer/.env`
```bash
ARCIUM_USE_REAL=true  # ← Real MPC, not mock!
ARCIUM_PROGRAM_ID=GXMjSxNzrAee7KNdiWfGaUXh783bXyB87aW6TYvmQ3r1
```

**Web Config**: `apps/web/.env.local`
```bash
NEXT_PUBLIC_DARKPOOL_PROGRAM_ID=CMy5ru8L5nwnn4RK8TZJiCLs4FVkouV2PKPnuPCLFedB
NEXT_PUBLIC_MARKET_PUBKEY=DeLq8EMHPuQkn27GuMM744HMhBvi8jkFYyZvWbq1WoKo
NEXT_PUBLIC_SOLVER_URL=http://localhost:8080
```

**Arcium Integration**: `services/solver-relayer/src/arciumClient.ts`
- Lines 106-109: x25519 encryption
- Lines 166-168: RescueCipher encrypt
- Lines 210-227: MPC submission
- Lines 233-238: Await finalization
- Line 251: **NO FALLBACK** (throws on error)

## Bounty Submission

✅ **Functional Solana project** - Program deployed and working on devnet
✅ **Front end integrated with Arcium** - Next.js dApp + Real MPC (no mocks)
✅ **Live on-chain transactions** - Config initialized, market created, orders working
✅ **GitHub repo** - This repository with full documentation
✅ **English submission** - All documentation in English

**Status**: ✅ COMPLETE and ready to submit! See `endgoal.md` for bounty details.

### What Works:
- ✅ Place orders on testnet (no errors)
- ✅ Real Arcium MPC order matching
- ✅ On-chain settlement
- ✅ Full dark pool flow end-to-end

## License

MIT
