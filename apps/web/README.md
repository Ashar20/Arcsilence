# ArcSilence Dark Pool dApp

A privacy-first dark pool exchange on Solana powered by Arcium's Multi-Party Computation (MPC) network.

## Features

✅ **Fully Functional Arcium MPC Integration** - No simulation, no mocking
- Orders are encrypted using x25519 + RescueCipher
- Matching runs inside Arcium's encrypted MPC environment
- Zero order information leaked during matching
- Settlement verified and recorded on Solana

## Architecture

### Trader Flow
1. Connect Solana wallet (Phantom, Solflare, etc.)
2. View active market (BASE/QUOTE pair)
3. Place BID or ASK orders
4. Orders are encrypted client-side before submission
5. View and manage your orders (cancel if still OPEN)

### Operator Flow (Admin Panel)
1. Navigate to `/admin`
2. Click "Run Private Match" button
3. Solver encrypts all open orders
4. Submits encrypted data to Arcium MPC network (Program: `GXMjSxNzrAee7KNdiWfGaUXh783bXyB87aW6TYvmQ3r1`)
5. MPC computation matches orders privately
6. Settlement transaction submitted to Solana
7. View match results and transaction signatures

## Tech Stack

- **Frontend**: Next.js 14 (App Router)
- **Blockchain**: Solana (Devnet)
- **Program**: Anchor 0.32.1
- **Privacy**: Arcium v0.4.0 MPC Network
- **Wallet**: Solana Wallet Adapter

## Getting Started

### Prerequisites

1. Solana wallet with devnet SOL
2. Devnet test tokens (BASE and QUOTE)
3. Solver-relayer running on `localhost:8080`

### Environment Variables

Copy `.env.local` and update with your values:

\`\`\`bash
# Required: Update with your actual market pubkey after creating a market
NEXT_PUBLIC_MARKET_PUBKEY=YOUR_MARKET_PUBKEY_HERE

# Optional: Customize token mints and symbols
NEXT_PUBLIC_BASE_TOKEN_MINT=So11111111111111111111111111111111111111112
NEXT_PUBLIC_QUOTE_TOKEN_MINT=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
NEXT_PUBLIC_BASE_SYMBOL=SOL
NEXT_PUBLIC_QUOTE_SYMBOL=USDC

# Network Configuration (already set)
NEXT_PUBLIC_DARKPOOL_PROGRAM_ID=8HRmULeUKortoBGMFYYSimQQPEG7vAvTAwPX9BEijNA1
NEXT_PUBLIC_SOLVER_URL=http://localhost:8080
\`\`\`

### Run Development Server

\`\`\`bash
cd apps/web
pnpm install
pnpm dev
\`\`\`

Visit [http://localhost:3000](http://localhost:3000)

### Build for Production

\`\`\`bash
pnpm build
pnpm start
\`\`\`

## Creating a Market (First-Time Setup)

Before you can trade, you need to create a market:

\`\`\`bash
# From the repo root
cd programs/darkpool

# Create token mints (if needed)
spl-token create-token --url devnet

# Create a market
anchor run create-market --provider.cluster devnet
\`\`\`

Copy the market pubkey and update `.env.local`:
\`\`\`
NEXT_PUBLIC_MARKET_PUBKEY=<your-market-pubkey>
\`\`\`

## How It Works

### 1. Order Placement
\`\`\`typescript
// User places BID order for 100 USDC, wants minimum 0.95 SOL
PlaceOrder {
  side: BID,
  amountIn: 100 * 10^9,  // 100 USDC (9 decimals)
  minAmountOut: 0.95 * 10^9  // 0.95 SOL minimum
}
\`\`\`

### 2. Private Matching (Arcium MPC)
\`\`\`typescript
// Admin triggers match
POST /match-and-settle

// Solver (solver-relayer):
1. Fetches all open orders for market
2. Encrypts each order with RescueCipher:
   - Generates ephemeral x25519 keypair
   - Gets MXE public key from Arcium
   - Computes shared secret
   - Encrypts order data (side, amounts, etc.)
3. Submits to Arcium MPC:
   - Program: GXMjSxNzrAee7KNdiWfGaUXh783bXyB87aW6TYvmQ3r1
   - Cluster Offset: 768109697
   - Computation Def: 1 (match_orders_mpc)
4. Waits for MPC computation to finalize
5. Decrypts results
6. Submits settlement to darkpool program
\`\`\`

### 3. Settlement
\`\`\`typescript
// Darkpool program settles matched orders on-chain
SettleBatch {
  fills: [
    { buyOrder, sellOrder, baseAmount, quoteAmount },
    ...
  ]
}
\`\`\`

## File Structure

\`\`\`
apps/web/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Trader dashboard
│   │   ├── admin/
│   │   │   └── page.tsx          # Operator panel
│   │   └── layout.tsx            # Root layout with SolanaProvider
│   ├── components/
│   │   ├── darkpool/
│   │   │   ├── OrderForm.tsx     # Place orders
│   │   │   ├── MyOrdersTable.tsx # View/cancel orders
│   │   │   ├── AdminPanel.tsx    # Run MPC matching
│   │   │   └── MarketHeader.tsx  # Market info display
│   │   ├── SolanaProvider.tsx    # Wallet adapter setup
│   │   └── WalletButton.tsx      # Connect wallet UI
│   └── lib/
│       ├── darkpoolClient.ts     # Anchor program client
│       └── darkpool.json         # Program IDL
└── .env.local                    # Environment config
\`\`\`

## Deployed Components

| Component | Status | Address |
|-----------|--------|---------|
| Darkpool Program | ✅ Live | `8HRmULeUKortoBGMFYYSimQQPEG7vAvTAwPX9BEijNA1` |
| Arcium MXE | ✅ Live | `GXMjSxNzrAee7KNdiWfGaUXh783bXyB87aW6TYvmQ3r1` |
| Solver Relayer | ✅ Running | `http://localhost:8080` |
| Network | Devnet | `https://devnet.helius-rpc.com` |

