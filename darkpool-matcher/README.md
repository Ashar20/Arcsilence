# ArcSilence Dark Pool Matcher - Arcium MXE

This directory contains the Arcium-ready encrypted matching engine for ArcSilence.

## Status

✅ **Encrypted instruction implementation complete**
✅ **Compiles with Arcis SDK** (`cargo build --features arcis`)
✅ **Arcium project structure set up**
✅ **Successfully builds with `arcium build`**
⏳ **Awaiting circuit generation completion**

## Quick Start

```bash
# Build (compiles successfully)
arcium build

# Deploy to localnet for testing
arcium localnet

# Deploy to testnet/mainnet
arcium deploy --cluster testnet
```

## Structure

```
darkpool-matcher/
├── encrypted-ixs/          # Encrypted matching logic
│   ├── src/
│   │   ├── matching.rs     # Canonical plain Rust matcher
│   │   ├── circuits.rs     # Encrypted MPC instruction
│   │   └── lib.rs          # Library entry
│   └── Cargo.toml
├── Arcium.toml             # Arcium configuration
├── Cargo.toml              # Workspace configuration
└── README.md               # This file
```

## Implementation

The encrypted matcher in [encrypted-ixs/src/circuits.rs](encrypted-ixs/src/circuits.rs) implements:

- **FIFO greedy matching** algorithm
- **Fixed-size arrays** (max 100 orders/fills)
- **Arcis-compliant**: No `while` loops, no `continue`, no external imports
- **Full algorithm**: Filter → Split → Sort → Match → Validate

### Tests

```bash
cd encrypted-ixs
cargo test  # 17/17 tests passing
```

## Deployment

Once the Arcium circuit generation is complete:

### 1. Local Testing

```bash
arcium localnet
# Wait for localnet to start
# Test computation locally
```

### 2. Deploy to Testnet

```bash
arcium deploy --cluster testnet
# Note the returned compDefId
```

### 3. Update Client

Edit `../services/solver-relayer/src/arciumClient.ts`:

```typescript
export function createArciumClient(): ArciumClient {
  return new RealArciumClient(
    process.env.ARCIUM_COMP_DEF_ID || 'comp_xxxxxxxxxxxxx', // From deploy
    'testnet'
  );
}
```

Add to `.env`:
```
ARCIUM_USE_REAL=true
ARCIUM_COMP_DEF_ID=comp_xxxxxxxxxxxxx
ARCIUM_NETWORK=testnet
```

## Architecture

```
Orders (Plain) → Encrypt → MPC MXE → Decrypt → Fills (Plain)
                           ↓
                    match_orders_mpc
                    (Arcis Circuit)
```

## Current Build Status

The project successfully compiles with Arcis SDK. The `arcium build` command:
- ✅ Builds encrypted-ixs crate
- ✅ Compiles with all Arcis dependencies
- ⏳ Circuit generation (final step)

## Next Steps

1. **Complete circuit generation** - Work with Arcium team if needed
2. **Test on localnet** - `arcium localnet`
3. **Deploy to testnet** - `arcium deploy --cluster testnet`
4. **Integrate client** - Wire up TypeScript SDK in solver-relayer

## Documentation

- [encrypted-ixs/src/circuits.rs](encrypted-ixs/src/circuits.rs) - Encrypted instruction source
- [../encrypted-ixs/MATCHING_SPEC.md](../encrypted-ixs/MATCHING_SPEC.md) - Algorithm specification
- [../encrypted-ixs/DEPLOYMENT.md](../encrypted-ixs/DEPLOYMENT.md) - Deployment guide

## Support

For Arcium-specific issues:
- [Arcium Docs](https://docs.arcium.com)
- [Arcium Discord](https://discord.gg/arcium)

Built with ❤️ using Arcium MPC
