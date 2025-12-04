import { ExecutionPlan, Fill, Order } from './domain.js';

/**
 * Order matching algorithm
 *
 * This matcher must stay semantically identical to encrypted-ixs::match_orders in Rust.
 * See encrypted-ixs/MATCHING_SPEC.md for the canonical algorithm specification.
 *
 * The Rust implementation in encrypted-ixs/src/matching.rs is the source of truth.
 * Any changes to matching logic must be made there first, then ported here.
 */
export function matchOrders(orders: Order[]): ExecutionPlan {
  if (orders.length === 0) {
    throw new Error('No orders provided');
  }

  // Guard: all orders must be in the same market
  const market = orders[0].market;
  for (const order of orders) {
    if (order.market !== market) {
      throw new Error(`Orders from different markets: ${order.market} vs ${market}`);
    }
  }

  // Filter to OPEN orders only
  const openOrders = orders.filter((o) => o.status === 'OPEN');

  if (openOrders.length === 0) {
    return {
      market,
      fills: [],
      createdAt: new Date().toISOString(),
      arciumSignature: 'TODO_ARCIUM_SIG',
    };
  }

  // Split into bids and asks
  const bids = openOrders
    .filter((o) => o.side === 'BID')
    .sort((a, b) => {
      // Sort by createdAt ascending (FIFO)
      if (a.createdAt < b.createdAt) return -1;
      if (a.createdAt > b.createdAt) return 1;
      return 0;
    });

  const asks = openOrders
    .filter((o) => o.side === 'ASK')
    .sort((a, b) => {
      // Sort by createdAt ascending (FIFO)
      if (a.createdAt < b.createdAt) return -1;
      if (a.createdAt > b.createdAt) return 1;
      return 0;
    });

  const fills: Fill[] = [];

  // Track remaining size per order
  const remaining = new Map<string, bigint>();
  for (const order of openOrders) {
    remaining.set(order.pubkey, order.amountIn - order.filledAmountIn);
  }

  let bidIdx = 0;
  let askIdx = 0;

  // Greedy batch matcher
  while (bidIdx < bids.length && askIdx < asks.length) {
    const bid = bids[bidIdx];
    const ask = asks[askIdx];

    const remainingBid = remaining.get(bid.pubkey) || 0n;
    const remainingAsk = remaining.get(ask.pubkey) || 0n;

    // Skip if either order is fully filled
    if (remainingBid <= 0n) {
      bidIdx++;
      continue;
    }
    if (remainingAsk <= 0n) {
      askIdx++;
      continue;
    }

    // Match amount is the minimum of remaining sizes
    const matchAmount = remainingBid < remainingAsk ? remainingBid : remainingAsk;

    // Basic guards
    if (matchAmount <= 0n) {
      bidIdx++;
      askIdx++;
      continue;
    }

    // Ensure matchAmount meets bid's minimum output requirement
    if (matchAmount < bid.minAmountOut) {
      // This bid can't be filled with current ask, skip to next bid
      bidIdx++;
      continue;
    }

    // Create fills
    // Bid is buying base with quote, so:
    // - bid.owner receives base (matchAmount)
    // - ask.owner receives quote (matchAmount)
    fills.push({
      order: bid.pubkey,
      counterparty: ask.pubkey,
      amountIn: matchAmount, // Quote from bid
      amountOut: matchAmount, // Base from ask
      orderOwner: bid.owner,
      counterpartyOwner: ask.owner,
    });

    // Update remaining amounts
    remaining.set(bid.pubkey, remainingBid - matchAmount);
    remaining.set(ask.pubkey, remainingAsk - matchAmount);

    // Move to next order if fully filled
    if (remaining.get(bid.pubkey)! <= 0n) {
      bidIdx++;
    }
    if (remaining.get(ask.pubkey)! <= 0n) {
      askIdx++;
    }
  }

  return {
    market,
    fills,
    createdAt: new Date().toISOString(),
    arciumSignature: 'TODO_ARCIUM_SIG',
  };
}

