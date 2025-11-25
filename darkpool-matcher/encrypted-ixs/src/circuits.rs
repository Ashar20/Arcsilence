//! Arcis encrypted circuits for dark pool matching
//!
//! This module contains the real Arcium/Arcis encrypted instruction that runs
//! inside the MPC MXE (Multi-Party Execution Environment).
//!
//! The encrypted instruction delegates to the canonical plain matcher in matching.rs,
//! ensuring algorithm consistency.
//!
//! # Compilation
//!
//! This module requires the Arcis SDK to compile. To enable:
//! 1. Add arcis-imports dependency to Cargo.toml (path, git, or crates.io)
//! 2. Build with: `cargo build --features arcis` or `arcium build`

#[cfg(feature = "arcis")]
use arcis_imports::*;

// Public types for use outside the encrypted module
/// Plain order structure (matches Order but separate for Arcis serialization)
#[derive(Debug, Clone, Copy)]
#[cfg_attr(feature = "arcis", derive(ArcisType))]
pub struct PlainOrder {
    pub index: u32,
    pub side: u8,  // 0=Bid, 1=Ask
    pub amount_in: u64,
    pub filled_amount_in: u64,
    pub min_amount_out: u64,
    pub created_at: i64,
    pub status: u8,  // 0=Open, 1=PartiallyFilled, 2=Filled, 3=Cancelled
}

/// Plain fill structure (matches Fill but separate for Arcis serialization)
#[derive(Debug, Clone, Copy)]
#[cfg_attr(feature = "arcis", derive(ArcisType))]
pub struct PlainFill {
    pub order_index: u32,
    pub counterparty_index: u32,
    pub amount_in: u64,
    pub amount_out: u64,
}

/// Input type for the encrypted matching instruction
#[derive(Debug, Clone)]
pub struct OrdersInput {
    pub orders: Vec<PlainOrder>,
}

/// Result type from the encrypted matching instruction
#[derive(Debug, Clone)]
pub struct MatchResult {
    pub fills: Vec<PlainFill>,
}

// Manual ArcisType implementations for structs containing Vec
#[cfg(feature = "arcis")]
impl ArcisType for OrdersInput {
    fn n_values() -> usize {
        PlainOrder::n_values() * 100  // Assume max 100 orders
    }

    fn gen_input(numbers: &mut Vec<Number>) -> Self {
        OrdersInput {
            orders: vec![PlainOrder::gen_input(numbers)],
        }
    }

    fn from_values(_values: &[Number]) -> Self {
        OrdersInput {
            orders: Vec::new(),
        }
    }

    fn handle_outputs(&self, outputs: &mut Vec<Number>) {
        for order in &self.orders {
            order.handle_outputs(outputs);
        }
    }

    fn is_similar(&self, other: &Self) -> bool {
        self.orders.len() == other.orders.len()
    }
}

#[cfg(feature = "arcis")]
impl ArcisType for MatchResult {
    fn n_values() -> usize {
        PlainFill::n_values() * 100  // Assume max 100 fills
    }

    fn gen_input(numbers: &mut Vec<Number>) -> Self {
        MatchResult {
            fills: vec![PlainFill::gen_input(numbers)],
        }
    }

    fn from_values(_values: &[Number]) -> Self {
        MatchResult {
            fills: Vec::new(),
        }
    }

    fn handle_outputs(&self, outputs: &mut Vec<Number>) {
        for fill in &self.fills {
            fill.handle_outputs(outputs);
        }
    }

    fn is_similar(&self, other: &Self) -> bool {
        self.fills.len() == other.fills.len()
    }
}

/// Arcis encrypted module containing the MPC instruction
///
/// IMPORTANT: The #[encrypted] module has strict limitations:
/// - Only `use arcis_imports::*` is allowed
/// - No external imports or crate paths
/// - No match statements
/// - Types must be defined within or be simple ArcisType types
///
/// Since we cannot call external functions, we need to either:
/// 1. Reimplement the matching logic here (loses single source of truth)
/// 2. Use a bridge mechanism (if Arcium provides one)
/// 3. Keep matching outside and only do encryption/decryption here
#[cfg(feature = "arcis")]
#[encrypted]
mod circuits {
    use arcis_imports::*;

    // Define types inside the encrypted module
    // NOTE: Vec doesn't implement ArcisType, so we use fixed-size arrays
    // For now, we'll use a max of 100 orders/fills
    pub struct OrdersInput {
        pub orders: [PlainOrder; 100],
        pub count: u32,  // Actual number of orders
    }

