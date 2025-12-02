# Environment Configuration

Complete environment configuration for the ArcSilence darkpool project.

---

## services/solver-relayer/.env

```bash
# Solana Configuration
SOLANA_RPC_URL=https://api.devnet.solana.com
DARKPOOL_PROGRAM_ID=CMy5ru8L5nwnn4RK8TZJiCLs4FVkouV2PKPnuPCLFedB
DARKPOOL_ADMIN_KEYPAIR=/Users/silas/.config/solana/id.json

# Arcium MPC Configuration
ARCIUM_USE_REAL=true
ARCIUM_PROGRAM_ID=GXMjSxNzrAee7KNdiWfGaUXh783bXyB87aW6TYvmQ3r1
ARCIUM_CLUSTER_OFFSET=768109697
ARCIUM_COMP_DEF_ID=1
ARCIUM_RPC_URL=https://api.devnet.solana.com
ARCIUM_WALLET_PATH=/Users/silas/.config/solana/id.json
```

---

## apps/web/.env.local

```bash
# Solana Network Configuration
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com

# Darkpool Program Configuration
NEXT_PUBLIC_DARKPOOL_PROGRAM_ID=CMy5ru8L5nwnn4RK8TZJiCLs4FVkouV2PKPnuPCLFedB

# Market Configuration
NEXT_PUBLIC_MARKET_PUBKEY=DeLq8EMHPuQkn27GuMM744HMhBvi8jkFYyZvWbq1WoKo
NEXT_PUBLIC_BASE_TOKEN_MINT=yXJUy2a1YgKDJ5CfngRN7djwX3Dtbv85f9jUFCgutdj
NEXT_PUBLIC_QUOTE_TOKEN_MINT=4eYgX7VZj4eQ5Vf5MbmzCgAwcbhkP1rSMhR5jZmdZN5H
NEXT_PUBLIC_BASE_SYMBOL=TOKEN1
NEXT_PUBLIC_QUOTE_SYMBOL=TOKEN2

# Solver Relayer Configuration
NEXT_PUBLIC_SOLVER_URL=http://localhost:8080
```

---

## Deployed Addresses Reference

### Main Components
- **Darkpool Program**: `CMy5ru8L5nwnn4RK8TZJiCLs4FVkouV2PKPnuPCLFedB`
- **Config Account**: `9TxfdohkD5DKuLWuEfvg7vRtEB3RNd8c1YteDAxJpt8e`
- **Market PDA**: `DeLq8EMHPuQkn27GuMM744HMhBvi8jkFYyZvWbq1WoKo`

### Token Vaults
- **Base Vault**: `8pEfTyTPY2wx6ZRPL49Hec48HmsrPED1LGgPoNH6uk8W`
- **Quote Vault**: `JAoucAfQ6bAYSsfDoKs4wTe9VYozWnnenuJeTW68kLdh`

### Tokens
- **Base Token (TOKEN1)**: `yXJUy2a1YgKDJ5CfngRN7djwX3Dtbv85f9jUFCgutdj`
- **Quote Token (TOKEN2)**: `4eYgX7VZj4eQ5Vf5MbmzCgAwcbhkP1rSMhR5jZmdZN5H`

### Arcium
- **Arcium MXE Program**: `GXMjSxNzrAee7KNdiWfGaUXh783bXyB87aW6TYvmQ3r1`
- **Cluster Offset**: `768109697`
- **Computation Definition ID**: `1`

---

## Configuration Notes

### RPC URLs
- **Network**: Solana Devnet
- **RPC Endpoint**: `https://api.devnet.solana.com`
- Both solver and web app use the same RPC for consistency

### Arcium MPC
- **Mode**: Real MPC (`ARCIUM_USE_REAL=true`)
- **No Mocks**: System throws errors if MPC fails (no fallback simulation)
- **Encryption**: x25519 key exchange + RescueCipher symmetric encryption

### Wallet Configuration
- **Admin Wallet**: `~/.config/solana/id.json` (default Solana CLI wallet)
- **Wallet Address**: `13jxZUSV57mUwuAWbFrt4q1a8TA39ARsXxeonvyDKQQE`
- Same wallet used for both program authority and Arcium MPC operations

### Market Configuration
- **Market Type**: TOKEN1/TOKEN2 pair
- **Market PDA**: Derived from base mint + quote mint
- **Vaults**: Separate PDAs for base and quote token storage

---

## Setup Instructions

### 1. Solver Setup
```bash
cd services/solver-relayer
cp .env.example .env  # If starting fresh
# Or ensure .env matches configuration above
pnpm install
pnpm build
```

### 2. Web App Setup
```bash
cd apps/web
cp .env.local.example .env.local  # If starting fresh
# Or ensure .env.local matches configuration above
pnpm install
```

### 3. Start Services

**Terminal 1 - Solver:**
```bash
cd services/solver-relayer
source .env
node dist/index.js
```

**Terminal 2 - Web App:**
```bash
cd apps/web
pnpm dev
```

---

## Verification Commands

### Check Program Deployment
```bash
solana program show CMy5ru8L5nwnn4RK8TZJiCLs4FVkouV2PKPnuPCLFedB --url devnet
```

### Check Market Account
```bash
solana account DeLq8EMHPuQkn27GuMM744HMhBvi8jkFYyZvWbq1WoKo --url devnet
```

### Check Config Account
```bash
solana account 9TxfdohkD5DKuLWuEfvg7vRtEB3RNd8c1YteDAxJpt8e --url devnet
```

### Check Token Accounts
```bash
spl-token accounts --url devnet
```

### Check Wallet Balance
```bash
solana balance --url devnet
```

---

## Troubleshooting

### If solver fails to start:
1. Check `.env` file exists in `services/solver-relayer/`
2. Verify all required variables are set
3. Check wallet file exists at specified path
4. Ensure wallet has devnet SOL

### If web app can't connect:
1. Verify `.env.local` exists in `apps/web/`
2. Check all `NEXT_PUBLIC_*` variables are set
3. Ensure solver is running on port 8080
4. Check RPC URL is accessible

### If transactions fail:
1. Verify program ID matches deployed program
2. Check market address is correct
3. Ensure user has token accounts for both tokens
4. Confirm wallet has sufficient SOL for transaction fees

---

## Status

 **All configurations are current and working**
 **Program deployed on devnet**
 **Config and market initialized**
 **Real Arcium MPC enabled**
 **Ready for production use**

Last updated: December 3, 2025
