import { AnchorProvider, Program, Idl } from '@coral-xyz/anchor';
import BN from 'bn.js';
import { Connection, Keypair, PublicKey, AccountMeta } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';
import fs from 'fs';
import { config } from './config.js';
import { ExecutionPlan, Order, OrderStatus, OrderSide } from './domain.js';

// Load the generated IDL
import darkpoolIdl from './idl/darkpool.json' with { type: 'json' };

let programSingleton: Program<Idl> | null = null;

export function getProgram(): Program<Idl> {
  if (programSingleton) return programSingleton;

  const connection = new Connection(config.rpcUrl, 'confirmed');
  const secret = JSON.parse(fs.readFileSync(config.adminKeypairPath, 'utf8'));
  const adminKeypair = Keypair.fromSecretKey(Uint8Array.from(secret));

  const wallet = {
    publicKey: adminKeypair.publicKey,
    signTransaction: async (tx: any) => {
      tx.partialSign(adminKeypair);
      return tx;
    },
    signAllTransactions: async (txs: any[]) => {
      txs.forEach((tx) => tx.partialSign(adminKeypair));
      return txs;
    },
  };

  const provider = new AnchorProvider(connection, wallet as any, {
    preflightCommitment: 'confirmed',
  });

  // Use the imported IDL and override the address with config.programId
  // This makes the program ID dynamic instead of relying on the hardcoded IDL address
  const idl = { ...darkpoolIdl, address: config.programId } as Idl;

  programSingleton = new Program(idl, provider);

  return programSingleton;
}

// Helper to map Anchor OrderSide enum to domain type
function mapOrderSide(side: any): OrderSide {
  if (side.bid !== undefined) return 'BID';
  if (side.ask !== undefined) return 'ASK';
  throw new Error(`Unknown order side: ${JSON.stringify(side)}`);
}

// Helper to map Anchor OrderStatus enum to domain type
function mapOrderStatus(status: any): OrderStatus {
  if (status.open !== undefined) return 'OPEN';
  if (status.partiallyFilled !== undefined) return 'PARTIALLY_FILLED';
  if (status.filled !== undefined) return 'FILLED';
  if (status.cancelled !== undefined) return 'CANCELLED';
  throw new Error(`Unknown order status: ${JSON.stringify(status)}`);
}

export async function fetchOpenOrdersForMarket(
  marketPubkey: string
): Promise<Order[]> {
  const program = getProgram();
  const marketPk = new PublicKey(marketPubkey);

  // TODO: Use memcmp filter for better performance
  // For now, fetch all orders and filter in JS
  // The market field offset in Order account is: 8 (discriminator) + 32 (owner) = 40
  // But we'll fetch all and filter for simplicity in MVP
  let ordersRaw: any[];
  try {
    ordersRaw = await (program.account as any).order.all();
  } catch (error: any) {
    console.error('Error fetching all orders:', error.message);
    // If we can't fetch orders due to incompatible accounts, return empty array
    return [];
  }

  // Filter by market and status, skipping any incompatible accounts
  const openOrders: Order[] = [];
  for (const acc of ordersRaw) {
    try {
      const order = acc.account as any;
      const orderMarket = new PublicKey(order.market);

      if (orderMarket.equals(marketPk) && mapOrderStatus(order.status) === 'OPEN') {
        openOrders.push({
          pubkey: acc.publicKey.toString(),
          owner: new PublicKey(order.owner).toString(),
          market: new PublicKey(order.market).toString(),
          side: mapOrderSide(order.side),
          amountIn: BigInt(order.amountIn.toString()),
          filledAmountIn: BigInt(order.filledAmountIn.toString()),
          minAmountOut: BigInt(order.minAmountOut.toString()),
          status: mapOrderStatus(order.status),
          createdAt: BigInt(order.createdAt.toString()),
        });
      }
    } catch (error: any) {
      // Skip incompatible order accounts (e.g., old account structure)
      console.log(`⚠️  Skipping incompatible order account ${acc.publicKey?.toString() || 'unknown'}: ${error.message}`);
      continue;
    }
  }

  return openOrders;
}

