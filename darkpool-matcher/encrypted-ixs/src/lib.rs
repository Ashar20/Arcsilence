//! Matching engine for ArcSilence dark pool
//!
//! This crate exposes three flavours of the matcher:
//! 1. `matching` - plain Rust reference implementation used throughout the repo.
//! 2. `circuits` - Arcis encrypted instructions compiled to `.idarc`.
//! 3. `test_simple` - toy circuits used during bring-up.
//!
//! Keeping everything under one crate guarantees the algorithm stays in sync
//! whether it runs locally, inside the solver, or within Arcium's MXE.

pub mod matching;
pub use matching::{match_orders, ExecutionPlan, Fill, Order, OrderSide, OrderStatus};

#[cfg(feature = "arcis")]
pub mod circuits;

#[cfg(feature = "arcis")]
pub use circuits::{match_orders_mpc, MatchResult, OrdersInput, PlainFill, PlainOrder};

#[cfg(not(feature = "arcis"))]
pub mod circuits;

#[cfg(not(feature = "arcis"))]
pub use circuits::{MatchResult, OrdersInput, PlainFill, PlainOrder};

mod test_simple; // Simple test circuit
