#!/usr/bin/env tsx

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider, Wallet } from '@coral-xyz/anchor';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';
import * as fs from 'fs';
import idl from './services/solver-relayer/src/idl/darkpool.json';

const RPC_URL = 'https://api.devnet.solana.com';
const PROGRAM_ID = new PublicKey('CMy5ru8L5nwnn4RK8TZJiCLs4FVkouV2PKPnuPCLFedB');
const BASE_TOKEN_MINT = new PublicKey('yXJUy2a1YgKDJ5CfngRN7djwX3Dtbv85f9jUFCgutdj');
const QUOTE_TOKEN_MINT = new PublicKey('4eYgX7VZj4eQ5Vf5MbmzCgAwcbhkP1rSMhR5jZmdZN5H');

async function main() {
  console.log('🗑️  Closing all old orders...\n');

  // Load wallet
  const keypairPath = process.env.HOME + '/.config/solana/id.json';
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
  const wallet = Keypair.fromSecretKey(new Uint8Array(keypairData));

  console.log(`Wallet: ${wallet.publicKey.toBase58()}\n`);

  // Create connection and provider
  const connection = new Connection(RPC_URL, 'confirmed');
  const provider = new AnchorProvider(
    connection,
    new Wallet(wallet),
    { commitment: 'confirmed' }
  );

  const program = new Program(idl as any, provider);

  // Derive market PDA
  const [marketPDA] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('market'),
      BASE_TOKEN_MINT.toBuffer(),
      QUOTE_TOKEN_MINT.toBuffer()
    ],
    program.programId
  );

  console.log(`Market: ${marketPDA.toBase58()}\n`);

  // Fetch all order accounts (same method as solver)
  console.log('Fetching all order accounts...');
  const allOrdersRaw = await (program.account as any).order.all();

  // Filter by market
  const marketOrders = allOrdersRaw.filter((acc: any) => {
    const order = acc.account;
    const orderMarket = new PublicKey(order.market);
    return orderMarket.equals(marketPDA);
  });

  console.log(`Found ${marketOrders.length} order accounts for this market\n`);

  if (marketOrders.length === 0) {
    console.log('No orders to close!');
    return;
  }

  // Get user token accounts
  const userBaseAccount = await getAssociatedTokenAddress(BASE_TOKEN_MINT, wallet.publicKey);
  const userQuoteAccount = await getAssociatedTokenAddress(QUOTE_TOKEN_MINT, wallet.publicKey);

  // Derive vault PDAs
  const [baseVaultPDA] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('vault'),
      Buffer.from('base'),
      BASE_TOKEN_MINT.toBuffer(),
      QUOTE_TOKEN_MINT.toBuffer()
    ],
    program.programId
  );

  const [quoteVaultPDA] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('vault'),
      Buffer.from('quote'),
      BASE_TOKEN_MINT.toBuffer(),
      QUOTE_TOKEN_MINT.toBuffer()
    ],
    program.programId
  );

  // Close each order
  let closed = 0;
  for (const { publicKey } of marketOrders) {
    try {
      console.log(`Closing order ${publicKey.toBase58()}...`);
      const tx = await program.methods
        .cancelOrder()
        .accounts({
          order: publicKey,
          owner: wallet.publicKey,
          market: marketPDA,
          userBaseAccount: userBaseAccount,
          userQuoteAccount: userQuoteAccount,
          baseVault: baseVaultPDA,
          quoteVault: quoteVaultPDA,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      console.log(`  ✅ Closed! TX: ${tx.slice(0, 8)}...`);
      closed++;

      // Wait a bit to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error: any) {
      console.log(`  ❌ Failed: ${error.message}`);
    }
  }

  console.log(`\n✅ Closed ${closed} out of ${marketOrders.length} orders`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
