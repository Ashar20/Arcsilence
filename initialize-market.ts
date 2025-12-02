import { Connection, Keypair, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { Program, AnchorProvider, Wallet, web3 } from '@coral-xyz/anchor';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import * as fs from 'fs';
import idl from './target/idl/darkpool.json';

const RPC_URL = 'https://api.devnet.solana.com';
const PROGRAM_ID = new PublicKey('CMy5ru8L5nwnn4RK8TZJiCLs4FVkouV2PKPnuPCLFedB');

// Token mints from .env.local
const BASE_TOKEN_MINT = new PublicKey('yXJUy2a1YgKDJ5CfngRN7djwX3Dtbv85f9jUFCgutdj');
const QUOTE_TOKEN_MINT = new PublicKey('4eYgX7VZj4eQ5Vf5MbmzCgAwcbhkP1rSMhR5jZmdZN5H');

async function initializeMarket() {
  console.log('Initializing darkpool config and creating market...\n');

  // Load wallet
  const keypairPath = process.env.HOME + '/.config/solana/id.json';
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
  const wallet = Keypair.fromSecretKey(new Uint8Array(keypairData));

  console.log(`Using wallet: ${wallet.publicKey.toBase58()}`);

  // Create connection and provider
  const connection = new Connection(RPC_URL, 'confirmed');
  const provider = new AnchorProvider(
    connection,
    new Wallet(wallet),
    { commitment: 'confirmed' }
  );

  // Load program
  const program = new Program(idl as any, provider);
  console.log(`Program ID: ${program.programId.toBase58()}`);

  // Derive PDAs
  const [configPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('config')],
    program.programId
  );

  const [marketPDA] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('market'),
      BASE_TOKEN_MINT.toBuffer(),
      QUOTE_TOKEN_MINT.toBuffer()
    ],
    program.programId
  );

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

  console.log(`\nPDAs derived:`);
  console.log(`Config: ${configPDA.toBase58()}`);
  console.log(`Market: ${marketPDA.toBase58()}`);
  console.log(`Base Vault: ${baseVaultPDA.toBase58()}`);
  console.log(`Quote Vault: ${quoteVaultPDA.toBase58()}`);

  // Check if config already exists
  console.log('\n1. Checking if config exists...');
  const configAccount = await connection.getAccountInfo(configPDA);

  if (configAccount) {
    console.log('   ✅ Config already initialized');
  } else {
    console.log('   Config not found, initializing...');

    try {
      const tx = await program.methods
        .initializeConfig(wallet.publicKey)
        .accounts({
          config: configPDA,
          payer: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log('   ✅ Config initialized!');
      console.log(`   Transaction: ${tx}`);

      // Wait for confirmation
      await connection.confirmTransaction(tx, 'confirmed');
    } catch (error: any) {
      console.log('   ❌ Error initializing config:', error.message);
      if (error.logs) {
        console.log('   Logs:', error.logs);
      }
      process.exit(1);
    }
  }

  // Check if market already exists
  console.log('\n2. Checking if market exists...');
  const marketAccount = await connection.getAccountInfo(marketPDA);

  if (marketAccount) {
    console.log('   ✅ Market already exists');
  } else {
    console.log('   Market not found, creating...');

    try {
      const tx = await program.methods
        .createMarket(BASE_TOKEN_MINT, QUOTE_TOKEN_MINT)
        .accounts({
          config: configPDA,
          market: marketPDA,
          admin: wallet.publicKey,
          baseMint: BASE_TOKEN_MINT,
          quoteMint: QUOTE_TOKEN_MINT,
          baseVault: baseVaultPDA,
          quoteVault: quoteVaultPDA,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log('   ✅ Market created!');
      console.log(`   Transaction: ${tx}`);

      // Wait for confirmation
      await connection.confirmTransaction(tx, 'confirmed');
    } catch (error: any) {
      console.log('   ❌ Error creating market:', error.message);
      if (error.logs) {
        console.log('   Logs:', error.logs);
      }
      process.exit(1);
    }
  }

  console.log('\n✅ Setup complete!');
  console.log('\n📝 Update your apps/web/.env.local with:');
  console.log(`NEXT_PUBLIC_MARKET_PUBKEY=${marketPDA.toBase58()}`);
  console.log(`\nMarket is ready to use!`);
  console.log(`Base Token: ${BASE_TOKEN_MINT.toBase58()}`);
  console.log(`Quote Token: ${QUOTE_TOKEN_MINT.toBase58()}`);
}

initializeMarket().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
