# Arcsilence

**Private Dark Pool Execution for Solana DeFi**

Arcsilence enables private order matching using Arcium encrypted compute, built for DAOs, funds, and protocols needing MEV-safe, alpha-preserving execution.

**Program ID**: `CMy5ru8L5nwnn4RK8TZJiCLs4FVkouV2PKPnuPCLFedB`

**Market**: `DeLq8EMHPuQkn27GuMM744HMhBvi8jkFYyZvWbq1WoKo`

## Problem

Public DeFi leaks alpha and invites MEV:
- Large swaps and treasury rebalances are fully visible on-chain
- MEV bots front-run, back-run, and sandwich high-value orders
- Competitors infer rebalance and hedging strategies from on-chain behavior
- Result: worse prices, higher slippage, and long-term strategy decay

## Solution

Arcsilence provides an encrypted dark pool and rebalancer:
- Users submit swap/rebalance intents → processed in encrypted compute
- Orders fetched from Solana, encrypted, matched via Arcium MPC, then settled on-chain
- Only final fills and transfers visible; order book and strategy logic stay private

**Key Benefits:**
- Lower MEV and slippage
- Protected strategy/alpha (no visible pre-trade intent)
- Composable with existing Solana DEXs and aggregators

## Architecture

### On-Chain (Solana + Anchor, Rust)
- **Darkpool Program**: Order PDAs, base/quote token vaults, batch settlement
- **Darkpool-MXE Program**: Arcium MPC integration for encrypted order matching

### Off-Chain (TypeScript/Node.js)
- **Solver-Relayer Service**: Fetches orders, encrypts data, submits to MPC, triggers settlement
- **Arcium MPC Integration**: Real MXE flow with encrypted orders → MPC matching → attested results

### Frontend
- React-based trading interface with end-to-end test flow visualization

## Tech Stack

- **Blockchain**: Solana devnet, Anchor Framework, SPL Token
- **Privacy/MPC**: Arcium MPC Network, x25519 key exchange, RescueCipher encryption
- **Application**: TypeScript/Node.js, Express.js API
- **Libraries**: @coral-xyz/anchor, @solana/web3.js, @arcium-hq/client, @solana/spl-token

## Security & Privacy Guarantees

- Orders encrypted before MPC submission using x25519 + RescueCipher
- Matching algorithm executed inside Arcium's MPC network
- MPC attestation + on-chain settlement = no single point of trust
- Tokens held in program-controlled vaults; fills and state changes auditable on Solana

## Installation

### Prerequisites

- Node.js 18+ and pnpm
- Rust 1.70+ and Solana CLI
- Anchor Framework
- Arcium SDK and credentials

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Ashar20/Arcsilence.git
   cd Arcsilence
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Build Solana programs**
   ```bash
   anchor build
   ```

4. **Configure environment**
   ```bash
   cd services/solver-relayer
   cp .env.example .env
   # Edit .env with your Solana keypair path and Arcium credentials
   ```

5. **Deploy programs to devnet**
   ```bash
   anchor deploy --provider.cluster devnet
   ```

6. **Start the solver-relayer service**
   ```bash
   cd services/solver-relayer
   source .env
   pnpm build
   node dist/index.js
   ```

7. **Run end-to-end test**
   ```bash
   pnpm exec tsx test-end-to-end.ts
   ```

8. **Start frontend (optional)**
   ```bash
   cd frontend
   pnpm install
   pnpm dev
   ```

## Usage

### End-to-End Test Flow

The test script demonstrates the complete dark pool flow:

1. **Setup**: Initialize token accounts and check balances
2. **Solver Check**: Verify solver service is running
3. **Place BID Order**: Buy TOKEN1 with TOKEN2
4. **Place ASK Order**: Sell TOKEN1 for TOKEN2
5. **MPC Matching**: Trigger encrypted order matching via Arcium
6. **Settlement**: Verify balances and vault state after matching

### API Endpoints

The solver-relayer exposes:

- `POST /match-and-settle` - Trigger MPC matching and settlement
- `GET /health` - Health check endpoint

## Project Structure

```
Arcsilence/
├── programs/
│   ├── darkpool/          # Main dark pool program
│   └── darkpool-mxe/      # Arcium MPC integration program
├── services/
│   └── solver-relayer/    # Off-chain solver and relayer service
├── frontend/              # React trading interface
└── test-end-to-end.ts     # End-to-end integration test
```

## Who It Serves

- **DAO Treasuries**: Large rebalances without signaling intent
- **POL Managers**: Protocol-owned liquidity management
- **Funds & Market Makers**: Strategy execution without alpha leakage

## Track Fit

- **Directly targets**: "Private DeFi & Trading"
- **Demonstrates**: Full pipeline from on-chain orders → Arcium encrypted compute → on-chain settlement
- **Privacy**: Keeps orders, positions, and strategies confidential while remaining verifiable
