#!/usr/bin/env ts-node

/**
 * Bootstrap script to initialize config and create a market on devnet
 * 
 * Usage:
 *   export DARKPOOL_PROGRAM_ID="<program-id>"
 *   export DARKPOOL_ADMIN_KEYPAIR="~/.config/solana/id.json"
 *   export BASE_MINT="<base-mint-address>"
 *   export QUOTE_MINT="<quote-mint-address>"
 *   ts-node scripts/bootstrap-market.ts
 */

import * as anchor from '@coral-xyz/anchor';
import { Connection, Keypair, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { readFileSync } from 'fs';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

// Load environment variables
const programId = process.env.DARKPOOL_PROGRAM_ID;
const adminKeypairPath = process.env.DARKPOOL_ADMIN_KEYPAIR;
const baseMintStr = process.env.BASE_MINT;
const quoteMintStr = process.env.QUOTE_MINT;

if (!programId || !adminKeypairPath || !baseMintStr || !quoteMintStr) {
  console.error('Missing required environment variables:');
  console.error('  DARKPOOL_PROGRAM_ID');
  console.error('  DARKPOOL_ADMIN_KEYPAIR');
  console.error('  BASE_MINT');
  console.error('  QUOTE_MINT');
  process.exit(1);
}

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const adminKeypair = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(readFileSync(adminKeypairPath, 'utf8')))
);

const wallet = new anchor.Wallet(adminKeypair);
const provider = new anchor.AnchorProvider(connection, wallet, {
  commitment: 'confirmed',
});

// Load IDL
let idl: any;
try {
  idl = JSON.parse(
    readFileSync('programs/darkpool/target/idl/darkpool.json', 'utf8')
  );
} catch (err) {
  console.error('Failed to load IDL. Make sure you have built the program:');
  console.error('  cd programs/darkpool && anchor build');
  process.exit(1);
}

const program = new anchor.Program(idl, new PublicKey(programId), provider);

async function bootstrap() {
  console.log('🚀 Bootstrapping darkpool market on devnet...\n');

  // 1. Initialize config
  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('config')],
    program.programId
  );

  console.log('📋 Step 1: Initialize config');
  console.log(`   Config PDA: ${configPda.toString()}`);

  try {
    const tx = await program.methods
      .initializeConfig(adminKeypair.publicKey)
      .accounts({
        config: configPda,
        payer: adminKeypair.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log(`   ✅ Config initialized`);
    console.log(`   Transaction: https://explorer.solana.com/tx/${tx}?cluster=devnet\n`);
  } catch (err: any) {
    if (err.message?.includes('already in use') || err.message?.includes('0x0')) {
      console.log(`   ⚠️  Config already initialized (skipping)\n`);
    } else {
      console.error('   ❌ Failed to initialize config:', err);
      throw err;
    }
  }

  // 2. Create market
  const baseMint = new PublicKey(baseMintStr);
  const quoteMint = new PublicKey(quoteMintStr);

  const [marketPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('market'), baseMint.toBuffer(), quoteMint.toBuffer()],
    program.programId
  );

  const [baseVault] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('vault'),
      Buffer.from('base'),
      baseMint.toBuffer(),
      quoteMint.toBuffer(),
    ],
    program.programId
  );

  const [quoteVault] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('vault'),
      Buffer.from('quote'),
      baseMint.toBuffer(),
      quoteMint.toBuffer(),
    ],
    program.programId
  );

  console.log('📋 Step 2: Create market');
  console.log(`   Market PDA: ${marketPda.toString()}`);
  console.log(`   Base mint: ${baseMint.toString()}`);
  console.log(`   Quote mint: ${quoteMint.toString()}`);
  console.log(`   Base vault: ${baseVault.toString()}`);
  console.log(`   Quote vault: ${quoteVault.toString()}`);

  try {
    const tx = await program.methods
      .createMarket(baseMint, quoteMint)
      .accounts({
        config: configPda,
        market: marketPda,
        admin: adminKeypair.publicKey,
        baseMint,
        quoteMint,
        baseVault,
        quoteVault,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log(`   ✅ Market created`);
    console.log(`   Transaction: https://explorer.solana.com/tx/${tx}?cluster=devnet\n`);
  } catch (err: any) {
    if (err.message?.includes('already in use') || err.message?.includes('0x0')) {
      console.log(`   ⚠️  Market already exists (skipping)\n`);
    } else {
      console.error('   ❌ Failed to create market:', err);
      throw err;
    }
  }

  console.log('✅ Bootstrap complete!\n');
  console.log('📝 Save these addresses:');
  console.log(`   Market: ${marketPda.toString()}`);
  console.log(`   Base Vault: ${baseVault.toString()}`);
  console.log(`   Quote Vault: ${quoteVault.toString()}\n`);
}

bootstrap().catch((err) => {
  console.error('❌ Bootstrap failed:', err);
  process.exit(1);
});

