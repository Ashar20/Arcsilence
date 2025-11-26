//! Matching engine for ArcSilence dark pool
//!
//! This module contains the canonical solver logic for order matching.
//! The algorithm implemented here is the source of truth and must be
//! replicated identically in:
//! - services/solver-relayer/src/matcher.ts (TypeScript version)
//! - Arcium encrypted version (circuits::match_orders_mpc)
//!
//! See MATCHING_SPEC.md for the algorithm specification.

mod test_simple;  // Simple test circuit
