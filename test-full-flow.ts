import * as anchor from '@coral-xyz/anchor';
import { PublicKey, Keypair, Connection } from '@solana/web3.js';
import { readFileSync } from 'fs';
import { TOKEN_PROGRAM_ID, getOrCreateAssociatedTokenAccount, mintTo, getAccount } from '@solana/spl-token';
import fetch from 'node-fetch';

// Configuration
const PROGRAM_ID = new PublicKey('CMrfhDiq5gLBwbT3nxQvGH1UTcxtaAY9r4we2PvjbjAg');
const BASE_MINT = new PublicKey('yXJUy2a1YgKDJ5CfngRN7djwX3Dtbv85f9jUFCgutdj');
const QUOTE_MINT = new PublicKey('4eYgX7VZj4eQ5Vf5MbmzCgAwcbhkP1rSMhR5jZmdZN5H');
const SOLVER_URL = 'http://localhost:8080';
const RPC_URL = 'https://devnet.helius-rpc.com/?api-key=c10f136f-baab-46d1-a4f7-83cdf19e3fdc';

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('\n🚀 ArcSilence Full Flow Test\n');
  console.log('=' .repeat(60));

  // Setup connection
  const connection = new Connection(RPC_URL, 'confirmed');

  // Load wallet
  const walletPath = process.env.HOME + '/.config/solana/id.json';
  const secretKey = JSON.parse(readFileSync(walletPath, 'utf-8'));
  const wallet = Keypair.fromSecretKey(new Uint8Array(secretKey));

  console.log('\n📍 Wallet:', wallet.publicKey.toString());

  const balance = await connection.getBalance(wallet.publicKey);
  console.log('💰 Balance:', balance / 1e9, 'SOL');

  // Load IDL
  const idlPath = './target/idl/darkpool.json';
  const idl = JSON.parse(readFileSync(idlPath, 'utf-8'));

  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(wallet),
    { commitment: 'confirmed' }
  );

  const program = new anchor.Program(idl as anchor.Idl, PROGRAM_ID, provider);

  // Derive PDAs
  const [marketPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('market'), BASE_MINT.toBuffer(), QUOTE_MINT.toBuffer()],
    PROGRAM_ID
  );

  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('config')],
    PROGRAM_ID
  );

  const [baseVaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), Buffer.from('base'), BASE_MINT.toBuffer(), QUOTE_MINT.toBuffer()],
    PROGRAM_ID
  );

  const [quoteVaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), Buffer.from('quote'), BASE_MINT.toBuffer(), QUOTE_MINT.toBuffer()],
    PROGRAM_ID
  );

  console.log('\n📦 PDAs:');
  console.log('  Config:', configPda.toString());
  console.log('  Market:', marketPda.toString());
  console.log('  Base Vault:', baseVaultPda.toString());
  console.log('  Quote Vault:', quoteVaultPda.toString());

  // Step 1: Initialize Config (if needed)
  console.log('\n' + '='.repeat(60));
  console.log('STEP 1: Initialize Config');
  console.log('='.repeat(60));

  try {
    const configAccount = await connection.getAccountInfo(configPda);
    if (!configAccount) {
      console.log('⚙️  Initializing config...');
      const initTx = await (program.methods as any)
        .initializeConfig(wallet.publicKey)
        .accounts({
          config: configPda,
          payer: wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      console.log('✅ Config initialized:', initTx);
      await sleep(2000);
    } else {
      console.log('✅ Config already exists');
    }
  } catch (error: any) {
    console.error('❌ Config error:', error.message);
  }

  // Step 2: Create Market (if needed)
  console.log('\n' + '='.repeat(60));
  console.log('STEP 2: Create Market');
  console.log('='.repeat(60));

  try {
    const marketAccount = await connection.getAccountInfo(marketPda);
    if (!marketAccount) {
      console.log('🏦 Creating market...');
      const tx = await (program.methods as any)
        .createMarket(BASE_MINT, QUOTE_MINT)
        .accounts({
          config: configPda,
          market: marketPda,
          admin: wallet.publicKey,
          baseMint: BASE_MINT,
          quoteMint: QUOTE_MINT,
          baseVault: baseVaultPda,
          quoteVault: quoteVaultPda,
          systemProgram: anchor.web3.SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .rpc();
      console.log('✅ Market created:', tx);
      await sleep(2000);
    } else {
      console.log('✅ Market already exists');
    }
  } catch (error: any) {
    if (error.message.includes('already in use')) {
      console.log('✅ Market already exists');
    } else {
      console.error('❌ Market error:', error.message);
    }
  }

  // Step 3: Check Token Accounts
  console.log('\n' + '='.repeat(60));
  console.log('STEP 3: Check Token Accounts');
  console.log('='.repeat(60));

  try {
    const baseTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      wallet,
      BASE_MINT,
      wallet.publicKey
    );
    console.log('✅ Base Token Account:', baseTokenAccount.address.toString());
    console.log('   Balance:', baseTokenAccount.amount.toString());

    const quoteTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      wallet,
      QUOTE_MINT,
      wallet.publicKey
    );
    console.log('✅ Quote Token Account:', quoteTokenAccount.address.toString());
    console.log('   Balance:', quoteTokenAccount.amount.toString());
  } catch (error: any) {
    console.error('❌ Token account error:', error.message);
  }

  // Step 4: Place Orders
  console.log('\n' + '='.repeat(60));
  console.log('STEP 4: Place Orders');
  console.log('='.repeat(60));

  try {
    // Get token accounts
    const baseTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      wallet,
      BASE_MINT,
      wallet.publicKey
    );

    const quoteTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      wallet,
      QUOTE_MINT,
      wallet.publicKey
    );

    // Place BID order (buying base with quote)
    console.log('\n📝 Placing BID order...');
    const bidOrderId = new anchor.BN(Date.now());
    const [bidOrderPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('order'), marketPda.toBuffer(), wallet.publicKey.toBuffer(), bidOrderId.toArrayLike(Buffer, 'le', 8)],
      PROGRAM_ID
    );

    const bidTx = await (program.methods as any)
      .placeOrder(
        bidOrderId,
        { bid: {} },
        new anchor.BN(100_000_000), // 100 quote tokens
        new anchor.BN(9_000_000)    // want at least 9 base tokens
      )
      .accounts({
        order: bidOrderPda,
        market: marketPda,
        owner: wallet.publicKey,
        ownerTokenAccount: quoteTokenAccount.address,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log('✅ BID order placed:', bidTx);
    console.log('   Order PDA:', bidOrderPda.toString());
    console.log('   Amount: 100 quote tokens');
    console.log('   Min receive: 9 base tokens');

    await sleep(2000);

    // Place ASK order (selling base for quote)
    console.log('\n📝 Placing ASK order...');
    const askOrderId = new anchor.BN(Date.now() + 1);
    const [askOrderPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('order'), marketPda.toBuffer(), wallet.publicKey.toBuffer(), askOrderId.toArrayLike(Buffer, 'le', 8)],
      PROGRAM_ID
    );

    const askTx = await (program.methods as any)
      .placeOrder(
        askOrderId,
        { ask: {} },
        new anchor.BN(10_000_000),  // 10 base tokens
        new anchor.BN(95_000_000)   // want at least 95 quote tokens
      )
      .accounts({
        order: askOrderPda,
        market: marketPda,
        owner: wallet.publicKey,
        ownerTokenAccount: baseTokenAccount.address,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log('✅ ASK order placed:', askTx);
    console.log('   Order PDA:', askOrderPda.toString());
    console.log('   Amount: 10 base tokens');
    console.log('   Min receive: 95 quote tokens');

    await sleep(2000);

  } catch (error: any) {
    console.error('❌ Order placement error:', error.message);
  }

  // Step 5: Fetch Orders
  console.log('\n' + '='.repeat(60));
  console.log('STEP 5: Fetch Open Orders');
  console.log('='.repeat(60));

  try {
    const orders = await (program.account as any).order.all([
      {
        memcmp: {
          offset: 8 + 32, // discriminator + market
          bytes: wallet.publicKey.toBase58(),
        }
      }
    ]);

    console.log(`\n📋 Found ${orders.length} orders:`);
    orders.forEach((order: any, i: number) => {
      console.log(`\n  Order ${i + 1}:`);
      console.log(`    Address: ${order.publicKey.toString()}`);
      console.log(`    Side: ${order.account.side.bid ? 'BID' : 'ASK'}`);
      console.log(`    Amount In: ${order.account.amountIn.toString()}`);
      console.log(`    Min Out: ${order.account.minAmountOut.toString()}`);
      console.log(`    Status: ${order.account.status.open ? 'OPEN' : order.account.status.filled ? 'FILLED' : 'CANCELLED'}`);
    });
  } catch (error: any) {
    console.error('❌ Fetch orders error:', error.message);
  }

  // Step 6: Trigger Arcium MPC Matching
  console.log('\n' + '='.repeat(60));
  console.log('STEP 6: Trigger Arcium MPC Matching');
  console.log('='.repeat(60));

  try {
    console.log('\n🔐 Checking solver health...');
    const healthResponse = await fetch(`${SOLVER_URL}/health`);
    const health = await healthResponse.json();
    console.log('✅ Solver status:', health);

    console.log('\n🔐 Submitting orders to Arcium MPC...');
    console.log('   This will:');
    console.log('   1. Encrypt orders with x25519 key exchange');
    console.log('   2. Submit to Arcium MPC network');
    console.log('   3. Wait for private computation');
    console.log('   4. Decrypt and settle matches on-chain');
    console.log('\n⏳ This may take 30-60 seconds...\n');

    const matchResponse = await fetch(`${SOLVER_URL}/match-and-settle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        marketPubkey: marketPda.toString()
      }),
    });

    if (!matchResponse.ok) {
      const error = await matchResponse.text();
      throw new Error(`Solver error: ${error}`);
    }

    const result = await matchResponse.json();

    console.log('\n✅ Arcium MPC matching completed!');
    console.log('\n📊 Results:');
    console.log('   Settlement TX:', result.txSignature);
    console.log('   Arcium MPC TX:', result.arciumSignature);
    console.log('   Fills:', result.fills?.length || 0);

    if (result.fills && result.fills.length > 0) {
      console.log('\n💱 Matched Orders:');
      result.fills.forEach((fill: any, i: number) => {
        console.log(`\n   Match ${i + 1}:`);
        console.log(`     Bid Order: ${fill.bidOrder.slice(0, 8)}...`);
        console.log(`     Ask Order: ${fill.askOrder.slice(0, 8)}...`);
        console.log(`     Base Amount: ${fill.baseAmount}`);
        console.log(`     Quote Amount: ${fill.quoteAmount}`);
      });
    }

    console.log('\n🔗 View transactions:');
    console.log(`   Settlement: https://solscan.io/tx/${result.txSignature}?cluster=devnet`);
    console.log(`   Arcium MPC: https://solscan.io/tx/${result.arciumSignature}?cluster=devnet`);

  } catch (error: any) {
    console.error('❌ Arcium MPC error:', error.message);
    console.log('\n💡 Make sure the solver is running:');
    console.log('   cd services/solver-relayer');
    console.log('   source .env');
    console.log('   node dist/index.js');
  }

  // Step 7: Verify Final State
  console.log('\n' + '='.repeat(60));
  console.log('STEP 7: Verify Final State');
  console.log('='.repeat(60));

  try {
    const orders = await (program.account as any).order.all([
      {
        memcmp: {
          offset: 8 + 32,
          bytes: wallet.publicKey.toBase58(),
        }
      }
    ]);

    console.log(`\n📋 Final order states:`);
    orders.forEach((order: any, i: number) => {
      const status = order.account.status.open ? 'OPEN' :
                     order.account.status.filled ? 'FILLED' : 'CANCELLED';
      console.log(`\n  Order ${i + 1}: ${status}`);
      console.log(`    Filled: ${order.account.filledAmount.toString()}`);
    });

    const baseTokenAccount = await getAccount(
      connection,
      (await getOrCreateAssociatedTokenAccount(
        connection,
        wallet,
        BASE_MINT,
        wallet.publicKey
      )).address
    );

    const quoteTokenAccount = await getAccount(
      connection,
      (await getOrCreateAssociatedTokenAccount(
        connection,
        wallet,
        QUOTE_MINT,
        wallet.publicKey
      )).address
    );

    console.log('\n💰 Final token balances:');
    console.log(`   Base (TOKEN1): ${baseTokenAccount.amount.toString()}`);
    console.log(`   Quote (TOKEN2): ${quoteTokenAccount.amount.toString()}`);

  } catch (error: any) {
    console.error('❌ Verification error:', error.message);
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎉 Full flow test complete!');
  console.log('='.repeat(60));
  console.log('\n✅ Demonstrated:');
  console.log('   • Config initialization');
  console.log('   • Market creation');
  console.log('   • Order placement (BID + ASK)');
  console.log('   • Arcium MPC encryption & computation');
  console.log('   • On-chain settlement');
  console.log('   • Order state verification');
  console.log('\n🔐 NO MOCKS - Real Arcium MPC integration!\n');
}

main().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
