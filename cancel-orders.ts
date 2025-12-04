import { Connection, Keypair, PublicKey, SystemProgram } from '@solana/web3.js';
import { Program, AnchorProvider, Wallet } from '@coral-xyz/anchor';
import * as fs from 'fs';
import idl from './target/idl/darkpool.json';

const RPC_URL = 'https://api.devnet.solana.com';
const PROGRAM_ID = new PublicKey('CMy5ru8L5nwnn4RK8TZJiCLs4FVkouV2PKPnuPCLFedB');

async function cancelOrders() {
  console.log('🗑️  Cancelling orders...\n');

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

  // Cancel the older orders (created earlier)
  const ordersToCancel = [
    '4f4fnQ7K3P1Rrk5aYrkW8tN5SMpVBLuniVbjijnJZMfD', // Order 2 (older ASK)
    'FsdPbcHQX3vBr1tjpjGUCsUubhtchmcxh8vNv589wPYp'  // Order 4 (older BID)
  ];

  for (const orderPubkey of ordersToCancel) {
    try {
      console.log(`Cancelling order: ${orderPubkey}`);

      const tx = await program.methods
        .cancelOrder()
        .accounts({
          order: new PublicKey(orderPubkey),
          owner: wallet.publicKey,
        })
        .rpc();

      console.log(`✅ Cancelled! Transaction: ${tx}\n`);
      await connection.confirmTransaction(tx, 'confirmed');
    } catch (error: any) {
      console.log(`❌ Error cancelling order ${orderPubkey}:`, error.message);
      if (error.logs) console.log('Logs:', error.logs);
    }
  }

  console.log('✅ Done!\n');
}

cancelOrders().catch(console.error);
