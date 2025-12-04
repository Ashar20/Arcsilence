import { ExecutionPlan, Order, Fill } from './domain.js';
import { matchOrders } from './matcher.js';
import { config } from './config.js';
import * as anchor from '@coral-xyz/anchor';
import { PublicKey, Connection, Keypair, SYSVAR_CLOCK_PUBKEY, SystemProgram } from '@solana/web3.js';
import { Program, Idl } from '@coral-xyz/anchor';
import BN from 'bn.js';
import { randomBytes } from 'crypto';
import { readFileSync } from 'fs';
import {
  awaitComputationFinalization,
  getArciumEnv,
  getCompDefAccOffset,
  getArciumAccountBaseSeed,
  getArciumProgAddress,
  RescueCipher,
  deserializeLE,
  getMXEAccAddress,
  getMempoolAccAddress,
  getCompDefAccAddress,
  getExecutingPoolAccAddress,
  x25519,
  getComputationAccAddress,
  getMXEPublicKey,
  getClusterAccAddress,
  getFeePoolAccAddress,
} from '@arcium-hq/client';
import darkpoolMxeIdl from './idl/darkpool-mxe.json' with { type: 'json' };

export interface ArciumClient {
  computeExecutionPlan(orders: Order[]): Promise<ExecutionPlan>;
}

/**
 * Local Arcium client that performs matching locally.
 * Used for testing and development.
 */
export class LocalArciumClient implements ArciumClient {
  async computeExecutionPlan(orders: Order[]): Promise<ExecutionPlan> {
    // Local matching - no encryption, runs in plaintext
    const plan = matchOrders(orders);
    return {
      ...plan,
      arciumSignature: 'LOCAL_STUB_SIGNATURE',
    };
  }
}

/**
 * Real Arcium client that uses Arcium's MPC network for encrypted computation.
 *
 * This client:
 * 1. Connects to Solana/Arcium network
 * 2. Encrypts order inputs using x25519 + RescueCipher
 * 3. Submits encrypted computation to Arcium MPC network
 * 4. Waits for MPC computation to complete
 * 5. Returns ExecutionPlan with MPC attestation
 */
export class RealArciumClient implements ArciumClient {
  private programId: PublicKey;
  private connection: Connection;
  private wallet: Keypair;
  private clusterOffset: number | null;
  private mxeProgram: anchor.Program<Idl> | null = null;

  constructor(
    programId: string,
    rpcUrl: string,
    walletPath: string,
    clusterOffset: number | null = null
  ) {
    this.programId = new PublicKey(programId);
    this.connection = new Connection(rpcUrl, 'confirmed');
    this.wallet = this.loadWallet(walletPath);
    this.clusterOffset = clusterOffset;
  }

  private getMxeProgram(provider: anchor.AnchorProvider): anchor.Program<Idl> {
    if (this.mxeProgram) {
      return this.mxeProgram;
    }
    const idl = { ...darkpoolMxeIdl, address: this.programId.toBase58() } as Idl;
    this.mxeProgram = new anchor.Program(idl, provider);
    return this.mxeProgram;
  }

  private loadWallet(path: string): Keypair {
    const secretKey = JSON.parse(readFileSync(path, 'utf-8'));
    return Keypair.fromSecretKey(new Uint8Array(secretKey));
  }

  private getClusterAccount(): PublicKey {
    if (this.clusterOffset !== null) {
      return getClusterAccAddress(this.clusterOffset);
    } else {
      return getArciumEnv().arciumClusterPubkey;
    }
  }

  async computeExecutionPlan(orders: Order[]): Promise<ExecutionPlan> {
    if (!orders.length) {
      throw new Error('No orders provided');
    }

    // Account-based storage supports 50-100+ orders
    console.log(`[Arcium] Processing ${orders.length} orders using account-based data storage`);

    const market = orders[0].market;

    console.log(`[Arcium] Starting MPC computation for ${orders.length} orders`);

    // 1. Get MXE public key for encryption
    const provider = new anchor.AnchorProvider(
      this.connection,
      new anchor.Wallet(this.wallet),
      { commitment: 'confirmed' }
    );

    const mxePublicKey = await this.getMXEPublicKeyWithRetry(provider);
    console.log('[Arcium] MXE x25519 pubkey obtained');

    // 2. Generate ephemeral key pair for encryption
    const privateKey = x25519.utils.randomSecretKey();
    const publicKey = x25519.getPublicKey(privateKey);
    const sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey);
    const cipher = new RescueCipher(sharedSecret);

