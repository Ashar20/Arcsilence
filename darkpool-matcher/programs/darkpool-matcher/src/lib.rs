use anchor_lang::prelude::*;

declare_id!("D2M79d9pRgdE5kSuipoVksPBPZeU4yZkPd3fx4X1UQPH");

#[program]
pub mod darkpool_matcher {
    use super::*;

    pub fn initialize(_ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