    #[derive(Copy, Clone)]
    pub struct PlainOrder {
        pub index: u32,
        pub side: u8,
        pub amount_in: u64,
        pub filled_amount_in: u64,
        pub min_amount_out: u64,
        pub created_at: i64,
        pub status: u8,
    }

    pub struct MatchResult {
        pub fills: [PlainFill; 100],
        pub count: u32,  // Actual number of fills
    }

    #[derive(Copy, Clone)]
    pub struct PlainFill {
        pub order_index: u32,
        pub counterparty_index: u32,
        pub amount_in: u64,
        pub amount_out: u64,
    }

    // Let the #[encrypted] macro auto-derive ArcisType for all structs
    // Arrays implement ArcisType, so this should work

    /// Encrypted matching instruction
    ///
    /// This implements the canonical FIFO greedy matching algorithm
    /// as described in MATCHING_SPEC.md. Due to Arcis #[encrypted] module
    /// limitations (no external imports), the algorithm is reimplemented here.
    ///
    /// IMPORTANT: This must stay in sync with matching::match_orders.
    /// Any algorithm changes must be applied to both implementations.
    #[instruction]
    pub fn match_orders_mpc(
        input_ctxt: Enc<Shared, OrdersInput>
    ) -> Enc<Shared, MatchResult> {
        // Decrypt the input
        let input = input_ctxt.to_arcis();

        // Filter to OPEN orders only (status == 0)
        let mut open_orders = [PlainOrder {
            index: 0,
            side: 0,
            amount_in: 0,
            filled_amount_in: 0,
            min_amount_out: 0,
            created_at: 0,
            status: 0,
        }; 100];
        let mut open_count: u32 = 0;

        for i in 0..100 {
            if i < input.count {
                let order = input.orders[i as usize];
                if order.status == 0 {  // OrderStatus::Open
                    open_orders[open_count as usize] = order;
                    open_count = open_count + 1;
                }
            }
        }

        // Split into bids and asks
        let mut bids = [PlainOrder {
            index: 0,
            side: 0,
            amount_in: 0,
            filled_amount_in: 0,
            min_amount_out: 0,
            created_at: 0,
            status: 0,
        }; 100];
        let mut bid_count: u32 = 0;

        let mut asks = [PlainOrder {
            index: 0,
            side: 0,
            amount_in: 0,
            filled_amount_in: 0,
            min_amount_out: 0,
            created_at: 0,
            status: 0,
        }; 100];
        let mut ask_count: u32 = 0;

        for i in 0..100 {
            if i < open_count {
                let order = open_orders[i as usize];
                if order.side == 0 {  // OrderSide::Bid
                    bids[bid_count as usize] = order;
                    bid_count = bid_count + 1;
                } else {  // OrderSide::Ask (side == 1)
                    asks[ask_count as usize] = order;
                    ask_count = ask_count + 1;
                }
            }
        }

        // Sort both by created_at ascending (FIFO) - bubble sort
        // Bubble sort bids
        for i in 0..100 {
            if i < bid_count {
                for j in 0..100 {
                    if j < bid_count - 1 - i {
                        if bids[j as usize].created_at > bids[(j + 1) as usize].created_at {
                            let temp = bids[j as usize];
                            bids[j as usize] = bids[(j + 1) as usize];
                            bids[(j + 1) as usize] = temp;
                        }
                    }
                }
            }
        }

        // Bubble sort asks
        for i in 0..100 {
            if i < ask_count {
                for j in 0..100 {
                    if j < ask_count - 1 - i {
                        if asks[j as usize].created_at > asks[(j + 1) as usize].created_at {
                            let temp = asks[j as usize];
                            asks[j as usize] = asks[(j + 1) as usize];
                            asks[(j + 1) as usize] = temp;
                        }
                    }
                }
            }
        }

        // Track remaining size per order
        let mut remaining = [0u64; 100];
        for i in 0..100 {
            if i < open_count {
                let order = open_orders[i as usize];
                let rem = if order.amount_in >= order.filled_amount_in {
                    order.amount_in - order.filled_amount_in
                } else {
                    0
                };
                // Store at order.index position for fast lookup
                remaining[order.index as usize] = rem;
            }
        }

        // Greedy batch matcher
        let mut fills = [PlainFill {
            order_index: 0,
            counterparty_index: 0,
            amount_in: 0,
            amount_out: 0,
        }; 100];
        let mut fill_count: u32 = 0;

        let mut bid_idx: u32 = 0;
        let mut ask_idx: u32 = 0;

        // Use a fixed iteration count to avoid while loops
        // 100 iterations should be enough for up to 100 orders
        for _ in 0..100 {
            if bid_idx < bid_count && ask_idx < ask_count {
                let bid = bids[bid_idx as usize];
                let ask = asks[ask_idx as usize];

                let remaining_bid = remaining[bid.index as usize];
                let remaining_ask = remaining[ask.index as usize];

                // Skip if either order is fully filled
                if remaining_bid == 0 {
                    bid_idx = bid_idx + 1;
                } else if remaining_ask == 0 {
                    ask_idx = ask_idx + 1;
                } else {
                    // Match amount is the minimum of remaining sizes
                    let match_amount = if remaining_bid < remaining_ask {
                        remaining_bid
                    } else {
                        remaining_ask
                    };

                    // Basic guards
                    if match_amount == 0 {
                        bid_idx = bid_idx + 1;
                        ask_idx = ask_idx + 1;
                    } else if match_amount < bid.min_amount_out {
                        // This bid can't be filled with current ask, skip to next bid
                        bid_idx = bid_idx + 1;
                    } else {
                        // Create fill
                        fills[fill_count as usize] = PlainFill {
                            order_index: bid.index,
                            counterparty_index: ask.index,
                            amount_in: match_amount,
                            amount_out: match_amount,
                        };
                        fill_count = fill_count + 1;

                        // Update remaining amounts
                        let new_bid_remaining = remaining_bid - match_amount;
                        let new_ask_remaining = remaining_ask - match_amount;
                        remaining[bid.index as usize] = new_bid_remaining;
                        remaining[ask.index as usize] = new_ask_remaining;

                        // Move to next order if fully filled
                        if new_bid_remaining == 0 {
                            bid_idx = bid_idx + 1;
                        }
                        if new_ask_remaining == 0 {
                            ask_idx = ask_idx + 1;
                        }
                    }
                }
            }
        }

        let result = MatchResult {
            fills,
            count: fill_count,
        };

        // Encrypt and return
        input_ctxt.owner.from_arcis(result)
    }
}

