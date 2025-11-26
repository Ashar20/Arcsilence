//! Simple test circuit to verify Arcium build pipeline works

use arcis_imports::*;

#[encrypted]
mod circuits {
    use arcis_imports::*;

    pub struct TestInput {
        pub value: u64,
    }

    /// Minimal test instruction - just adds 1 to input
    #[instruction]
    pub fn simple_add(input: Enc<Shared, TestInput>) -> u64 {
        let data = input.to_arcis();
        (data.value + 1).reveal()
    }
}