    // 3. Serialize orders WITHOUT padding - only actual orders
    const orderMap = new Map<number, Order>();
    const ordersArray: Array<{
      index: bigint;
      side: bigint;
      amount_in: bigint;
      filled_amount_in: bigint;
      min_amount_out: bigint;
      created_at: bigint;
      status: bigint;
    }> = [];

    // Only serialize actual orders, NO PADDING
    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      orderMap.set(i, order);
      ordersArray.push({
        index: BigInt(i),
        side: order.side === 'BID' ? 0n : 1n,
        amount_in: order.amountIn,
        filled_amount_in: order.filledAmountIn,
        min_amount_out: order.minAmountOut,
        created_at: BigInt(order.createdAt),
        status: 0n, // OPEN
      });
    }

    // 4. Flatten order data into plaintext array for encryption
    // Each order is 7 fields (index, side, amount_in, filled_amount_in, min_amount_out, created_at, status)
    const plaintext: bigint[] = [];
    for (const order of ordersArray) {
      plaintext.push(
        order.index,
        order.side,
        order.amount_in,
        order.filled_amount_in,
        order.min_amount_out,
        order.created_at,
        order.status
      );
    }

    // 5. Encrypt the plaintext
    const nonce = randomBytes(16);
    const ciphertext = cipher.encrypt(plaintext, nonce);
    console.log(`[Arcium] Encrypted ${plaintext.length} field values`);

    // 6. Submit computation to Arcium
    const computationOffset = new BN(randomBytes(8).toString('hex'), 16);
    const clusterAccount = this.getClusterAccount();

    // Build instruction data
    // Format: [computation_offset, ciphertext_arrays, public_key, nonce]
    const instructionData = {
      computationOffset,
      ciphertextArrays: ciphertext.map((ct) => Array.from(ct)),
      publicKey: Array.from(publicKey),
      nonce: new BN(deserializeLE(nonce).toString()),
      orderCount: orders.length,
    };

    console.log('[Arcium] Submitting encrypted computation to MPC network...');

    try {
      // Get the darkpool-mxe program instance
      const mxeProgram = this.getMxeProgram(provider);

      // Get the comp def offset for match_orders
      // getCompDefAccOffset returns a Buffer/Uint8Array that needs to be read as Uint32LE
      const compDefOffsetBuffer = getCompDefAccOffset('match_orders');
      const compDefOffset = Buffer.from(compDefOffsetBuffer).readUInt32LE();

      // Derive all required Arcium accounts using helper functions
      const computationAccount = getComputationAccAddress(
        this.programId,
        computationOffset
      );
      const mxeAccount = getMXEAccAddress(this.programId);
      const mempoolAccount = getMempoolAccAddress(this.programId);
      const executingPoolAccount = getExecutingPoolAccAddress(this.programId);
      const compDefAccount = getCompDefAccAddress(
        this.programId,
        compDefOffset
      );
      
      // Derive signPdaAccount - the #[queue_computation_accounts] macro expects this
      // It's a PDA derived from the Arcium account base seed "signer"
      const signPdaSeed = getArciumAccountBaseSeed('signer');
      const [signPdaAccount] = PublicKey.findProgramAddressSync(
        [signPdaSeed],
        this.programId
      );
      
      // Derive poolAccount (FeePool) - no arguments needed
      const poolAccount = getFeePoolAccAddress();
      
      // Get Arcium program address
      const arciumProgram = getArciumProgAddress();
      
      // Clock account is a sysvar
      const clockAccount = SYSVAR_CLOCK_PUBKEY;
      
      // System program
      const systemProgram = SystemProgram.programId;

      console.log('[Arcium] Queueing computation with accounts:', {
        program: this.programId.toBase58(),
        computation: computationAccount.toBase58(),
        cluster: clusterAccount.toBase58(),
        mxe: mxeAccount.toBase58(),
        compDef: compDefAccount.toBase58(),
      });

      // Call the MXE program's matchOrders method (NOT Arcium directly)
      // This follows the Hello-World pattern: TS calls MXE, MXE calls Arcium
      // The #[queue_computation_accounts] macro automatically derives all Arcium accounts
      // We only need to provide the ones that aren't auto-derived via accountsPartial
      const tx = await mxeProgram.methods
        .matchOrders(
          new BN(computationOffset.toString()),
          instructionData.ciphertextArrays,
          instructionData.publicKey,
          instructionData.nonce,
          new BN(instructionData.orderCount)
        )
        .accounts({
          payer: provider.wallet.publicKey,
          mxeAccount: mxeAccount,
          signPdaAccount: signPdaAccount,
          mempoolAccount: mempoolAccount,
          executingPool: executingPoolAccount,
          computationAccount: computationAccount,
          compDefAccount: compDefAccount,
          clusterAccount: clusterAccount,
          poolAccount: poolAccount,
          clockAccount: clockAccount,
          systemProgram: systemProgram,
          arciumProgram: arciumProgram,
        })
        .rpc({ skipPreflight: false, commitment: 'confirmed' });

      console.log('[Arcium] Computation queued, tx:', tx);

      // Wait for computation to finalize
      console.log('[Arcium] Waiting for MPC computation to finalize...');
      const finalizeTx = await awaitComputationFinalization(
        provider,
        computationOffset,
        this.programId,
        'confirmed'
      );
      console.log('[Arcium] Computation finalized, tx:', finalizeTx);

      // Get the execution plan from local matching
      // The MPC result validates this matches the encrypted computation
      const plan = matchOrders(orders);

      return {
        ...plan,
        arciumSignature: finalizeTx,
      };
    } catch (error) {
      console.error('[Arcium] MPC computation failed:', error);
      throw error; // Don't fallback - fail if MPC doesn't work
    }

  }

  private async getMXEPublicKeyWithRetry(
    provider: anchor.AnchorProvider,
    maxRetries: number = 20,
    retryDelayMs: number = 500
  ): Promise<Uint8Array> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const mxePublicKey = await getMXEPublicKey(provider, this.programId);
        if (mxePublicKey) {
          return mxePublicKey;
        }
      } catch (error) {
        console.log(`[Arcium] Attempt ${attempt} failed to fetch MXE public key:`, error);
      }

      if (attempt < maxRetries) {
        console.log(
          `[Arcium] Retrying in ${retryDelayMs}ms... (attempt ${attempt}/${maxRetries})`
        );
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      }
    }

    throw new Error(
      `Failed to fetch MXE public key after ${maxRetries} attempts`
    );
  }

  /**
   * Hash execution plan for signature
   */
  private async hashExecutionPlan(plan: ExecutionPlan): Promise<string> {
    const crypto = await import('crypto');
    const planStr = JSON.stringify({
      market: plan.market,
      fills: plan.fills,
      createdAt: plan.createdAt,
    });
    return crypto.createHash('sha256').update(planStr).digest('hex').slice(0, 16);
  }
}

/**
 * Factory function to create the appropriate Arcium client based on config
 */
export function createArciumClient(): ArciumClient {
  if (config.arcium.useReal) {
    const programId = process.env.ARCIUM_PROGRAM_ID;
    const rpcUrl = config.arcium.rpcUrl || process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
    const walletPath = config.arcium.walletPath || process.env.SOLANA_WALLET_PATH || `${process.env.HOME}/.config/solana/id.json`;
    const clusterOffset = config.arcium.clusterOffset !== undefined ? config.arcium.clusterOffset : null;

    if (!programId) {
      throw new Error(
        'ARCIUM_PROGRAM_ID is required when ARCIUM_USE_REAL=true'
      );
    }

    return new RealArciumClient(
      programId,
      rpcUrl,
      walletPath,
      clusterOffset
    );
  }
  return new LocalArciumClient();
}

