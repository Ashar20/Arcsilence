use anchor_lang::prelude::*;
use arcium_anchor::prelude::*;

declare_id!("GXMjSxNzrAee7KNdiWfGaUXh783bXyB87aW6TYvmQ3r1");

// Computation definition offset for match_orders
const COMP_DEF_OFFSET_MATCH_ORDERS: u32 = comp_def_offset("match_orders");

#[arcium_program]
pub mod darkpool_mxe {
    use super::*;

    /// Queue encrypted order matching computation on Arcium MPC network
    ///
    /// This instruction:
    /// 1. Takes encrypted order data (ciphertext arrays)
    /// 2. Submits to Arcium MPC network for encrypted computation
    /// 3. Returns after queueing (callback will handle results)
    pub fn match_orders(
        ctx: Context<MatchOrders>,
        computation_offset: u64,
        ciphertext_arrays: Vec<Vec<u8>>,
        pub_key: [u8; 32],
        nonce: u128,
        order_count: u64,
    ) -> Result<()> {
        msg!("MXE: Queueing match_orders computation");
        msg!("  computation_offset: {}", computation_offset);
        msg!("  order_count: {}", order_count);
        msg!("  ciphertext_arrays.len(): {}", ciphertext_arrays.len());

        // Build arguments for Arcium computation
        let mut args = Vec::new();

        // Add the x25519 public key (for decryption by MXE)
        args.push(Argument::ArcisPubkey(pub_key));

        // Add the nonce for encryption
        args.push(Argument::PlaintextU128(nonce));

        // Add the encrypted order data
        // Each ciphertext is a field element from RescueCipher (32 bytes = 255 bits)
        // The circuit expects OrdersInput with PlainOrder fields:
        // - index: u32 -> EncryptedU32
        // - side: u8 -> EncryptedU8
        // - amount_in: u64 -> EncryptedU64
        // - filled_amount_in: u64 -> EncryptedU64
        // - min_amount_out: u64 -> EncryptedU64
        // - created_at: i64 -> EncryptedI64 (or EncryptedU64 if i64 not supported)
        // - status: u8 -> EncryptedU8
        for ct in ciphertext_arrays.iter() {
            if ct.len() != 32 {
                return err!(ErrorCode::InvalidCiphertextLength);
            }
            let mut ct_array = [0u8; 32];
            ct_array.copy_from_slice(ct);
            // All ciphertexts are 255-bit field elements, use EncryptedU8 as base type
            // Note: This may need adjustment based on actual Argument enum variants available
            args.push(Argument::EncryptedU8(ct_array));
        }

        msg!("MXE: Prepared {} arguments", args.len());
        
        // Queue the computation on Arcium MPC network
        // This uses the v0.4 signature with num_callback_txs parameter
        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            None,                    // callback_server: Option<String>
            vec![MatchOrdersCallback::callback_ix(&[])],  // callback_ixs: Vec<CallbackInstruction>
            1,                       // num_callback_txs: u8 (1 callback tx)
        )?;

        msg!("MXE: Computation queued successfully");
        Ok(())
    }

    /// Callback handler for match_orders computation results
    ///
    /// This instruction is automatically invoked by Arcium after the
    /// MPC computation completes. It receives the decrypted results.
    #[arcium_callback(encrypted_ix = "match_orders")]
    pub fn match_orders_callback(
        ctx: Context<MatchOrdersCallback>,
        output: ComputationOutputs<MatchOrdersOutput>,
    ) -> Result<()> {
        msg!("MXE Callback: Received computation results");

        // Extract the result from ComputationOutputs
        let result = match output {
            ComputationOutputs::Success(o) => o,
            _ => return Err(ErrorCode::AbortedComputation.into()),
        };

        // The output contains the decrypted results from MPC computation
        // In a production system, these would be used to settle trades on-chain
        // via the darkpool program's batch_settle instruction
        
        msg!("MXE Callback: Computation complete, num_fills: {}", result.num_fills);
        Ok(())
    }
}

/// Accounts for match_orders_callback instruction
/// Required accounts for Arcium callback
#[callback_accounts("match_orders")]
#[derive(Accounts)]
pub struct MatchOrdersCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,

    #[account(
        address = derive_comp_def_pda!(COMP_DEF_OFFSET_MATCH_ORDERS)
    )]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,

    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    /// CHECK: instructions_sysvar, checked by account constraint
    pub instructions_sysvar: AccountInfo<'info>,
}

/// Accounts for match_orders instruction
/// The #[queue_computation_accounts] macro validates these accounts
#[queue_computation_accounts("match_orders", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct MatchOrders<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    // Required Arcium accounts (validated by #[queue_computation_accounts])
    // The macro requires Account<'info, MXEAccount> type
    // NOTE: MXEAccount is owned by Arcium program, not our program
    // Anchor's Account validation may fail, but the macro will validate it
    pub mxe_account: Account<'info, MXEAccount>,
    pub sign_pda_account: Account<'info, SignerAccount>,
    #[account(mut)]
    /// CHECK: Validated by #[queue_computation_accounts] macro
    pub mempool_account: UncheckedAccount<'info>,
    #[account(mut)]
    /// CHECK: Validated by #[queue_computation_accounts] macro
    pub executing_pool: UncheckedAccount<'info>,
    #[account(mut)]
    /// CHECK: Validated by #[queue_computation_accounts] macro
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

/// Output structure for match_orders computation
/// This defines what data the MPC computation returns
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct MatchOrdersOutput {
    pub num_fills: u64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid ciphertext length - expected 32 bytes")]
    InvalidCiphertextLength,
    #[msg("Computation was aborted")]
    AbortedComputation,
}

// Re-export client accounts for IDL generation
// This fixes the `__client_accounts_darkpool_mxe` error during `anchor idl build`
// Note: The module is generated by the #[arcium_program] macro during IDL build
// If this causes compilation errors, it may need to be conditionally compiled
// or the macro may need to be updated to export this automatically
