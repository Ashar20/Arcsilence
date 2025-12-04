import { Connection, Keypair, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { Program, AnchorProvider, Wallet } from '@coral-xyz/anchor';
import {
  TOKEN_PROGRAM_ID,
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from '@solana/spl-token';
import * as fs from 'fs';
import darkpoolIdl from './services/solver-relayer/src/idl/darkpool.json';

const RPC_URL = 'https://api.devnet.solana.com';
const PROGRAM_ID = new PublicKey('CMy5ru8L5nwnn4RK8TZJiCLs4FVkouV2PKPnuPCLFedB');

async function createFreshMarket() {
  console.log('🆕 Creating Fresh Market\\n');

  // Load wallet
  const keypairPath = process.env.HOME + '/.config/solana/id.json';
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
  const wallet = Keypair.fromSecretKey(new Uint8Array(keypairData));

  console.log(`Wallet: ${wallet.publicKey.toBase58()}\\n`);

  // Create connection and provider
  const connection = new Connection(RPC_URL, 'confirmed');
  const provider = new AnchorProvider(
    connection,
    new Wallet(wallet),
    { commitment: 'confirmed' }
  );

  const idl = { ...darkpoolIdl, address: PROGRAM_ID.toBase58() } as any;
  const program = new Program(idl, provider);

  console.log('1️⃣  Creating fresh token mints...');

  // Create fresh mints
  const baseMint = await createMint(
    connection,
    wallet,
    wallet.publicKey,
    null,
    9,
    undefined,
    { commitment: 'confirmed' },
    TOKEN_PROGRAM_ID
  );
  console.log(`   Base Mint: ${baseMint.toBase58()}`);

  const quoteMint = await createMint(
    connection,
    wallet,
    wallet.publicKey,
    null,
    9,
    undefined,
    { commitment: 'confirmed' },
    TOKEN_PROGRAM_ID
  );
  console.log(`   Quote Mint: ${quoteMint.toBase58()}\\n`);

  console.log('2️⃣  Minting tokens to wallet...');

  // Get or create token accounts
  const baseTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    wallet,
    baseMint,
    wallet.publicKey
  );

  const quoteTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    wallet,
    quoteMint,
    wallet.publicKey
  );

  // Mint tokens
  await mintTo(
    connection,
    wallet,
    baseMint,
    baseTokenAccount.address,
    wallet.publicKey,
    1000_000000000, // 1000 tokens with 9 decimals
    [],
    { commitment: 'confirmed' }
  );

  await mintTo(
    connection,
    wallet,
    quoteMint,
    quoteTokenAccount.address,
    wallet.publicKey,
    10000_000000000, // 10000 tokens with 9 decimals
    [],
    { commitment: 'confirmed' }
  );

  console.log(`   Minted 1000 BASE tokens`);
  console.log(`   Minted 10000 QUOTE tokens\\n`);

  console.log('3️⃣  Creating market...');

  // Derive PDAs
  const [marketPDA] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('market'),
      baseMint.toBuffer(),
      quoteMint.toBuffer()
    ],
    program.programId
  );

  const [baseVaultPDA] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('vault'),
      Buffer.from('base'),
      baseMint.toBuffer(),
      quoteMint.toBuffer()
    ],
    program.programId
  );

  const [quoteVaultPDA] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('vault'),
      Buffer.from('quote'),
      baseMint.toBuffer(),
      quoteMint.toBuffer()
    ],
    program.programId
  );

  // Derive config PDA
  const [configPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('config')],
    program.programId
  );

  // Create market
  try {
    const tx = await program.methods
      .createMarket()
      .accounts({
        config: configPDA,
        market: marketPDA,
        baseMint: baseMint,
        quoteMint: quoteMint,
        baseVault: baseVaultPDA,
        quoteVault: quoteVaultPDA,
        admin: wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log(`   Market created!`);
    console.log(`   Transaction: ${tx}\\n`);

    await connection.confirmTransaction(tx, 'confirmed');

    console.log('✅ Fresh Market Created!\\n');
    console.log('Market Details:');
    console.log('===============');
    console.log(`Market PDA: ${marketPDA.toBase58()}`);
    console.log(`Base Mint: ${baseMint.toBase58()}`);
    console.log(`Quote Mint: ${quoteMint.toBase58()}`);
    console.log(`Base Vault: ${baseVaultPDA.toBase58()}`);
    console.log(`Quote Vault: ${quoteVaultPDA.toBase58()}\\n`);

    console.log('Copy these values to your test file!\\n');

  } catch (error: any) {
    console.error('❌ Error creating market:', error.message);
    if (error.logs) console.log('Logs:', error.logs);
  }
}

createFreshMarket().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
