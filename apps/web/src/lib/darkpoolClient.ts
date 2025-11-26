import { AnchorProvider, Program, Idl, BN } from '@coral-xyz/anchor';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import darkpoolIdl from './darkpool.json';

export const DARKPOOL_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_DARKPOOL_PROGRAM_ID || '8HRmULeUKortoBGMFYYSimQQPEG7vAvTAwPX9BEijNA1'
);

export function getDarkpoolProgram(connection: Connection, wallet: any) {
  const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
  return new Program(darkpoolIdl as Idl, provider);
}

// PDA helpers
export function getConfigPDA(): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('config')],
    DARKPOOL_PROGRAM_ID
  );
  return pda;
}

export function getMarketPDA(baseToken: PublicKey, quoteToken: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('market'), baseToken.toBuffer(), quoteToken.toBuffer()],
    DARKPOOL_PROGRAM_ID
  );
  return pda;
}

export function getOrderPDA(market: PublicKey, owner: PublicKey, orderId: BN): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('order'),
      market.toBuffer(),
      owner.toBuffer(),
      orderId.toArrayLike(Buffer, 'le', 8),
    ],
    DARKPOOL_PROGRAM_ID
  );
  return pda;
}

// Order types
export type OrderSide = { bid: {} } | { ask: {} };
export type OrderStatus = { open: {} } | { filled: {} } | { partiallyFilled: {} } | { cancelled: {} };

export interface Order {
  pubkey: PublicKey;
  market: PublicKey;
  owner: PublicKey;
  orderId: BN;
  side: OrderSide;
  amountIn: BN;
  filledAmountIn: BN;
  minAmountOut: BN;
  status: OrderStatus;
  createdAt: BN;
}

// Helper to parse order side
export function getOrderSideString(side: OrderSide): 'BID' | 'ASK' {
  if ('bid' in side) return 'BID';
  if ('ask' in side) return 'ASK';
  return 'BID';
}

// Helper to parse order status
export function getOrderStatusString(status: OrderStatus): string {
  if ('open' in status) return 'OPEN';
  if ('filled' in status) return 'FILLED';
  if ('partiallyFilled' in status) return 'PARTIALLY_FILLED';
  if ('cancelled' in status) return 'CANCELLED';
  return 'UNKNOWN';
}

// Fetch orders for a user
export async function fetchUserOrders(
  program: Program,
  owner: PublicKey
): Promise<Order[]> {
  try {
    const accounts = await (program.account as any).order.all([
      {
        memcmp: {
          offset: 8 + 32, // discriminator + market pubkey
          bytes: owner.toBase58(),
        },
      },
    ]);

    return accounts.map((acc: any) => ({
      pubkey: acc.publicKey,
      ...acc.account,
    }));
  } catch (error) {
    console.error('Error fetching user orders:', error);
    return [];
  }
}

// Fetch orders for a market
export async function fetchMarketOrders(
  program: Program,
  market: PublicKey
): Promise<Order[]> {
  try {
    const accounts = await (program.account as any).order.all([
      {
        memcmp: {
          offset: 8, // discriminator
          bytes: market.toBase58(),
        },
      },
    ]);

    return accounts.map((acc: any) => ({
      pubkey: acc.publicKey,
      ...acc.account,
    }));
  } catch (error) {
    console.error('Error fetching market orders:', error);
    return [];
  }
}

// Place order
export async function placeOrder(
  program: Program,
  market: PublicKey,
  side: 'BID' | 'ASK',
  amountIn: BN,
  minAmountOut: BN,
  ownerTokenAccount: PublicKey
): Promise<string> {
  const owner = program.provider.publicKey!;

  // Get next order ID (in real app, fetch from on-chain counter)
  const orderId = new BN(Date.now());
  const orderPDA = getOrderPDA(market, owner, orderId);

  const sideEnum = side === 'BID' ? { bid: {} } : { ask: {} };

  const tx = await (program.methods as any)
    .placeOrder(orderId, sideEnum, amountIn, minAmountOut)
    .accounts({
      order: orderPDA,
      market,
      owner,
      ownerTokenAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc({ skipPreflight: false, commitment: 'confirmed' });

  return tx;
}

// Cancel order
export async function cancelOrder(
  program: Program,
  orderPubkey: PublicKey,
  market: PublicKey,
  ownerTokenAccount: PublicKey
): Promise<string> {
  const owner = program.provider.publicKey!;

  const tx = await (program.methods as any)
    .cancelOrder()
    .accounts({
      order: orderPubkey,
      market,
      owner,
      ownerTokenAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc({ skipPreflight: false, commitment: 'confirmed' });

  return tx;
}