export async function submitExecutionPlan(
  plan: ExecutionPlan
): Promise<string> {
  const program = getProgram();
  const marketPk = new PublicKey(plan.market);

  // Fetch market account to get vault addresses
  const marketAccount = await (program.account as any).market.fetch(marketPk);
  const baseVault = new PublicKey(marketAccount.baseVault);
  const quoteVault = new PublicKey(marketAccount.quoteVault);
  const baseMint = new PublicKey(marketAccount.baseMint);
  const quoteMint = new PublicKey(marketAccount.quoteMint);

  // Get config PDA
  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('config')],
    program.programId
  );

  // Transform fills to Anchor format
  const anchorFills = plan.fills.map((f) => ({
    order: new PublicKey(f.order),
    counterparty: new PublicKey(f.counterparty),
    amountIn: new BN(f.amountIn.toString()),
    amountOut: new BN(f.amountOut.toString()),
  }));

  // Build remaining accounts array
  // Order: [base_vault, quote_vault, market, token_program, then for each fill:
  //  order_account, counterparty_order_account, order_owner_base_account, 
  //  order_owner_quote_account, counterparty_owner_base_account, counterparty_owner_quote_account]
  const remainingAccounts: AccountMeta[] = [
    // First 4 accounts: vaults, market, token_program
    {
      pubkey: baseVault,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: quoteVault,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: marketPk,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: TOKEN_PROGRAM_ID,
      isSigner: false,
      isWritable: false,
    },
  ];

  for (const fill of plan.fills) {
    // Use pre-populated owner addresses from the execution plan
    // This avoids fetching potentially incompatible order accounts
    const orderOwner = new PublicKey(fill.orderOwner);
    const counterpartyOwner = new PublicKey(fill.counterpartyOwner);

    // Derive owner token accounts
    // TODO: These should be passed or derived more robustly
    // For MVP, we'll need to fetch them or derive them
    // Assuming users have associated token accounts
    const orderOwnerBase = await getAssociatedTokenAddress(
      baseMint,
      orderOwner
    );
    const orderOwnerQuote = await getAssociatedTokenAddress(
      quoteMint,
      orderOwner
    );
    const counterpartyOwnerBase = await getAssociatedTokenAddress(
      baseMint,
      counterpartyOwner
    );
    const counterpartyOwnerQuote = await getAssociatedTokenAddress(
      quoteMint,
      counterpartyOwner
    );

    // Add accounts in the order expected by settle_batch
    remainingAccounts.push(
      {
        pubkey: new PublicKey(fill.order),
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: new PublicKey(fill.counterparty),
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: orderOwnerBase,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: orderOwnerQuote,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: counterpartyOwnerBase,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: counterpartyOwnerQuote,
        isSigner: false,
        isWritable: true,
      }
    );
  }

  // Call settle_batch
  // Note: vaults, market, and token_program are now in remaining_accounts
  const txSig = await program.methods
    .settleBatch(anchorFills, Buffer.from(plan.arciumSignature, 'utf8'))
    .accounts({
      config: configPda,
      admin: (program.provider as AnchorProvider).wallet.publicKey,
      market: marketPk, // Still needed for validation, but also in remaining_accounts
    })
    .remainingAccounts(remainingAccounts)
    .rpc();

  return txSig;
}

/**
 * Clean up filled orders by cancelling them and reclaiming rent
 * This should be called after successful settlement
 */
export async function cleanupFilledOrders(
  plan: ExecutionPlan
): Promise<{ closed: number; failed: number }> {
  const program = getProgram();
  const marketPk = new PublicKey(plan.market);

  // Fetch market account to get mint addresses and vaults
  const marketAccount = await (program.account as any).market.fetch(marketPk);
  const baseMint = new PublicKey(marketAccount.baseMint);
  const quoteMint = new PublicKey(marketAccount.quoteMint);
  const baseVault = new PublicKey(marketAccount.baseVault);
  const quoteVault = new PublicKey(marketAccount.quoteVault);

  console.log(`🧹 Cleaning up ${plan.fills.length} filled orders...`);

  let closed = 0;
  let failed = 0;

  for (const fill of plan.fills) {
    try {
      const orderPubkey = new PublicKey(fill.order);

      // Fetch order to check if it's fully filled
      const orderAccount = await (program.account as any).order.fetch(
        orderPubkey
      );

      // Check if order is fully filled
      const amountIn = new BN(orderAccount.amountIn.toString());
      const filledAmountIn = new BN(orderAccount.filledAmountIn.toString());

      if (!filledAmountIn.eq(amountIn)) {
        // Order not fully filled, skip cleanup
        continue;
      }

      // Order is fully filled, close it
      const ownerPubkey = new PublicKey(orderAccount.owner);

      // Get user token accounts
      const userBaseAccount = await getAssociatedTokenAddress(
        baseMint,
        ownerPubkey
      );
      const userQuoteAccount = await getAssociatedTokenAddress(
        quoteMint,
        ownerPubkey
      );

      await program.methods
        .cancelOrder()
        .accounts({
          order: orderPubkey,
          owner: ownerPubkey,
          market: marketPk,
          userBaseAccount,
          userQuoteAccount,
          baseVault,
          quoteVault,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      console.log(`  ✅ Closed filled order: ${fill.order.slice(0, 8)}...`);
      closed++;

      // Wait a bit to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 300));
    } catch (error: any) {
      console.log(
        `  ⚠️  Failed to close order ${fill.order.slice(0, 8)}...: ${
          error.message
        }`
      );
      failed++;
    }
  }

  console.log(`🧹 Cleanup complete: ${closed} closed, ${failed} failed`);
  return { closed, failed };
}

