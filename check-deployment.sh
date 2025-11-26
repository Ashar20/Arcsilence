#!/bin/bash

echo "🔍 ArcSilence Deployment Check"
echo ""
echo "=" | head -c 60 && echo ""

# Program addresses
DARKPOOL_PROGRAM="CMrfhDiq5gLBwbT3nxQvGH1UTcxtaAY9r4we2PvjbjAg"
ARCIUM_MXE="GXMjSxNzrAee7KNdiWfGaUXh783bXyB87aW6TYvmQ3r1"
BASE_TOKEN="yXJUy2a1YgKDJ5CfngRN7djwX3Dtbv85f9jUFCgutdj"
QUOTE_TOKEN="4eYgX7VZj4eQ5Vf5MbmzCgAwcbhkP1rSMhR5jZmdZN5H"
MARKET_PDA="2Av4Zp7zSQ4ZbQD9YdpULftfcAL69NXbYVR5PAKbbkDD"

echo ""
echo "📍 Darkpool Program"
solana program show $DARKPOOL_PROGRAM --url devnet 2>&1 | head -10

echo ""
echo "=" | head -c 60 && echo ""
echo "📍 Arcium MXE Program"
solana program show $ARCIUM_MXE --url devnet 2>&1 | head -10

echo ""
echo "=" | head -c 60 && echo ""
echo "📍 Base Token (TOKEN1)"
spl-token display $BASE_TOKEN --url devnet 2>&1

echo ""
echo "=" | head -c 60 && echo ""
echo "📍 Quote Token (TOKEN2)"
spl-token display $QUOTE_TOKEN --url devnet 2>&1

echo ""
echo "=" | head -c 60 && echo ""
echo "📍 Market Account"
solana account $MARKET_PDA --url devnet 2>&1 | head -15

echo ""
echo "=" | head -c 60 && echo ""
echo "🔗 Explorer Links:"
echo ""
echo "Darkpool Program:"
echo "  https://solscan.io/account/$DARKPOOL_PROGRAM?cluster=devnet"
echo ""
echo "Arcium MXE:"
echo "  https://solscan.io/account/$ARCIUM_MXE?cluster=devnet"
echo ""
echo "Market PDA:"
echo "  https://solscan.io/account/$MARKET_PDA?cluster=devnet"
echo ""
