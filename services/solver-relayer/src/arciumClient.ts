import { ExecutionPlan, Order, Fill } from './domain.js';
import { matchOrders } from './matcher.js';
import { config } from './config.js';

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
 * 1. Serializes orders to Arcium input format
 * 2. Encrypts inputs using Arcium SDK
 * 3. Submits encrypted computation job to Arcium network
 * 4. Waits for MPC computation to complete
 * 5. Decrypts results to ExecutionPlan
 * 6. Extracts attestation/signature from result
 */
export class RealArciumClient implements ArciumClient {
  private compDefId: string;
  private network: string;
  private apiKey?: string;

  constructor(compDefId: string, network: string = 'testnet', apiKey?: string) {
    this.compDefId = compDefId;
    this.network = network;
    this.apiKey = apiKey;
  }

  async computeExecutionPlan(orders: Order[]): Promise<ExecutionPlan> {
    if (!orders.length) {
      throw new Error('No orders provided');
    }

    const market = orders[0].market;

    // 1. Map Orders to Arcium input format
    // Use indices instead of pubkeys to reduce encrypted data size
    const orderMap = new Map<number, Order>();
    const arciumInput = orders.map((order, idx) => {
      orderMap.set(idx, order);
      return {
        index: idx,
        side: order.side === 'BID' ? 0 : 1,
        amount_in: order.amountIn.toString(),
        filled_amount_in: order.filledAmountIn.toString(),
        min_amount_out: order.minAmountOut.toString(),
        created_at: order.createdAt.toString(),
      };
    });

    // 2. Initialize Arcium client
    // TODO: Replace with actual Arcium TS SDK initialization
    // import { ArciumClient } from '@arcium/sdk';
    // const arciumClient = new ArciumClient({
    //   network: this.network,
    //   apiKey: this.apiKey,
    // });

    // 3. Encrypt and submit job
    // TODO: Replace with actual Arcium SDK calls
    // const job = await arciumClient.submitJob({
    //   compDefId: this.compDefId,
    //   inputs: {
    //     orders: arciumInput,
    //   },
    // });

    // 4. Wait for computation result
    // TODO: Replace with actual Arcium SDK calls
    // const result = await job.waitForResult();

    // 5. Decrypt result to fills
    // TODO: Replace with actual Arcium SDK decryption
    // const encryptedFills = result.decrypt();
    // const fills: Fill[] = encryptedFills.map((fill: any) => {
    //   const order = orderMap.get(fill.order_idx)!;
    //   const counterparty = orderMap.get(fill.counterparty_idx)!;
    //   return {
    //     order: order.pubkey,
    //     counterparty: counterparty.pubkey,
    //     amountIn: BigInt(fill.amount_in),
    //     amountOut: BigInt(fill.amount_out),
    //   };
    // });

    // 6. Extract attestation/signature
    // TODO: Replace with actual Arcium attestation extraction
    // const arciumSignature = result.attestation || result.proof || result.signature;

    // For now, fallback to local matching until Arcium SDK is integrated
    console.warn(
      'RealArciumClient: Using local matcher as fallback. Arcium SDK integration pending.'
    );
    const plan = matchOrders(orders);
    
    // Generate a hash-based signature for now
    const planHash = await this.hashExecutionPlan(plan);
    
    return {
      ...plan,
      arciumSignature: `ARCIUM_STUB_${planHash}`,
    };
  }

  /**
   * Hash execution plan for stub signature
   * In production, this will be replaced with Arcium's attestation
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
    if (!config.arcium.compDefId) {
      throw new Error(
        'ARCIUM_COMP_DEF_ID is required when ARCIUM_USE_REAL=true'
      );
    }
    return new RealArciumClient(
      config.arcium.compDefId,
      config.arcium.network,
      config.arcium.apiKey
    );
  }
  return new LocalArciumClient();
}

