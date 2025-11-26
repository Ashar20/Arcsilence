use anchor_lang::prelude::*;
use arcium_anchor::{
    queue_computation,
    prelude::*,
};
use bytemuck::{Pod, Zeroable};

declare_id!("GXMjSxNzrAee7KNdiWfGaUXh783bXyB87aW6TYvmQ3r1");

#[program]
pub mod darkpool_matcher {
    use super::*;

    pub fn initialize(_ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }

    /// Queue a match_orders_mpc computation with encrypted order data
    /// 
    /// The encrypted data is stored in a PDA buffer account with layout:
    /// [nonce (16 bytes) | pubkey (32 bytes) | ciphertexts (N*32 bytes)]
    pub fn match_orders(
        ctx: Context<MatchOrders>,
        computation_offset: u64,
        ciphertext_data: Vec<u8>,
    ) -> Result<()> {
        // Validate buffer size: must be at least 48 bytes (16 nonce + 32 pubkey)
        require!(
            ciphertext_data.len() >= 48,
            ErrorCode::InvalidBufferSize
        );
        require!(
            (ciphertext_data.len() - 48) % 32 == 0,
            ErrorCode::InvalidCiphertextAlignment
        );
        require!(
            ciphertext_data.len() <= MAX_BUFFER_SIZE,
            ErrorCode::BufferTooLarge
        );

        // Write encrypted data to buffer account
        let buffer = &mut ctx.accounts.ciphertext_buffer.load_mut()?;
        let write_len = ciphertext_data.len().min(MAX_BUFFER_SIZE);
        buffer.data[..write_len].copy_from_slice(&ciphertext_data[..write_len]);

        // Build arguments for queue_computation
        // The circuit expects: Account containing [nonce(16) | pubkey(32) | ciphertexts(N*32)]
        let args = vec![Argument::Account(
            ctx.accounts.ciphertext_buffer.key(),
            write_len as u32,
            write_len as u32,
        )];

        // Queue the computation
        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            None, // callback_url
            vec![], // callback_instructions
            0, // num_callback_txs
        )?;

        msg!("Queued match_orders_mpc computation with offset: {}", computation_offset);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}

// SignerAccount struct for PDA signer (required by queue_computation_accounts)
#[account]
pub struct SignerAccount {
    pub bump: u8,
}

const MAX_BUFFER_SIZE: usize = 16 + 32 + 700 * 32; // nonce + pubkey + max ciphertexts

#[queue_computation_accounts("match_orders_mpc", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct MatchOrders<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    /// PDA buffer account to store encrypted order data
    /// Layout: [nonce (16) | pubkey (32) | ciphertexts (N*32)]
    #[account(
        init_if_needed,
        payer = payer,
        space = MAX_BUFFER_SIZE,
        seeds = [b"ciphertext_buffer", payer.key().as_ref(), computation_offset.to_le_bytes().as_ref()],
        bump
    )]
    pub ciphertext_buffer: AccountLoader<'info, CiphertextBuffer>,

    // Required Arcium accounts (validated by #[queue_computation_accounts])
    pub mxe_account: Account<'info, MXEAccount>,
    pub sign_pda_account: Account<'info, SignerAccount>,
    #[account(mut)]
    pub mempool_account: UncheckedAccount<'info>,
    #[account(mut)]
    pub executing_pool: UncheckedAccount<'info>,
    #[account(mut)]
    pub computation_account: UncheckedAccount<'info>,
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(mut)]
    pub cluster_account: Account<'info, Cluster>,
    #[account(mut)]
    pub pool_account: Account<'info, FeePool>,
    pub clock_account: Account<'info, ClockAccount>,
    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
}

#[account(zero_copy)]
#[repr(C)]
pub struct CiphertextBuffer {
    pub data: [u8; MAX_BUFFER_SIZE],
}

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid buffer size: must be at least 48 bytes")]
    InvalidBufferSize,
    #[msg("Ciphertext data must be aligned to 32 bytes")]
    InvalidCiphertextAlignment,
    #[msg("Buffer data exceeds maximum size")]
    BufferTooLarge,
}
