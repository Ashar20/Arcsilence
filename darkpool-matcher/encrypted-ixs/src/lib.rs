//! Matching engine for ArcSilence dark pool
//!
//! This module contains the canonical solver logic for order matching.
//! The algorithm implemented here is the source of truth and must be
//! replicated identically in:
//! - services/solver-relayer/src/matcher.ts (TypeScript version)
//! - Arcium encrypted version (circuits::match_orders_mpc)
//!
//! See MATCHING_SPEC.md for the algorithm specification.

mod matching;
mod circuits;

// Re-export plain types and functions (for testing and reference)
pub use matching::{ExecutionPlan, Fill, Order, OrderSide, OrderStatus};
pub use matching::match_orders;

// Re-export Arcis circuit types and MPC entrypoint
pub use circuits::{OrdersInput, PlainOrder, MatchResult, PlainFill};
#[cfg(feature = "arcis")]
pub use circuits::match_orders_mpc;
