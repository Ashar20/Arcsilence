# ArcSilence Troubleshooting Guide

This document outlines all the major errors we encountered during development and their solutions.

## Table of Contents
- [Anchor CLI Version Issues](#anchor-cli-version-issues)
- [Build Process Problems](#build-process-problems)
- [Program Deployment Errors](#program-deployment-errors)
- [Instruction Execution Errors](#instruction-execution-errors)
- [Frontend/UI Issues](#frontendui-issues)
- [Token Account Problems](#token-account-problems)
- [Arcium Integration Issues](#arcium-integration-issues)
- [Environment Configuration](#environment-configuration)
- [Server Startup Problems](#server-startup-problems)

---

## Anchor CLI Version Issues

### 1. Version Mismatch Warning
**Error:**
```
WARNING: `@coral-xyz/anchor` version(^0.30.1) and the current CLI version(0.32.1) don't match.
This can lead to unwanted behavior. To fix, upgrade the package by running:
yarn upgrade @coral-xyz/anchor@0.32.1
```

**Root Cause:**
- TypeScript client libraries were using Anchor v0.30.1
- Anchor CLI was v0.32.1
- Version mismatch causing compatibility issues

**Solution:**
```bash
# Update package versions
cd apps/web && pnpm upgrade @coral-xyz/anchor@0.32.1
cd ../services/solver-relayer && pnpm upgrade @coral-xyz/anchor@0.32.1

# Update all Anchor versions consistently
# Anchor.toml: anchor_version = "0.32.1"
# Cargo.toml workspace: anchor-lang = "0.32.1", anchor-spl = "0.32.1"
```

---

## Build Process Problems

### 2. Overflow-Checks Validation Error
**Error:**
```
Error: `overflow-checks` is not enabled. To enable, add:

[profile.release]
overflow-checks = true
```

**Root Cause:**
- Anchor CLI v0.30+ requires explicit overflow-checks configuration
- Build validation fails before compilation starts

**Solution:**
Added `[profile.release]` section to:
- Root `Cargo.toml`
- `programs/darkpool/Cargo.toml`
- `darkpool-matcher/Cargo.toml`

```toml
[profile.release]
overflow-checks = true
```

### 3. Anchor Build Hanging/Failing
**Error:**
- `anchor build` exits with code 0 but produces no artifacts
- No IDL generation, no binary in target/deploy/
- Build appears successful but nothing is built

**Root Cause:**
- Overflow-checks validation silently failing
- Anchor build exits early when validation fails

**Solution:**
```bash
# Manual build process
cargo build --release
cp programs/darkpool/target/sbpf-solana-solana/release/darkpool.so target/deploy/darkpool.so
cp programs/darkpool/target/idl/darkpool.json target/idl/darkpool.json
```

### 4. Build Process Workaround
**Error:**
- Standard `anchor build` command not working
- Had to implement manual build steps

**Solution:**
Manual build script:
```bash
# Build with cargo directly
cd programs/darkpool
cargo build --release

# Copy artifacts manually
cp target/sbpf-solana-solana/release/darkpool.so ../target/deploy/darkpool.so
cp target/idl/darkpool.json ../target/idl/darkpool.json
```

---

## Program Deployment Errors

### 5. DeclaredProgramIdMismatch Error
**Error:**
```
AnchorError: DeclaredProgramIdMismatch. Error Number: 4100.
Error Message: The declared program id does not match the actual program id.
```

**Root Cause:**
- Binary deployed with old program ID still embedded
- Anchor build not regenerating binary with new program ID
- Cache issues preventing clean rebuild

**Solution:**
```bash
# Clean all build artifacts
rm -rf target/ programs/*/target/

# Update declare_id! in lib.rs
declare_id!("CMrfhDiq5gLBwbT3nxQvGH1UTcxtaAY9r4we2PvjbjAg");

# Rebuild and redeploy
cargo build --release
solana program deploy target/deploy/darkpool.so --program-id CMrfhDiq5gLBwbT3nxQvGH1UTcxtaAY9r4we2PvjbjAg
```

### 6. Insufficient Funds for Deployment
**Error:**
```
Account 13jxZUSV57mUwuAWbFrt4q1a8TA39ARsXvDKQQE has insufficient funds for spend
```

**Solution:**
Fund the deployment keypair:
```bash
solana balance <DEPLOYMENT_KEYPAIR_ADDRESS> --url devnet
# Fund with ~2.58 SOL + fees via devnet faucet or transfer
```

---

## Instruction Execution Errors

### 7. InstructionFallbackNotFound Error
**Error:**
```
AnchorError: InstructionFallbackNotFound. Error Number: 101.
Error Message: Fallback functions are not supported.
```

**Root Cause:**
- Anchor's TypeScript client method builder failing
- IDL mismatch between client and on-chain program
- Account parameter naming issues (camelCase vs snake_case)

**Solution:**
Switched to manual instruction encoding:
```typescript
// Instead of program.methods.placeOrder().rpc()
const instruction = program.coder.instruction.encode('place_order', {
  amount: args.amount,
  price: args.price,
  // ... other args
});

// Create transaction with explicit accounts
const transaction = new anchor.web3.TransactionInstruction({
  keys: accountMetas,
  programId: program.programId,
  data: instruction,
});
```

### 8. Account Not Provided Errors
**Error:**
```
Account `userBaseAccount` not provided.
Account `userQuoteAccount` not provided.
```

**Root Cause:**
- Missing required token account PDAs in instruction
- User token accounts not ensured to exist
- Vault PDAs not derived correctly

**Solution:**
```typescript
// Ensure token accounts exist
const userBaseAccount = await getOrCreateAssociatedTokenAccount(
  connection,
  wallet,
  baseTokenMint,
  wallet.publicKey
);

const userQuoteAccount = await getOrCreateAssociatedTokenAccount(
  connection,
  wallet,
  quoteTokenMint,
  wallet.publicKey
);

// Derive vault PDAs
const [baseVault] = anchor.web3.PublicKey.findProgramAddressSync(
  [Buffer.from("vault"), baseTokenMint.toBuffer()],
  program.programId
);

const [quoteVault] = anchor.web3.PublicKey.findProgramAddressSync(
  [Buffer.from("vault"), quoteTokenMint.toBuffer()],
  program.programId
);
```

---

## Frontend/UI Issues

### 9. React Hydration Error
**Error:**
```
Error: Hydration failed because the initial UI does not match what was rendered on the server.
Expected server HTML to contain a matching <i> in <button>.
```

**Root Cause:**
- WalletMultiButton rendering differently on server vs client
- Server-side rendering without wallet context

**Solution:**
```tsx
// WalletButton.tsx - Dynamic import with SSR disabled
import dynamic from 'next/dynamic';

const WalletMultiButton = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then(mod => mod.WalletMultiButton),
  { ssr: false }
);
```

### 10. Input Formatting Issues
**Error:**
- Number inputs showing scientific notation (2e-9)
- Text not visible (black text on dark background)
- Poor decimal input handling

**Solution:**
```tsx
// Changed from type="number" to type="text"
<input
  type="text"
  inputMode="decimal"
  style={{ color: '#1f2937', fontFamily: 'inherit' }}
  onKeyDown={(e) => {
    // Allow numbers, decimal point, navigation keys
    if (!/[0-9.]/.test(e.key) &&
        !['Backspace', 'Delete', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
    }
  }}
  onChange={(e) => {
    const value = e.target.value;
    // Prevent multiple decimal points
    if (value.split('.').length > 2) return;
    setAmount(value);
  }}
/>
```

---

## Token Account Problems

### 11. Missing Token Accounts
**Error:**
- "Account does not exist" when placing orders
- User needs token accounts for trading

**Solution:**
```bash
# Create token accounts for user
spl-token create-account <TOKEN_MINT> --url devnet

# Or in code - auto-create via getOrCreateAssociatedTokenAccount
const tokenAccount = await getOrCreateAssociatedTokenAccount(
  connection,
  wallet,
  tokenMint,
  wallet.publicKey
);
```

### 12. Associated Token Account Issues
**Error:**
- ATA creation failing
- Wrong owner or mint addresses

**Solution:**
```typescript
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from '@solana/spl-token';

// Check if ATA exists
const ata = await getAssociatedTokenAddress(tokenMint, owner);

// Create if needed
const createAtaIx = createAssociatedTokenAccountInstruction(
  payer.publicKey,    // payer
  ata,                // ata
  owner,              // owner
  tokenMint           // mint
);
```

---

## Arcium Integration Issues

### 13. Arcium Cluster Offset Mismatch
**Error:**
- Devnet cluster offset different from testnet
- Wrong cluster configuration for Arcium

**Solution:**
```env
# For devnet
ARCIUM_CLUSTER_OFFSET=768109697

# For testnet (different offset needed)
ARCIUM_CLUSTER_OFFSET=<TESTNET_OFFSET>
```

### 14. Arcium RPC URL Configuration
**Error:**
- Arcium client using wrong RPC endpoint
- Network mismatches

**Solution:**
```env
# Arcium configuration
ARCIUM_NETWORK=testnet
ARCIUM_RPC_URL=https://api.testnet.solana.com
ARCIUM_API_KEY=your_api_key
```

---

## Environment Configuration

### 15. Missing Environment Variables
**Error:**
```
Error: Missing required environment variable: SOLANA_RPC_URL
```

**Solution:**
Required `.env` files:
```bash
# services/solver-relayer/.env
SOLANA_RPC_URL=https://devnet.helius-rpc.com/?api-key=YOUR_KEY
DARKPOOL_PROGRAM_ID=CMrfhDiq5gLBwbT3nxQvGH1UTcxtaAY9r4we2PvjbjAg
DARKPOOL_ADMIN_KEYPAIR=~/.config/solana/id.json
ARCIUM_USE_REAL=true
ARCIUM_NETWORK=testnet
ARCIUM_CLUSTER_OFFSET=768109697

# apps/web/.env.local
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_SOLANA_RPC_URL=https://devnet.helius-rpc.com/?api-key=YOUR_KEY
NEXT_PUBLIC_DARKPOOL_PROGRAM_ID=CMrfhDiq5gLBwbT3nxQvGH1UTcxtaAY9r4we2PvjbjAg
NEXT_PUBLIC_SOLVER_URL=http://localhost:8080
```

---

## Server Startup Problems

### 16. Port Already in Use
**Error:**
```
Error: listen EADDRINUSE: address already in use :::8080
```

**Solution:**
```bash
# Find and kill process using port
lsof -i :8080
kill -9 <PID>

# Or change port
PORT=8081 node dist/index.js
```

### 17. ES Module Import Error
**Error:**
```
Must use import to load ES Module: src/index.ts
```

**Solution:**
```bash
# Build TypeScript first
pnpm build

# Then run compiled JS
node dist/index.js
```

---

## Quick Fix Reference

### Build Issues:
```bash
# Clean and rebuild
rm -rf target/ programs/*/target/
cargo build --release
cp programs/darkpool/target/sbpf-solana-solana/release/darkpool.so target/deploy/darkpool.so
```

### Deployment:
```bash
# Check balance and deploy
solana balance <DEPLOY_ADDR> --url devnet
solana program deploy target/deploy/darkpool.so --program-id CMrfhDiq5gLBwbT3nxQvGH1UTcxtaAY9r4we2PvjbjAg --url devnet
```

### Environment:
```bash
# Copy example env files
cp services/solver-relayer/.env.example services/solver-relayer/.env
cp apps/web/.env.local.example apps/web/.env.local
```

### Testing:
```bash
# Health checks
curl http://localhost:8080/health
curl http://localhost:3000

# Token setup
spl-token accounts --url devnet
```

---

This guide covers all major issues encountered. Most problems stemmed from version mismatches, missing configuration, and manual workarounds needed due to Anchor CLI issues.

