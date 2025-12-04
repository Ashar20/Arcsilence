//! Order matching algorithm implementation
//!
//! This is the canonical solver logic for the dark pool.
//! It will later be translated to encrypted types for Arcium,
//! but the algorithm remains the same.

use std::collections::HashMap;

/// Order side: Bid (buying) or Ask (selling)
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum OrderSide {
    Bid,
    Ask,
}

/// Order status
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum OrderStatus {
    Open,
    PartiallyFilled,
    Filled,
    Cancelled,
}

/// Order structure
///
/// Uses index instead of pubkey to reduce data size.
/// The client maps indices to actual order pubkeys.
#[derive(Debug, Clone)]
pub struct Order {
    pub index: u32,
    pub side: OrderSide,
    pub amount_in: u64,
    pub filled_amount_in: u64,
    pub min_amount_out: u64,
    pub created_at: i64,
    pub status: OrderStatus,
}

/// Fill structure representing a matched trade
#[derive(Debug, Clone)]
pub struct Fill {
    pub order_index: u32,
    pub counterparty_index: u32,
    pub amount_in: u64,
    pub amount_out: u64,
}

/// Execution plan containing matched fills
#[derive(Debug, Clone)]
pub struct ExecutionPlan {
    pub fills: Vec<Fill>,
}

