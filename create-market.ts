import * as anchor from '@coral-xyz/anchor';
import { PublicKey, Keypair } from '@solana/web3.js';
import { readFileSync } from 'fs';

const PROGRAM_ID = new PublicKey('CMrfhDiq5gLBwbT3nxQvGH1UTcxtaAY9r4we2PvjbjAg');
const BASE_MINT = new PublicKey('yXJUy2a1YgKDJ5CfngRN7djwX3Dtbv85f9jUFCgutdj');
const QUOTE_MINT = new PublicKey('4eYgX7VZj4eQ5Vf5MbmzCgAwcbhkP1rSMhR5jZmdZN5H');

async function main() {
  // Load IDL
  const idlPath = './target/idl/darkpool.json';
  const idl = JSON.parse(readFileSync(idlPath, 'utf-8'));

  // Setup connection
  const connection = new anchor.web3.Connection('https://devnet.helius-rpc.com/?api-key=c10f136f-baab-46d1-a4f7-83cdf19e3fdc', 'confirmed');

  // Load wallet
  const walletPath = process.env.HOME + '/.config/solana/id.json';
  const secretKey = JSON.parse(readFileSync(walletPath, 'utf-8'));
  const wallet = Keypair.fromSecretKey(new Uint8Array(secretKey));

  console.log('Wallet:', wallet.publicKey.toString());

  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(wallet),
    { commitment: 'confirmed' }
  );

  // Override the program ID in the IDL with the actual deployed program
  const programWithCorrectId = new anchor.Program(idl as anchor.Idl, PROGRAM_ID, provider);

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

  console.log('\n=== Market Creation ===');
  console.log('Program ID:', PROGRAM_ID.toString());
  console.log('Base Token:', BASE_MINT.toString());
  console.log('Quote Token:', QUOTE_MINT.toString());
  console.log('Market PDA:', marketPda.toString());
  console.log('Config PDA:', configPda.toString());
  console.log('Base Vault:', baseVaultPda.toString());
  console.log('Quote Vault:', quoteVaultPda.toString());

  // Check if config exists
  try {
    const configAccount = await connection.getAccountInfo(configPda);
    if (!configAccount) {
      console.log('\n⚠️  Config not initialized. Initializing...');
      const initTx = await (programWithCorrectId.methods as any)
        .initializeConfig(wallet.publicKey)
        .accounts({
          config: configPda,
          payer: wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      console.log('✅ Config initialized:', initTx);
    } else {
      console.log('✅ Config already exists');
    }
  } catch (error) {
    console.error('Error checking/initializing config:', error);
  }

  // Create market
  console.log('\n📝 Creating market...');
  try {
    const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

    const tx = await (programWithCorrectId.methods as any)
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

    console.log('✅ Market created!');
    console.log('Transaction:', tx);
    console.log('');
    console.log('🎯 Market PDA:', marketPda.toString());
    console.log('');
    console.log('✅ Your .env.local is already configured correctly!');
  } catch (error: any) {
    if (error.toString().includes('already in use')) {
      console.log('✅ Market already exists!');
      console.log('Market PDA:', marketPda.toString());
    } else {
      console.error('❌ Error creating market:', error);
      throw error;
    }
  }
}

main().catch(console.error);
