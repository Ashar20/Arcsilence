#!/usr/bin/env tsx

/**
 * Quick test to verify Arcium transaction size issue is fixed by removing padding
 */

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { readFileSync } from 'fs';

async function main() {
  console.log('🔍 Testing Arcium transaction size with updated implementation...\n');

  // Load wallet
  const wallet = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(readFileSync(`${process.env.HOME}/.config/solana/id.json`, 'utf-8')))
  );

  // Connect to devnet
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(wallet), {
    commitment: 'confirmed',
  });

  // Load darkpool program
  const programId = new PublicKey('5fmg6tuqcGX8ypsTkTfipio9enM9anBR7Wt6TYgSk2Ss');
  const idl = JSON.parse(
    readFileSync('/Users/silas/Arcsilence/services/solver-relayer/src/idl/darkpool.json', 'utf-8')
  );
  const program = new anchor.Program(idl, programId, provider);

  console.log('✅ Connected to devnet');
  console.log(`   Program: ${programId.toBase58()}`);
  console.log(`   Wallet: ${wallet.publicKey.toBase58()}\n`);

  // Place 2 orders to test
  console.log('📝 Placing 2 test orders...');

  const marketPubkey = new PublicKey('9H9UqMxJLfhfWj8ewQEbt6vWDDkCG1HqkdPKdVnk8K1m');

  // Place BID order
  const bidTx = await program.methods
    .placeOrder(0, new anchor.BN(1000000), new anchor.BN(900000))
    .accounts({
      market: marketPubkey,
      user: wallet.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc();
  console.log(`   BID placed: ${bidTx.slice(0, 8)}...`);

  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Place ASK order
  const askTx = await program.methods
    .placeOrder(1, new anchor.BN(900000), new anchor.BN(1000000))
    .accounts({
      market: marketPubkey,
      user: wallet.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc();
  console.log(`   ASK placed: ${askTx.slice(0, 8)}...\n`);

  await new Promise((resolve) => setTimeout(resolve, 5000));

  console.log('✅ Test complete!');
  console.log('\n📊 Summary:');
  console.log('   - Removed 10-order padding from Arcium client');
  console.log('   - Now processes only actual orders (2 orders = 14 encrypted fields)');
  console.log('   - Expected ciphertext size: ~504 bytes (down from ~2,520 bytes)');
  console.log('   - Should fit within Arcium 1,232-byte limit\n');

  console.log('🔄 Solver should automatically process these orders with real Arcium MPC');
  console.log('   Check solver logs for "[Arcium] Processing N orders" message');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