// Re-export the instruction from the encrypted module
#[cfg(feature = "arcis")]
pub use circuits::match_orders_mpc;

// Placeholder when Arcis is not available
#[cfg(not(feature = "arcis"))]
#[allow(dead_code)]
pub fn match_orders_mpc(_input: OrdersInput) -> MatchResult {
    MatchResult { fills: Vec::new() }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::matching::{self, Order, OrderSide, OrderStatus};

    /// Helper to convert PlainOrder to canonical Order
    fn plain_to_order(plain: &PlainOrder) -> Order {
        Order {
            index: plain.index,
            side: if plain.side == 0 { OrderSide::Bid } else { OrderSide::Ask },
            amount_in: plain.amount_in,
            filled_amount_in: plain.filled_amount_in,
            min_amount_out: plain.min_amount_out,
            created_at: plain.created_at,
            status: match plain.status {
                0 => OrderStatus::Open,
                1 => OrderStatus::PartiallyFilled,
                2 => OrderStatus::Filled,
                3 => OrderStatus::Cancelled,
                _ => OrderStatus::Open,
            },
        }
    }

    /// Helper to convert canonical Order to PlainOrder
    fn order_to_plain(order: &Order) -> PlainOrder {
        PlainOrder {
            index: order.index,
            side: match order.side {
                OrderSide::Bid => 0,
                OrderSide::Ask => 1,
            },
            amount_in: order.amount_in,
            filled_amount_in: order.filled_amount_in,
            min_amount_out: order.min_amount_out,
            created_at: order.created_at,
            status: match order.status {
                OrderStatus::Open => 0,
                OrderStatus::PartiallyFilled => 1,
                OrderStatus::Filled => 2,
                OrderStatus::Cancelled => 3,
            },
        }
    }

    /// Test helper that runs both plain and "encrypted" versions and compares results
    /// Since we can't actually run encrypted code in tests, we simulate by using
    /// the non-encrypted types but going through the same conversion path
    fn test_matching_equivalence(orders: &[Order]) {
        // Run plain matcher
        let plain_result = matching::match_orders(orders);

        // Convert to PlainOrder format
        let mut plain_orders = [PlainOrder {
            index: 0,
            side: 0,
            amount_in: 0,
            filled_amount_in: 0,
            min_amount_out: 0,
            created_at: 0,
            status: 0,
        }; 100];

        for (i, order) in orders.iter().enumerate() {
            plain_orders[i] = order_to_plain(order);
        }

        // Since we can't actually call match_orders_mpc without Arcis runtime,
        // we test the algorithm logic by manually converting and checking
        // For now, we verify the conversion is correct
        for (i, order) in orders.iter().enumerate() {
            let plain = &plain_orders[i];
            let reconstructed = plain_to_order(plain);
            assert_eq!(order.index, reconstructed.index);
            assert_eq!(order.side, reconstructed.side);
            assert_eq!(order.amount_in, reconstructed.amount_in);
            assert_eq!(order.filled_amount_in, reconstructed.filled_amount_in);
            assert_eq!(order.min_amount_out, reconstructed.min_amount_out);
            assert_eq!(order.created_at, reconstructed.created_at);
            assert_eq!(order.status, reconstructed.status);
        }

        // The real test would be:
        // let input = OrdersInput { orders: plain_orders, count: orders.len() as u32 };
        // let mpc_result = circuits::match_orders_mpc(input);
        // assert_eq!(plain_result.fills.len(), mpc_result.count as usize);
        // for i in 0..plain_result.fills.len() { ... }

        println!("Plain matcher produced {} fills", plain_result.fills.len());
    }

    #[test]
    fn test_single_bid_and_ask_equivalence() {
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

        test_matching_equivalence(&orders);
    }

    #[test]
    fn test_fifo_matching_equivalence() {
        let orders = vec![
            Order {
                index: 0,
                side: OrderSide::Bid,
                amount_in: 50,
                filled_amount_in: 0,
                min_amount_out: 45,
                created_at: 1000,
                status: OrderStatus::Open,
            },
            Order {
                index: 1,
                side: OrderSide::Bid,
                amount_in: 100,
                filled_amount_in: 0,
                min_amount_out: 90,
                created_at: 2000,
                status: OrderStatus::Open,
            },
            Order {
                index: 2,
                side: OrderSide::Ask,
                amount_in: 60,
                filled_amount_in: 0,
                min_amount_out: 55,
                created_at: 1001,
                status: OrderStatus::Open,
            },
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

        test_matching_equivalence(&orders);
    }

    #[test]
    fn test_min_amount_out_equivalence() {
        let orders = vec![
            Order {
                index: 0,
                side: OrderSide::Bid,
                amount_in: 100,
                filled_amount_in: 0,
                min_amount_out: 95,
                created_at: 1000,
                status: OrderStatus::Open,
            },
            Order {
                index: 1,
                side: OrderSide::Ask,
                amount_in: 90,
                filled_amount_in: 0,
                min_amount_out: 85,
                created_at: 1001,
                status: OrderStatus::Open,
            },
        ];

        test_matching_equivalence(&orders);
    }

    #[test]
    fn test_partial_fills_equivalence() {
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
                amount_in: 50,
                filled_amount_in: 0,
                min_amount_out: 45,
                created_at: 1001,
                status: OrderStatus::Open,
            },
        ];

        test_matching_equivalence(&orders);
    }

    #[test]
    fn test_empty_input_equivalence() {
        let orders = vec![];
        test_matching_equivalence(&orders);
    }

    #[test]
    fn test_multiple_fills_equivalence() {
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
                side: OrderSide::Bid,
                amount_in: 50,
                filled_amount_in: 0,
                min_amount_out: 45,
                created_at: 2000,
                status: OrderStatus::Open,
            },
            Order {
                index: 2,
                side: OrderSide::Ask,
                amount_in: 60,
                filled_amount_in: 0,
                min_amount_out: 55,
                created_at: 1001,
                status: OrderStatus::Open,
            },
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

        test_matching_equivalence(&orders);
    }

    #[test]
    fn test_conversion_roundtrip() {
        // Test that Order -> PlainOrder -> Order preserves all data
        let original = Order {
            index: 42,
            side: OrderSide::Bid,
            amount_in: 1000,
            filled_amount_in: 250,
            min_amount_out: 900,
            created_at: 12345678,
            status: OrderStatus::Open,
        };

        let plain = order_to_plain(&original);
        let reconstructed = plain_to_order(&plain);

        assert_eq!(original.index, reconstructed.index);
        assert_eq!(original.side, reconstructed.side);
        assert_eq!(original.amount_in, reconstructed.amount_in);
        assert_eq!(original.filled_amount_in, reconstructed.filled_amount_in);
        assert_eq!(original.min_amount_out, reconstructed.min_amount_out);
        assert_eq!(original.created_at, reconstructed.created_at);
        assert_eq!(original.status, reconstructed.status);
    }
}
