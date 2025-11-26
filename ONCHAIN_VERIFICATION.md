# On-Chain Verification Guide

This guide shows you how to verify all deployed components on Solana Devnet.

## Quick Links

### Solana Explorers
- **Solscan Devnet**: https://solscan.io/?cluster=devnet
- **Solana Explorer**: https://explorer.solana.com/?cluster=devnet
- **SolanaFM**: https://solana.fm/?cluster=devnet-solana

### Your Deployed Programs

#### 1. Darkpool Program
- **Program ID**: `8HRmULeUKortoBGMFYYSimQQPEG7vAvTAwPX9BEijNA1`
- **Solscan**: https://solscan.io/account/8HRmULeUKortoBGMFYYSimQQPEG7vAvTAwPX9BEijNA1?cluster=devnet
- **Explorer**: https://explorer.solana.com/address/8HRmULeUKortoBGMFYYSimQQPEG7vAvTAwPX9BEijNA1?cluster=devnet

#### 2. Arcium MXE Program
- **Program ID**: `GXMjSxNzrAee7KNdiWfGaUXh783bXyB87aW6TYvmQ3r1`
- **Solscan**: https://solscan.io/account/GXMjSxNzrAee7KNdiWfGaUXh783bXyB87aW6TYvmQ3r1?cluster=devnet
- **Explorer**: https://explorer.solana.com/address/GXMjSxNzrAee7KNdiWfGaUXh783bXyB87aW6TYvmQ3r1?cluster=devnet

#### 3. Your Wallet
- **Address**: `13jxZUSV57mUwuAWbFrt4q1a8TA39ARsXxeonvyDKQQE`
- **Solscan**: https://solscan.io/account/13jxZUSV57mUwuAWbFrt4q1a8TA39ARsXxeonvyDKQQE?cluster=devnet
- **Explorer**: https://explorer.solana.com/address/13jxZUSV57mUwuAWbFrt4q1a8TA39ARsXxeonvyDKQQE?cluster=devnet

## Command Line Verification

### 1. Check Darkpool Program Deployment

```bash
# Basic info
solana program show 8HRmULeUKortoBGMFYYSimQQPEG7vAvTAwPX9BEijNA1 --url devnet

# Expected output:
# Program Id: 8HRmULeUKortoBGMFYYSimQQPEG7vAvTAwPX9BEijNA1
# Owner: BPFLoaderUpgradeab1e11111111111111111111111
# ProgramData Address: CUKPHgazdvMtubMPBWZfFxd6Zvcx9cG9gWv4p1WE7UZs
# Authority: 13jxZUSV57mUwuAWbFrt4q1a8TA39ARsXxeonvyDKQQE
# Data Length: 370736 bytes
```

### 2. Check Arcium MXE Program

```bash
# Basic info
solana program show GXMjSxNzrAee7KNdiWfGaUXh783bXyB87aW6TYvmQ3r1 --url devnet

# Expected output:
# Program Id: GXMjSxNzrAee7KNdiWfGaUXh783bXyB87aW6TYvmQ3r1
# Owner: BPFLoaderUpgradeab1e11111111111111111111111
# Data Length: 180672 bytes
```

### 3. Check Your Wallet Balance

```bash
# Get your address
solana address

# Get balance on devnet
solana balance --url devnet

# View transaction history on Solscan
open "https://solscan.io/account/13jxZUSV57mUwuAWbFrt4q1a8TA39ARsXxeonvyDKQQE?cluster=devnet"
```

### 4. Check Recent Transactions

```bash
# View recent transactions for your wallet
solana transaction-history 13jxZUSV57mUwuAWbFrt4q1a8TA39ARsXxeonvyDKQQE --url devnet --limit 10
```

### 5. Verify IDL Deployment

```bash
# Check if IDL account exists (Anchor creates this)
anchor idl fetch 8HRmULeUKortoBGMFYYSimQQPEG7vAvTAwPX9BEijNA1 --provider.cluster devnet

# Or check the IDL account directly
# IDL Account: FEouxFhfbjZbduaEvevrm4x4DYHVJV4qUUE5cixo63JN
solana account FEouxFhfbjZbduaEvevrm4x4DYHVJV4qUUE5cixo63JN --url devnet
```

## Using Anchor CLI

### Fetch and View IDL

