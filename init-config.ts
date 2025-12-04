import { Connection, Keypair, PublicKey, SystemProgram } from '@solana/web3.js';
import { Program, AnchorProvider, Wallet } from '@coral-xyz/anchor';
import * as fs from 'fs';
import darkpoolIdl from './services/solver-relayer/src/idl/darkpool.json';

const RPC_URL = 'https://api.devnet.solana.com';
const PROGRAM_ID = new PublicKey('CMy5ru8L5nwnn4RK8TZJiCLs4FVkouV2PKPnuPCLFedB');

async function initConfig() {
  console.log('🔧 Initializing Config\n');

  // Load wallet
  const walletPath = `${process.env.HOME}/.config/solana/id.json`;
  const secretKey = JSON.parse(fs.readFileSync(walletPath, 'utf8'));
  const wallet = Keypair.fromSecretKey(Uint8Array.from(secretKey));

  console.log('Wallet:', wallet.publicKey.toBase58(), '\n');

  // Setup provider and program
  const connection = new Connection(RPC_URL, 'confirmed');
  const provider = new AnchorProvider(connection, new Wallet(wallet), {
    commitment: 'confirmed',
  });

  const idl = { ...darkpoolIdl, address: PROGRAM_ID.toBase58() } as any;
  const program = new Program(idl, provider);

  // Derive config PDA
  const [configPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('config')],
    program.programId
  );

  console.log('Config PDA:', configPDA.toBase58());

  // Check if config already exists
  try {
    const config = await program.account.config.fetch(configPDA);
    console.log('✅ Config already initialized!');
    console.log('Admin:', (config as any).admin.toBase58());
    return;
  } catch (e) {
    console.log('Config not yet initialized, creating...\n');
  }

  // Initialize config
  try {
    const tx = await program.methods
      .initialize()
      .accounts({
        config: configPDA,
        admin: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log('✅ Config initialized!');
    console.log('Transaction:', tx);
  } catch (error: any) {
    console.error('❌ Error initializing config:', error.message);
    if (error.logs) {
      console.error('Logs:', error.logs);
    }
    process.exit(1);
  }
}

initConfig().catch(console.error);
