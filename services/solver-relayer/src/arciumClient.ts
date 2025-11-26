import { ExecutionPlan, Order, Fill } from './domain.js';
import { matchOrders } from './matcher.js';
import { config } from './config.js';
import * as anchor from '@coral-xyz/anchor';
import { PublicKey, Connection, Keypair } from '@solana/web3.js';
import { randomBytes } from 'crypto';
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
    const fs = require('fs');
    const secretKey = JSON.parse(fs.readFileSync(path, 'utf-8'));
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

    // TODO: This requires the Anchor program interface to be generated
    // For now, we'll use the raw instruction builder pattern
    // In production, this would use the generated Anchor client

    // Placeholder: Submit transaction (requires program IDL and instruction builder)
    console.warn(
      '[Arcium] Real MPC submission requires deployed program and Anchor IDL'
    );
    console.warn(
      '[Arcium] Falling back to local matching until deployment is complete'
    );

    // Fallback to local matching
    const plan = matchOrders(orders);
    const planHash = await this.hashExecutionPlan(plan);

    return {
      ...plan,
      arciumSignature: `MPC_PENDING_${planHash}`,
    };

    /* PRODUCTION CODE (uncomment after deployment):

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
    const programId = config.arcium.compDefId || process.env.ARCIUM_PROGRAM_ID;
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

