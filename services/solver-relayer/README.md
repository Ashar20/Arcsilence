# Solver-Relayer Service

The solver-relayer service is the off-chain component of ArcSilence that:

1. Fetches open `Order` accounts for a market from the Solana darkpool program
2. Uses `LocalArciumClient` (local matcher) to compute a batch execution plan
3. Calls `settle_batch` on the darkpool program with the execution plan

## Environment Variables

The following environment variables are required:

- `SOLANA_RPC_URL` - Solana RPC endpoint URL (e.g., `http://localhost:8899` for localnet)
- `DARKPOOL_PROGRAM_ID` - The program ID of the deployed darkpool program
- `DARKPOOL_ADMIN_KEYPAIR` - Path to a JSON keypair file for the admin account (must match the admin used in the program config)
- `PORT` - HTTP server port (optional, defaults to 8080)

### Arcium Integration (Optional)

To use real Arcium encrypted compute instead of local matching set the following:

- `ARCIUM_USE_REAL` - Set to `"true"` to use `RealArciumClient` (default: `"false"`)
- `ARCIUM_PROGRAM_ID` - MXE program ID returned by `arcium deploy`
- `ARCIUM_CLUSTER_OFFSET` - Cluster offset you deployed against (e.g. `768109697` for v0.4.0 devnet)
- `ARCIUM_COMP_DEF_ID` - Computation definition offset (set to `1` for `match_orders_mpc`)
- `ARCIUM_RPC_URL` - RPC endpoint that the MXE uses (defaults to `SOLANA_RPC_URL` if omitted)
- `ARCIUM_WALLET_PATH` - Path to the wallet used for Arcium submissions (defaults to `SOLANA_WALLET_PATH`)
- `ARCIUM_NETWORK` / `ARCIUM_API_KEY` - Optional metadata or API key if required by your RPC provider

Example devnet `.env` snippet (Helius RPC):

```
SOLANA_RPC_URL=https://devnet.helius-rpc.com/?api-key=c10f136f-baab-46d1-a4f7-83cdf19e3fdc
DARKPOOL_PROGRAM_ID=7W5G8fa8QUBgrHFSfzMoCwoDhVzGM3ap4NWuQg4zpv6D
DARKPOOL_ADMIN_KEYPAIR=/Users/silas/.config/solana/id.json

ARCIUM_USE_REAL=true
ARCIUM_PROGRAM_ID=GXMjSxNzrAee7KNdiWfGaUXh783bXyB87aW6TYvmQ3r1
ARCIUM_CLUSTER_OFFSET=768109697
ARCIUM_COMP_DEF_ID=1
ARCIUM_RPC_URL=https://devnet.helius-rpc.com/?api-key=c10f136f-baab-46d1-a4f7-83cdf19e3fdc
ARCIUM_WALLET_PATH=/Users/silas/.config/solana/id.json
```

## Setup

1. Generate the IDL from the Anchor program:
   ```bash
   cd ../../programs/darkpool
   anchor build
   cp target/idl/darkpool.json ../../services/solver-relayer/src/idl/darkpool.json
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Set environment variables:
   ```bash
   export SOLANA_RPC_URL="http://localhost:8899"
   export DARKPOOL_PROGRAM_ID="<your-program-id>"
   export DARKPOOL_ADMIN_KEYPAIR="~/.config/solana/id.json"
   export PORT=8080
   ```

4. Start the service:
   ```bash
   pnpm dev
   ```

## API Endpoints

### POST /match-and-settle

Triggers order matching and settlement for a given market.

**Request Body:**
```json
{
  "marketPubkey": "<market-public-key>"
}
```

**Response:**
```json
{
  "txSignature": "<transaction-signature>",
  "plan": {
    "market": "<market-public-key>",
    "fills": [
      {
        "order": "<order-public-key>",
        "counterparty": "<counterparty-order-public-key>",
        "amountIn": "1000000000",
        "amountOut": "1000000000"
      }
    ],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "arciumSignature": "LOCAL_STUB_SIGNATURE"
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:8080/match-and-settle \
  -H "Content-Type: application/json" \
  -d '{"marketPubkey":"<MARKET_PUBKEY>"}'
```

### GET /health

Health check endpoint.

**Response:**
```json
{
  "ok": true
}
```

## Architecture

### Arcium Client Selection

The service supports two Arcium clients:

#### LocalArciumClient (Default)

Performs matching locally in plaintext. Used for:
- Development and testing
- Quick iteration without Arcium network setup
- Fallback when Arcium network is unavailable

#### RealArciumClient

Uses Arcium's MPC network for encrypted computation:

1. **Encrypts orders** using Arcium SDK
2. **Submits encrypted job** to Arcium network
3. **Runs matching** inside MPC MXE (Multi-Party Execution Environment)
4. **Receives encrypted result** with cryptographic proof
5. **Decrypts to ExecutionPlan** for Solana submission

The client is selected via `ARCIUM_USE_REAL` environment variable. The interface is designed so switching between clients requires no code changes.

### Encrypted Matching Program

The actual matching logic runs in Rust inside Arcium's MPC environment. See `encrypted-ixs/` directory and `ARCIUM_SETUP.md` for details on:
- Writing encrypted matching code
- Compiling and registering with Arcium
- Testing encrypted computation

### Arcium Signature/Attestation

The `arciumSignature` field in `ExecutionPlan` contains:
- **Local mode**: `"LOCAL_STUB_SIGNATURE"`
- **Real Arcium mode**: Cryptographic attestation/proof from Arcium network

This signature is:
- Emitted in `BatchSettled` events on Solana (for transparency)
- Can be verified off-chain to prove computation was done in MPC
- Future: Could be verified on-chain if Arcium provides verifiable proofs

### Order Matching

The matcher uses a simple FIFO (First-In-First-Out) greedy algorithm:

1. Filters orders to `OPEN` status only
2. Splits into `BID` and `ASK` orders
3. Sorts both by `createdAt` (oldest first)
4. Matches orders greedily with 1:1 price ratio
5. Ensures minimum output requirements are met

This is intentionally simple for MVP but deterministic and suitable for dark pool matching.

## Development

```bash
# Build
pnpm build

# Run in development mode
pnpm dev

# Lint
pnpm lint

# Format
pnpm format
```

## Arcium Integration

See `ARCIUM_SETUP.md` for complete Arcium integration guide.

Quick start:
1. Install Arcium tooling: `curl --proto '=https' --tlsv1.2 -sSfL https://install.arcium.com/ | bash && arcup install`
2. Build encrypted matching program: `cd encrypted-ixs && arcium build`
3. Register with Arcium: `arcium register --name darkpool-matcher`
4. Set `ARCIUM_COMP_DEF_ID` and `ARCIUM_USE_REAL=true`
5. Restart service

## Next Steps

- [x] Generate and include actual IDL from Anchor program
- [x] Create encrypted matching program structure
- [x] Implement RealArciumClient interface
- [ ] Complete Arcium SDK integration (add `@arcium/sdk` dependency when available)
- [ ] Test encrypted computation on Arcium testnet
- [ ] Add order filtering by memcmp for better performance
- [ ] Add more sophisticated matching algorithms (price-time priority, etc.)
- [ ] Add logging and monitoring
- [ ] Add rate limiting and authentication for API endpoints
- [ ] Implement on-chain verification of Arcium attestations (stretch goal)

