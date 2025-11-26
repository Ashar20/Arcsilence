#!/bin/bash

# On-Chain Verification Script
# This script checks all deployed components on Solana Devnet

set -e

DARKPOOL_PROGRAM="8HRmULeUKortoBGMFYYSimQQPEG7vAvTAwPX9BEijNA1"
ARCIUM_PROGRAM="GXMjSxNzrAee7KNdiWfGaUXh783bXyB87aW6TYvmQ3r1"
WALLET="13jxZUSV57mUwuAWbFrt4q1a8TA39ARsXxeonvyDKQQE"
IDL_ACCOUNT="FEouxFhfbjZbduaEvevrm4x4DYHVJV4qUUE5cixo63JN"

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║         Solana Devnet Deployment Verification             ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Check Solana config
echo "📋 Checking Solana Configuration..."
solana config get
echo ""

# Check wallet balance
echo "💰 Wallet Balance:"
echo "   Address: $WALLET"
solana balance $WALLET --url devnet
echo ""

# Check Darkpool Program
echo "🔍 Darkpool Program Status:"
solana program show $DARKPOOL_PROGRAM --url devnet
echo ""

# Check Arcium Program
echo "🔍 Arcium MXE Program Status:"
solana program show $ARCIUM_PROGRAM --url devnet
echo ""

# Check IDL Account
echo "📄 IDL Account Status:"
solana account $IDL_ACCOUNT --url devnet | head -5
echo ""

# Try to fetch IDL
echo "📥 Fetching IDL from chain..."
if anchor idl fetch $DARKPOOL_PROGRAM --provider.cluster devnet -o /tmp/darkpool-onchain.json 2>/dev/null; then
    echo "✅ IDL fetched successfully"
    echo "   Instructions available:"
    cat /tmp/darkpool-onchain.json | jq -r '.instructions[].name' | sed 's/^/   - /'
    echo ""
else
    echo "⚠️  IDL fetch failed (this is okay if deployed with --no-idl)"
    echo "   Using local IDL from target/idl/darkpool.json"
    echo ""
fi

# Show recent transactions
echo "📜 Recent Transactions (last 5):"
solana transaction-history $WALLET --url devnet --limit 5 2>/dev/null || echo "   No recent transactions or RPC error"
echo ""

# Explorer links
echo "🔗 Explorer Links:"
echo "   Darkpool Program:"
echo "   → https://solscan.io/account/$DARKPOOL_PROGRAM?cluster=devnet"
echo ""
echo "   Arcium MXE Program:"
echo "   → https://solscan.io/account/$ARCIUM_PROGRAM?cluster=devnet"
echo ""
echo "   Your Wallet:"
echo "   → https://solscan.io/account/$WALLET?cluster=devnet"
echo ""

# Arcium specific info
echo "🌐 Arcium Configuration:"
echo "   Cluster Offset: 768109697"
echo "   Comp Def ID: 1"
echo "   Network: Devnet"
echo ""

echo "✅ Verification complete!"
echo ""
echo "To watch program logs in real-time, run:"
echo "   solana logs $DARKPOOL_PROGRAM --url devnet"
