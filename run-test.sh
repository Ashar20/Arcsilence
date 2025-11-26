#!/bin/bash

echo "🧪 ArcSilence Full Flow Test Runner"
echo ""

# Check if solver is running
if ! curl -s http://localhost:8080/health > /dev/null 2>&1; then
    echo "❌ Solver not running!"
    echo ""
    echo "Start the solver first:"
    echo "  cd services/solver-relayer"
    echo "  source .env"
    echo "  node dist/index.js"
    echo ""
    exit 1
fi

echo "✅ Solver is running"
echo ""

# Check if we have the IDL
if [ ! -f "./target/idl/darkpool.json" ]; then
    echo "❌ IDL not found at ./target/idl/darkpool.json"
    echo ""
    echo "Build the program first:"
    echo "  anchor build"
    echo ""
    exit 1
fi

echo "✅ IDL found"
echo ""

# Run the test using tsx (TypeScript execution)
echo "🚀 Running full flow test..."
echo ""
pnpm exec tsx test-full-flow.ts