/// Match orders using greedy FIFO algorithm
///
/// This is the canonical solver logic for the dark pool.
/// It implements a First-In-First-Out (FIFO) greedy matching algorithm
/// with a 1:1 price ratio.
///
/// # Algorithm
///
/// 1. Filter to OPEN orders only
/// 2. Split into BID and ASK orders
/// 3. Sort both by created_at ascending (FIFO)
/// 4. Track remaining size per order: remaining = amount_in - filled_amount_in
/// 5. While both lists have remaining liquidity:
///    - Take current bid and ask
///    - match_amount = min(remaining_bid, remaining_ask)
///    - If match_amount <= 0, advance pointer and continue
///    - Ensure match_amount >= bid.min_amount_out
///    - Emit Fill with amount_in = amount_out = match_amount
///    - Decrease remaining for both orders
///    - Move to next order when remaining hits zero
///
/// # Arguments
///
/// * `orders` - Slice of orders (all must be from the same market)
///
/// # Returns
///
/// * `ExecutionPlan` containing matched fills
///
/// # Panics
///
/// Panics if orders slice is empty (caller should handle this).
pub fn match_orders(orders: &[Order]) -> ExecutionPlan {
    if orders.is_empty() {
        return ExecutionPlan { fills: Vec::new() };
    }

    // Filter to OPEN orders only
    let open_orders: Vec<&Order> = orders
        .iter()
        .filter(|o| o.status == OrderStatus::Open)
        .collect();

    if open_orders.is_empty() {
        return ExecutionPlan { fills: Vec::new() };
    }

    // Split into bids and asks
    let mut bids: Vec<&Order> = open_orders
        .iter()
        .filter(|o| o.side == OrderSide::Bid)
        .copied()
        .collect();

    let mut asks: Vec<&Order> = open_orders
        .iter()
        .filter(|o| o.side == OrderSide::Ask)
        .copied()
        .collect();

    // Sort both by created_at ascending (FIFO)
    bids.sort_by(|a, b| a.created_at.cmp(&b.created_at));
    asks.sort_by(|a, b| a.created_at.cmp(&b.created_at));

    let mut fills = Vec::new();

    // Track remaining size per order
    let mut remaining: HashMap<u32, u64> = HashMap::new();
    for order in &open_orders {
        let rem = order
            .amount_in
            .saturating_sub(order.filled_amount_in);
        remaining.insert(order.index, rem);
    }

    let mut bid_idx = 0;
    let mut ask_idx = 0;

    // Greedy batch matcher
    while bid_idx < bids.len() && ask_idx < asks.len() {
        let bid = bids[bid_idx];
        let ask = asks[ask_idx];

        let remaining_bid = *remaining.get(&bid.index).unwrap_or(&0);
        let remaining_ask = *remaining.get(&ask.index).unwrap_or(&0);

        // Skip if either order is fully filled
        if remaining_bid == 0 {
            bid_idx += 1;
            continue;
        }
        if remaining_ask == 0 {
            ask_idx += 1;
            continue;
        }

        // Match amount is the minimum of remaining sizes
        let match_amount = remaining_bid.min(remaining_ask);

        // Basic guards
        if match_amount == 0 {
            bid_idx += 1;
            ask_idx += 1;
            continue;
        }

        // Ensure matchAmount meets bid's minimum output requirement
        if match_amount < bid.min_amount_out {
            // This bid can't be filled with current ask, skip to next bid
            bid_idx += 1;
            continue;
        }

        // Create fill
        // Bid is buying base with quote, so:
        // - bid.owner receives base (match_amount)
        // - ask.owner receives quote (match_amount)
        fills.push(Fill {
            order_index: bid.index,
            counterparty_index: ask.index,
            amount_in: match_amount,  // Quote from bid
            amount_out: match_amount, // Base from ask
        });

        // Update remaining amounts
        let new_bid_remaining = remaining_bid - match_amount;
        let new_ask_remaining = remaining_ask - match_amount;
        remaining.insert(bid.index, new_bid_remaining);
        remaining.insert(ask.index, new_ask_remaining);

        // Move to next order if fully filled
        if new_bid_remaining == 0 {
            bid_idx += 1;
        }
        if new_ask_remaining == 0 {
            ask_idx += 1;
        }
    }

    ExecutionPlan { fills }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn matches_single_bid_and_ask() {
        let orders = vec![
            Order {
                index: 0,
                side: OrderSide::Bid,
                amount_in: 100,
                filled_amount_in: 0,
                min_amount_out: 90,
                created_at: 1000,
                status: OrderStatus::Open,
            },
            Order {
                index: 1,
                side: OrderSide::Ask,
                amount_in: 100,
                filled_amount_in: 0,
                min_amount_out: 95,
                created_at: 1001,
                status: OrderStatus::Open,
            },
        ];

        let plan = match_orders(&orders);

        assert_eq!(plan.fills.len(), 1);
        let fill = &plan.fills[0];
        assert_eq!(fill.order_index, 0);
        assert_eq!(fill.counterparty_index, 1);
        assert_eq!(fill.amount_in, 100);
        assert_eq!(fill.amount_out, 100);
    }

    #[test]
    fn fifo_matching_multiple_orders() {
        // Create multiple bids and asks with different timestamps
        // Older orders should be matched first (FIFO)
        let orders = vec![
            // Older bid (should match first)
            Order {
                index: 0,
                side: OrderSide::Bid,
                amount_in: 50,
                filled_amount_in: 0,
                min_amount_out: 45,
                created_at: 1000, // Oldest
                status: OrderStatus::Open,
            },
            // Newer bid
            Order {
                index: 1,
                side: OrderSide::Bid,
                amount_in: 100,
                filled_amount_in: 0,
                min_amount_out: 90,
                created_at: 2000,
                status: OrderStatus::Open,
            },
            // Older ask (should match first)
            Order {
                index: 2,
                side: OrderSide::Ask,
                amount_in: 60,
                filled_amount_in: 0,
                min_amount_out: 55,
                created_at: 1001, // Oldest ask
                status: OrderStatus::Open,
            },
            // Newer ask
            Order {
                index: 3,
                side: OrderSide::Ask,
                amount_in: 80,
                filled_amount_in: 0,
                min_amount_out: 75,
                created_at: 2001,
                status: OrderStatus::Open,
            },
        ];

        let plan = match_orders(&orders);

        // Should match oldest bid (50) with oldest ask (60)
        // Match amount = min(50, 60) = 50
        assert_eq!(plan.fills.len(), 1);
        let fill = &plan.fills[0];
        assert_eq!(fill.order_index, 0); // Oldest bid
        assert_eq!(fill.counterparty_index, 2); // Oldest ask
        assert_eq!(fill.amount_in, 50);
        assert_eq!(fill.amount_out, 50);
    }

    #[test]
    fn respects_min_amount_out() {
        let orders = vec![
            Order {
                index: 0,
                side: OrderSide::Bid,
                amount_in: 100,
                filled_amount_in: 0,
                min_amount_out: 95, // Requires at least 95
                created_at: 1000,
                status: OrderStatus::Open,
            },
            Order {
                index: 1,
                side: OrderSide::Ask,
                amount_in: 90, // Only 90 available, less than min_amount_out
                filled_amount_in: 0,
                min_amount_out: 85,
                created_at: 1001,
                status: OrderStatus::Open,
            },
        ];

        let plan = match_orders(&orders);

        // Should not match because match_amount (90) < min_amount_out (95)
        assert_eq!(plan.fills.len(), 0);
    }

    #[test]
    fn handles_partial_fills() {
        let orders = vec![
            Order {
                index: 0,
                side: OrderSide::Bid,
                amount_in: 100,
                filled_amount_in: 0,
                min_amount_out: 50,
                created_at: 1000,
                status: OrderStatus::Open,
            },
            Order {
                index: 1,
                side: OrderSide::Ask,
                amount_in: 50, // Smaller than bid
                filled_amount_in: 0,
                min_amount_out: 45,
                created_at: 1001,
                status: OrderStatus::Open,
            },
        ];

        let plan = match_orders(&orders);

        // Should match with amount = min(100, 50) = 50
        assert_eq!(plan.fills.len(), 1);
        let fill = &plan.fills[0];
        assert_eq!(fill.amount_in, 50);
        assert_eq!(fill.amount_out, 50);
    }

    #[test]
    fn handles_already_filled_orders() {
        let orders = vec![
            Order {
                index: 0,
                side: OrderSide::Bid,
                amount_in: 100,
                filled_amount_in: 100, // Already fully filled
                min_amount_out: 90,
                created_at: 1000,
                status: OrderStatus::Open,
            },
            Order {
                index: 1,
                side: OrderSide::Ask,
                amount_in: 50,
                filled_amount_in: 0,
                min_amount_out: 45,
                created_at: 1001,
                status: OrderStatus::Open,
            },
        ];

        let plan = match_orders(&orders);

        // Should not match because bid is already fully filled
        assert_eq!(plan.fills.len(), 0);
    }

    #[test]
    fn filters_non_open_orders() {
        let orders = vec![
            Order {
                index: 0,
                side: OrderSide::Bid,
                amount_in: 100,
                filled_amount_in: 0,
                min_amount_out: 90,
                created_at: 1000,
                status: OrderStatus::Cancelled, // Not open
            },
            Order {
                index: 1,
                side: OrderSide::Ask,
                amount_in: 50,
                filled_amount_in: 0,
                min_amount_out: 45,
                created_at: 1001,
                status: OrderStatus::Filled, // Not open
            },
        ];

        let plan = match_orders(&orders);

        // Should return empty plan because no open orders
        assert_eq!(plan.fills.len(), 0);
    }

    #[test]
    fn handles_empty_input() {
        let orders = vec![];
        let plan = match_orders(&orders);
        assert_eq!(plan.fills.len(), 0);
    }

    #[test]
    fn handles_only_bids() {
        let orders = vec![
            Order {
                index: 0,
                side: OrderSide::Bid,
                amount_in: 100,
                filled_amount_in: 0,
                min_amount_out: 90,
                created_at: 1000,
                status: OrderStatus::Open,
            },
        ];

        let plan = match_orders(&orders);
        assert_eq!(plan.fills.len(), 0);
    }

    #[test]
    fn handles_only_asks() {
        let orders = vec![
            Order {
                index: 0,
                side: OrderSide::Ask,
                amount_in: 100,
                filled_amount_in: 0,
                min_amount_out: 90,
                created_at: 1000,
                status: OrderStatus::Open,
            },
        ];

        let plan = match_orders(&orders);
        assert_eq!(plan.fills.len(), 0);
    }

    #[test]
    fn matches_multiple_fills_sequentially() {
        let orders = vec![
            // First bid
            Order {
                index: 0,
                side: OrderSide::Bid,
                amount_in: 100,
                filled_amount_in: 0,
                min_amount_out: 50,
                created_at: 1000,
                status: OrderStatus::Open,
            },
            // Second bid
            Order {
                index: 1,
                side: OrderSide::Bid,
                amount_in: 50,
                filled_amount_in: 0,
                min_amount_out: 45,
                created_at: 2000,
                status: OrderStatus::Open,
            },
            // First ask (matches with first bid)
            Order {
                index: 2,
                side: OrderSide::Ask,
                amount_in: 60,
                filled_amount_in: 0,
                min_amount_out: 55,
                created_at: 1001,
                status: OrderStatus::Open,
            },
            // Second ask (matches with second bid)
            Order {
                index: 3,
                side: OrderSide::Ask,
                amount_in: 50,
                filled_amount_in: 0,
                min_amount_out: 45,
                created_at: 2001,
                status: OrderStatus::Open,
            },
        ];

        let plan = match_orders(&orders);

        // Should have 2 fills
        assert_eq!(plan.fills.len(), 2);

        // First fill: bid 0 with ask 2
        assert_eq!(plan.fills[0].order_index, 0);
        assert_eq!(plan.fills[0].counterparty_index, 2);
        assert_eq!(plan.fills[0].amount_in, 60); // min(100, 60)

        // Second fill: bid 1 with ask 3
        assert_eq!(plan.fills[1].order_index, 1);
        assert_eq!(plan.fills[1].counterparty_index, 3);
        assert_eq!(plan.fills[1].amount_in, 50); // min(50, 50)
    }
}