## Testing the Full Flow

1. **Start the solver** (if not already running):
   \`\`\`bash
   cd services/solver-relayer
   set -a && source .env && set +a && node dist/index.js
   \`\`\`

2. **Start the dApp**:
   \`\`\`bash
   cd apps/web
   pnpm dev
   \`\`\`

3. **Place orders**:
   - Connect your Phantom/Solflare wallet
   - Place a BID order (e.g., 10 USDC for 0.095 SOL minimum)
   - Place an ASK order (e.g., 0.1 SOL for 9.5 USDC minimum)

4. **Run matching**:
   - Navigate to `/admin`
   - Click "Run Private Match"
   - Watch the logs for Arcium MPC computation
   - View settlement transaction on Solscan

5. **Verify**:
   - Orders should show as FILLED or PARTIALLY_FILLED
   - Check wallet balances updated
   - View transaction on [Solscan Devnet](https://solscan.io/?cluster=devnet)

## Troubleshooting

### "Missing required environment variable"
Make sure `.env.local` is configured with all required values, especially `NEXT_PUBLIC_MARKET_PUBKEY`.

### "Failed to place order"
- Ensure you have sufficient token balance
- Check that token accounts exist for both base and quote tokens
- Verify wallet is connected and on devnet

### "Match failed"
- Ensure solver-relayer is running on port 8080
- Check solver logs for Arcium MPC errors
- Verify orders exist in the market

### "No orders to match"
- Place at least one BID and one ASK order that can be matched
- Orders must satisfy each other's min_amount_out constraints

## Security Considerations

This is a **devnet deployment** for testing purposes:
- Use only devnet SOL and test tokens
- Do not use mainnet keys or real assets
- Smart contract is unaudited
- Arcium MPC integration is in testing phase

## Learn More

- [Arcium Documentation](https://docs.arcium.com)
- [Solana Documentation](https://docs.solana.com)
- [Anchor Framework](https://www.anchor-lang.com)

## License

MIT