```bash
# Fetch IDL from chain
anchor idl fetch 8HRmULeUKortoBGMFYYSimQQPEG7vAvTAwPX9BEijNA1 \
  --provider.cluster devnet \
  -o /tmp/darkpool-onchain.json

# View it
cat /tmp/darkpool-onchain.json | jq '.instructions[] | .name'
```

### Test Program Instructions

```bash
# Initialize config (if not already done)
anchor run initialize --provider.cluster devnet

# Create a test market
# You'll need to create token mints first
```

## Checking Program Accounts

### Find All Program-Owned Accounts

```bash
# This requires the Solana CLI with getProgramAccounts
solana account 8HRmULeUKortoBGMFYYSimQQPEG7vAvTAwPX9BEijNA1 --url devnet --output json
```

### Using TypeScript/JavaScript

```typescript
import { Connection, PublicKey } from '@solana/web3.js';
import { AnchorProvider, Program } from '@coral-xyz/anchor';

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const programId = new PublicKey('8HRmULeUKortoBGMFYYSimQQPEG7vAvTAwPX9BEijNA1');

// Fetch all program accounts
const accounts = await connection.getProgramAccounts(programId);
console.log(`Found ${accounts.length} accounts`);

// With Anchor program
const program = new Program(idl, provider);
const orders = await program.account.order.all();
const markets = await program.account.market.all();
console.log(`Orders: ${orders.length}, Markets: ${markets.length}`);
```

## Monitoring in Real-Time

### Watch for New Transactions

```bash
# Watch logs for your program
solana logs 8HRmULeUKortoBGMFYYSimQQPEG7vAvTAwPX9BEijNA1 --url devnet
```

### Using Solana Explorer

1. Go to https://explorer.solana.com/?cluster=devnet
2. Search for your program ID: `8HRmULeUKortoBGMFYYSimQQPEG7vAvTAwPX9BEijNA1`
3. Click on "Anchor Program IDL" tab to view the program interface
4. Check "Transactions" tab to see all interactions

## Arcium-Specific Verification

### Check Arcium Cluster

```bash
# The cluster offset is 768109697
# Cluster account can be derived using Arcium SDK

# Check computation definition
# Comp Def ID: 1
```

### Using Arcium CLI

```bash
# Get MXE info
arcium mxe-info \
  --program-id GXMjSxNzrAee7KNdiWfGaUXh783bXyB87aW6TYvmQ3r1 \
  --rpc-url devnet

# Check cluster info
arcium cluster-info \
  --cluster-offset 768109697 \
  --rpc-url devnet
```

## Troubleshooting

### Program Not Found
If you get "Account does not exist" errors:
- Verify you're on devnet: `solana config get`
- Check the program ID is correct
- Ensure sufficient SOL for rent: `solana balance --url devnet`

### IDL Not Found
If IDL fetch fails:
- The program may have been deployed with `--no-idl`
- Check if IDL account exists separately
- Use the local IDL at `target/idl/darkpool.json`

### No Accounts Found
If no program accounts exist:
- The program hasn't been initialized yet
- Run the initialize instruction first
- Create test markets and orders

## Next Steps

1. **Initialize the program** (if not done):
   ```bash
   # Using Anchor
   anchor run initialize --provider.cluster devnet
   ```

2. **Create test markets**:
   - Use the web dApp or
   - Write a script using the Anchor program

3. **Monitor activity**:
   - Watch Solscan for transactions
   - Run solver to match orders
   - Check Arcium computations

## Deployment Summary

| Component | Status | Program ID |
|-----------|--------|------------|
| Darkpool Program | ✅ Deployed | `8HRmULeUKortoBGMFYYSimQQPEG7vAvTAwPX9BEijNA1` |
| Arcium MXE | ✅ Deployed | `GXMjSxNzrAee7KNdiWfGaUXh783bXyB87aW6TYvmQ3r1` |
| IDL | ✅ Generated | FEouxFhfbjZbduaEvevrm4x4DYHVJV4qUUE5cixo63JN |
| Cluster Offset | ✅ Configured | 768109697 |
| Comp Def ID | ✅ Initialized | 1 |

---

**Network**: Solana Devnet
**RPC**: https://devnet.helius-rpc.com
**Wallet**: 13jxZUSV57mUwuAWbFrt4q1a8TA39ARsXxeonvyDKQQE
