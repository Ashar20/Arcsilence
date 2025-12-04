import { Connection, PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider, Wallet } from '@coral-xyz/anchor';
import { Keypair } from '@solana/web3.js';
import * as fs from 'fs';
import idl from './target/idl/darkpool.json';

const RPC_URL = 'https://api.devnet.solana.com';
const PROGRAM_ID = new PublicKey('CMy5ru8L5nwnn4RK8TZJiCLs4FVkouV2PKPnuPCLFedB');
const MARKET_PDA = new PublicKey('DeLq8EMHPuQkn27GuMM744HMhBvi8jkFYyZvWbq1WoKo');

async function debugOrders() {
  console.log('🔍 Debugging Order Fetching\n');

  // Load wallet
  const keypairPath = process.env.HOME + '/.config/solana/id.json';
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
  const wallet = Keypair.fromSecretKey(new Uint8Array(keypairData));

  // Create connection and provider
  const connection = new Connection(RPC_URL, 'confirmed');
  const provider = new AnchorProvider(
    connection,
    new Wallet(wallet),
    { commitment: 'confirmed' }
  );

  const program = new Program(idl as any, provider);

  console.log(`Program ID: ${program.programId.toBase58()}`);
  console.log(`Market: ${MARKET_PDA.toBase58()}\n`);

  // Fetch all order accounts
  console.log('Fetching all order accounts...');
  try {
    const ordersRaw = await (program.account as any).order.all();
    console.log(`✅ Found ${ordersRaw.length} total order account(s)\n`);

    if (ordersRaw.length === 0) {
      console.log('❌ No order accounts found at all!');
      console.log('   This means either:');
      console.log('   1. The IDL discriminator doesn\'t match the on-chain accounts');
      console.log('   2. The program ID is wrong');
      console.log('   3. No orders have been placed\n');
      return;
    }

    // Print all orders
    ordersRaw.forEach((acc: any, index: number) => {
      const order = acc.account;
      console.log(`Order ${index + 1}:`);
      console.log(`  Pubkey: ${acc.publicKey.toBase58()}`);
      console.log(`  Owner: ${order.owner.toBase58()}`);
      console.log(`  Market: ${order.market.toBase58()}`);
      console.log(`  Side: ${JSON.stringify(order.side)}`);
      console.log(`  Amount In: ${order.amountIn.toString()}`);
      console.log(`  Min Amount Out: ${order.minAmountOut.toString()}`);
      console.log(`  Status: ${JSON.stringify(order.status)}`);
      console.log(`  Filled: ${order.filledAmountIn.toString()}`);
      console.log(`  Created At: ${order.createdAt.toString()}\n`);
    });

    // Filter by market
    const ordersForMarket = ordersRaw.filter((acc: any) => {
      const order = acc.account;
      return order.market.toBase58() === MARKET_PDA.toBase58();
    });

    console.log(`Orders for market ${MARKET_PDA.toBase58()}: ${ordersForMarket.length}`);

    // Filter by status
    const openOrders = ordersForMarket.filter((acc: any) => {
      const order = acc.account;
      // Check if status is "Open" (typically { open: {} } in Anchor)
      return order.status && 'open' in order.status;
    });

    console.log(`Open orders: ${openOrders.length}\n`);

    if (openOrders.length > 0) {
      console.log('✅ Found open orders ready for matching!\n');
      openOrders.forEach((acc: any, index: number) => {
        const order = acc.account;
        console.log(`Open Order ${index + 1}:`);
        console.log(`  Pubkey: ${acc.publicKey.toBase58()}`);
        console.log(`  Side: ${JSON.stringify(order.side)}`);
        console.log(`  Amount In: ${order.amountIn.toString()}`);
        console.log(`  Min Amount Out: ${order.minAmountOut.toString()}\n`);
      });
    } else {
      console.log('ℹ️  No open orders found. Checking status format...\n');
      if (ordersForMarket.length > 0) {
        console.log('Status of first order:', JSON.stringify(ordersForMarket[0].account.status));
      }
    }

  } catch (error: any) {
    console.log('❌ Error fetching orders:', error.message);
    if (error.logs) console.log('Logs:', error.logs);
  }
}

debugOrders().catch(console.error);
