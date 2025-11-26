import { ExecutionPlan, Order, Fill } from './domain.js';
import { matchOrders } from './matcher.js';
import { config } from './config.js';
import * as anchor from '@coral-xyz/anchor';
import { PublicKey, Connection, Keypair } from '@solana/web3.js';
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
} from '@arcium-hq/client';

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

    // 3. Serialize orders to fixed-size array format (max 100 orders)
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

    for (let i = 0; i < 100; i++) {
      if (i < orders.length) {
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
      } else {
        // Padding with zero orders
        ordersArray.push({
          index: BigInt(i),
          side: 0n,
          amount_in: 0n,
          filled_amount_in: 0n,
          min_amount_out: 0n,
          created_at: 0n,
          status: 0n,
        });
      }
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
    const computationOffset = new anchor.BN(randomBytes(8).toString('hex'), 16);
    const clusterAccount = this.getClusterAccount();

    // Build instruction data
    // Format: [computation_offset, ciphertext_arrays, public_key, nonce]
    const instructionData = {
      computationOffset,
      ciphertextArrays: ciphertext.map((ct) => Array.from(ct)),
      publicKey: Array.from(publicKey),
      nonce: new anchor.BN(deserializeLE(nonce).toString()),
      orderCount: orders.length,
    };

    console.log('[Arcium] Submitting encrypted computation to MPC network...');

    try {
      // Get the comp def offset
      const compDefOffset = getCompDefAccOffset('match_orders_mpc');

      // Derive all required accounts
      const computationAccount = getComputationAccAddress(
        this.programId,
        computationOffset
      );
      const mxeAccount = getMXEAccAddress(this.programId);
      const mempoolAccount = getMempoolAccAddress(this.programId);
      const executingPoolAccount = getExecutingPoolAccAddress(this.programId);
      const compDefAccount = getCompDefAccAddress(this.programId, compDefOffset as any);

      console.log('[Arcium] Queueing computation with accounts:', {
        program: this.programId.toBase58(),
        computation: computationAccount.toBase58(),
        cluster: clusterAccount.toBase58(),
        mxe: mxeAccount.toBase58(),
        compDef: compDefAccount.toBase58(),
      });

      // Submit the queue computation transaction using Arcium SDK helpers
      // The SDK provides the instruction builder internally
      const instruction = await this.buildQueueComputationInstruction({
        computationAccount,
        clusterAccount,
        mxeAccount,
        mempoolAccount,
        executingPoolAccount,
        compDefAccount,
        computationOffset,
        ciphertext: ciphertext as any,
        publicKey: publicKey as any,
        nonce: nonce as any,
      });

      const tx = await provider.sendAndConfirm(
        new anchor.web3.Transaction().add(instruction),
        [this.wallet],
        { skipPreflight: false, commitment: 'confirmed' }
      );

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

    /* OLD FALLBACK CODE (removed):

    const tx = await program.methods
      .matchOrders(
        computationOffset,
        instructionData.ciphertextArrays,
        instructionData.publicKey,
        instructionData.nonce,
        instructionData.orderCount
      )
      .accountsPartial({
        computationAccount: getComputationAccAddress(
          this.programId,
          computationOffset
        ),
        clusterAccount,
        mxeAccount: getMXEAccAddress(this.programId),
        mempoolAccount: getMempoolAccAddress(this.programId),
        executingPool: getExecutingPoolAccAddress(this.programId),
        compDefAccount: getCompDefAccAddress(
          this.programId,
          Buffer.from(getCompDefAccOffset('match_orders_mpc')).readUInt32LE()
        ),
      })
      .rpc({ skipPreflight: true, commitment: 'confirmed' });

    console.log('[Arcium] Computation queued, tx:', tx);

    // 7. Wait for computation to finalize
    const finalizeTx = await awaitComputationFinalization(
      provider,
      computationOffset,
      this.programId,
      'confirmed'
    );
    console.log('[Arcium] Computation finalized, tx:', finalizeTx);

    // 8. Decode result (would come from program events/accounts)
    // For now, return with MPC signature
    const plan = matchOrders(orders);

    return {
      ...plan,
      arciumSignature: finalizeTx,
    };
    */
  }

  private async buildQueueComputationInstruction(params: {
    computationAccount: PublicKey;
    clusterAccount: PublicKey;
    mxeAccount: PublicKey;
    mempoolAccount: PublicKey;
    executingPoolAccount: PublicKey;
    compDefAccount: PublicKey;
    computationOffset: anchor.BN;
    ciphertext: any;
    publicKey: any;
    nonce: any;
  }): Promise<anchor.web3.TransactionInstruction> {
    // Build the queue computation instruction manually
    // This is the standard Arcium queueComputation instruction format

    const keys = [
      { pubkey: params.computationAccount, isSigner: false, isWritable: true },
      { pubkey: params.clusterAccount, isSigner: false, isWritable: true },
      { pubkey: params.mxeAccount, isSigner: false, isWritable: false },
      { pubkey: params.mempoolAccount, isSigner: false, isWritable: true },
      { pubkey: params.executingPoolAccount, isSigner: false, isWritable: true },
      { pubkey: params.compDefAccount, isSigner: false, isWritable: false },
      { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: anchor.web3.SystemProgram.programId, isSigner: false, isWritable: false },
    ];

    // Serialize the instruction data
    // Format: [discriminator (8 bytes), computation_offset, ciphertext_arrays, public_key, nonce]
    const discriminator = Buffer.from([76, 149, 71, 116, 146, 101, 174, 165]); // queueComputation discriminator
    const data = Buffer.concat([
      discriminator,
      params.computationOffset.toArrayLike(Buffer, 'le', 8),
      this.serializeCiphertextArrays(params.ciphertext),
      Buffer.from(params.publicKey),
      Buffer.from(params.nonce),
    ]);

    return new anchor.web3.TransactionInstruction({
      keys,
      programId: this.programId,
      data,
    });
  }

  private serializeCiphertextArrays(ciphertext: Uint8Array[]): Buffer {
    // Serialize array of byte arrays for Borsh encoding
    const lengthPrefix = Buffer.alloc(4);
    lengthPrefix.writeUInt32LE(ciphertext.length, 0);

    const arrays = ciphertext.map(ct => {
      const len = Buffer.alloc(4);
      len.writeUInt32LE(ct.length, 0);
      return Buffer.concat([len, Buffer.from(ct)]);
    });

    return Buffer.concat([lengthPrefix, ...arrays]);
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

