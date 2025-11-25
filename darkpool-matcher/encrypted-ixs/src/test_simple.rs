//! Simple test circuit to verify Arcium build pipeline works

#[cfg(feature = "arcis")]
use arcis_imports::*;

#[cfg(feature = "arcis")]
#[encrypted]
mod test_circuit {
    use arcis_imports::*;

    #[derive(Copy, Clone)]
    pub struct TestInput {
        pub value: u64,
    }

    #[derive(Copy, Clone)]
    pub struct TestOutput {
        pub result: u64,
    }

    /// Minimal test instruction - just adds 1 to input
    #[instruction]
    pub fn simple_add(input: Enc<Shared, TestInput>) -> Enc<Shared, TestOutput> {
        let data = input.to_arcis();
        let result = TestOutput {
            result: data.value + 1,
        };
        input.owner.from_arcis(result)
    }
}

#[cfg(feature = "arcis")]
pub use test_circuit::simple_add;

#[cfg(not(feature = "arcis"))]
pub fn simple_add(_input: ()) -> () {
    ()
}
