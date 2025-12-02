use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("CMrfhDiq5gLBwbT3nxQvGH1UTcxtaAY9r4we2PvjbjAg");

#[program]
pub mod darkpool {
    use super::*;

    pub fn initialize_config(ctx: Context<InitializeConfig>, admin: Pubkey) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.admin = admin;
        config.bump = ctx.bumps.config;
        Ok(())
    }

    pub fn create_market(
        ctx: Context<CreateMarket>,
        base_mint: Pubkey,
        quote_mint: Pubkey,
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        market.base_mint = base_mint;
        market.quote_mint = quote_mint;
        market.base_vault = ctx.accounts.base_vault.key();
        market.quote_vault = ctx.accounts.quote_vault.key();
        market.bump = ctx.bumps.market;

        // Initialize vaults as token accounts
        let market_seeds = &[
            b"market",
            base_mint.as_ref(),
            quote_mint.as_ref(),
            &[ctx.bumps.market],
        ];
        // Vaults are initialized by Anchor via the #[account(init)] constraints
        // No manual initialization needed

        Ok(())
    }

    pub fn place_order(
        ctx: Context<PlaceOrder>,
        side: OrderSide,
        amount_in: u64,
        min_amount_out: u64,
        nonce: u64,
    ) -> Result<()> {
        let order = &mut ctx.accounts.order;
        let market = &ctx.accounts.market;
        let clock = Clock::get()?;

        // Set order fields
        order.owner = ctx.accounts.owner.key();
        order.market = market.key();
        order.side = side;
        order.amount_in = amount_in;
        order.filled_amount_in = 0;
        order.min_amount_out = min_amount_out;
        order.status = OrderStatus::Open;
        order.created_at = clock.unix_timestamp;
        order.bump = ctx.bumps.order;
        order.nonce = nonce;

        // Transfer tokens from user to appropriate vault
        let (source_account, vault_account) = match side {
            OrderSide::Bid => {
                // Buying base with quote: transfer quote tokens
                (
                    ctx.accounts.user_quote_account.to_account_info(),
                    ctx.accounts.quote_vault.to_account_info(),
                )
            }
            OrderSide::Ask => {
                // Selling base for quote: transfer base tokens
                (
                    ctx.accounts.user_base_account.to_account_info(),
                    ctx.accounts.base_vault.to_account_info(),
                )
            }
        };

        let cpi_accounts = Transfer {
            from: source_account,
            to: vault_account,
            authority: ctx.accounts.owner.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, amount_in)?;

        emit!(OrderPlaced {
            order: order.key(),
            owner: order.owner,
            market: order.market,
            side,
            amount_in,
            min_amount_out,
        });

        Ok(())
    }

    pub fn cancel_order(ctx: Context<CancelOrder>) -> Result<()> {
        let order = &mut ctx.accounts.order;
        let market = &ctx.accounts.market;

        require!(
            order.status == OrderStatus::Open,
            DarkpoolError::OrderNotOpen
        );

        let remaining = order.amount_in
            .checked_sub(order.filled_amount_in)
            .ok_or(DarkpoolError::MathOverflow)?;

        if remaining == 0 {
            return Err(DarkpoolError::NothingToCancel.into());
        }

        // Transfer remaining tokens back to owner
        let (vault_account, user_account) = match order.side {
            OrderSide::Bid => {
                // Return quote tokens
                (
                    ctx.accounts.quote_vault.to_account_info(),
                    ctx.accounts.user_quote_account.to_account_info(),
                )
            }
            OrderSide::Ask => {
                // Return base tokens
                (
                    ctx.accounts.base_vault.to_account_info(),
                    ctx.accounts.user_base_account.to_account_info(),
                )
            }
        };

        let seeds = &[
            b"market",
            market.base_mint.as_ref(),
            market.quote_mint.as_ref(),
            &[market.bump],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: vault_account,
            to: user_account,
            authority: ctx.accounts.market.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, remaining)?;

        order.status = OrderStatus::Cancelled;

        emit!(OrderCancelled {
            order: order.key(),
            owner: order.owner,
            remaining,
        });

        Ok(())
    }

    pub fn settle_batch(
        ctx: Context<SettleBatch>,
        fills: Vec<Fill>,
        arcium_signature: Vec<u8>,
    ) -> Result<()> {
        // Extract values from ctx.accounts (these are just values, not references)
        let market_key = ctx.accounts.market.key();
        let market_bump = ctx.accounts.market.bump;
        let base_mint = ctx.accounts.market.base_mint;
        let quote_mint = ctx.accounts.market.quote_mint;
        
        let seeds = &[
            b"market",
            base_mint.as_ref(),
            quote_mint.as_ref(),
            &[market_bump],
        ];
        let signer = &[&seeds[..]];

        // Get all accounts from remaining_accounts to avoid lifetime conflicts
        // Order: [base_vault, quote_vault, market, token_program, then per-fill accounts...]
        let base_vault_info = ctx.remaining_accounts
            .get(0)
            .ok_or(DarkpoolError::OrderNotFound)?;
        let quote_vault_info = ctx.remaining_accounts
            .get(1)
            .ok_or(DarkpoolError::OrderNotFound)?;
        let market_info = ctx.remaining_accounts
            .get(2)
            .ok_or(DarkpoolError::OrderNotFound)?;
        let token_program_info = ctx.remaining_accounts
            .get(3)
            .ok_or(DarkpoolError::OrderNotFound)?;
        
        // Validate accounts
        require!(
            base_vault_info.owner == &anchor_spl::token::ID,
            DarkpoolError::InvalidTokenAccount
        );
        require!(
            quote_vault_info.owner == &anchor_spl::token::ID,
            DarkpoolError::InvalidTokenAccount
        );
        require!(
            market_info.key() == market_key,
            DarkpoolError::MismatchedMarket
        );
        require!(
            token_program_info.key() == anchor_spl::token::ID,
            DarkpoolError::InvalidTokenAccount
        );

        // Process fills - do order updates and transfers in same loop
        let mut account_idx = 4; // Start after vault, market, and token_program accounts

        for fill in &fills {
            // For each fill, expect accounts in this order:
            // [order_account, counterparty_order_account, order_owner_base_account, order_owner_quote_account, counterparty_owner_base_account, counterparty_owner_quote_account]
            
            let order_account_info = ctx.remaining_accounts
                .get(account_idx)
                .ok_or(DarkpoolError::OrderNotFound)?;
            account_idx += 1;
            let counterparty_account_info = ctx.remaining_accounts
                .get(account_idx)
                .ok_or(DarkpoolError::OrderNotFound)?;
            account_idx += 1;
            let order_owner_base = ctx.remaining_accounts
                .get(account_idx)
                .ok_or(DarkpoolError::OrderNotFound)?;
            account_idx += 1;
            let order_owner_quote = ctx.remaining_accounts
                .get(account_idx)
                .ok_or(DarkpoolError::OrderNotFound)?;
            account_idx += 1;
            let counterparty_owner_base = ctx.remaining_accounts
                .get(account_idx)
                .ok_or(DarkpoolError::OrderNotFound)?;
            account_idx += 1;
            let counterparty_owner_quote = ctx.remaining_accounts
                .get(account_idx)
                .ok_or(DarkpoolError::OrderNotFound)?;
            account_idx += 1;

            // Validate account keys match fill
            require!(
                order_account_info.key() == fill.order,
                DarkpoolError::OrderNotFound
            );
            require!(
                counterparty_account_info.key() == fill.counterparty,
                DarkpoolError::OrderNotFound
            );

            // Load and deserialize orders
            let mut order_data = order_account_info.try_borrow_mut_data()?;
            let mut counterparty_data = counterparty_account_info.try_borrow_mut_data()?;

            // Deserialize orders (skip discriminator)
            let order_discriminator = 8;
            let mut order = Order::try_deserialize(&mut &order_data[order_discriminator..])?;
            let mut counterparty = Order::try_deserialize(&mut &counterparty_data[order_discriminator..])?;

            // Validate orders
            require!(order.market == market_key, DarkpoolError::MismatchedMarket);
            require!(
                counterparty.market == market_key,
                DarkpoolError::MismatchedMarket
            );
            require!(
                order.status != OrderStatus::Cancelled,
                DarkpoolError::OrderCancelled
            );
            require!(
                counterparty.status != OrderStatus::Cancelled,
                DarkpoolError::OrderCancelled
            );

            // Ensure orders are opposite sides
            require!(
                order.side != counterparty.side,
                DarkpoolError::SameSideOrders
            );

            // Validate fill amounts
            let order_new_filled = order
                .filled_amount_in
                .checked_add(fill.amount_in)
                .ok_or(DarkpoolError::MathOverflow)?;
            require!(
                order_new_filled <= order.amount_in,
                DarkpoolError::InsufficientRemaining
            );

            let counterparty_new_filled = counterparty
                .filled_amount_in
                .checked_add(fill.amount_out)
                .ok_or(DarkpoolError::MathOverflow)?;
            require!(
                counterparty_new_filled <= counterparty.amount_in,
                DarkpoolError::InsufficientRemaining
            );

            // Update filled amounts
            order.filled_amount_in = order_new_filled;
            counterparty.filled_amount_in = counterparty_new_filled;

            // Update status
            if order.filled_amount_in == order.amount_in {
                order.status = OrderStatus::Filled;
            } else {
                order.status = OrderStatus::PartiallyFilled;
            }

            if counterparty.filled_amount_in == counterparty.amount_in {
                counterparty.status = OrderStatus::Filled;
            } else {
                counterparty.status = OrderStatus::PartiallyFilled;
            }

            // Serialize back
            order.try_serialize(&mut &mut order_data[order_discriminator..])?;
            counterparty.try_serialize(&mut &mut counterparty_data[order_discriminator..])?;
            
            // Store values we need for transfers
            let order_side = order.side;
            let amount_out = fill.amount_out;
            let amount_in = fill.amount_in;
            let order_owner_base_key = order_owner_base.key();
            let order_owner_quote_key = order_owner_quote.key();
            let counterparty_owner_base_key = counterparty_owner_base.key();
            let counterparty_owner_quote_key = counterparty_owner_quote.key();
            
            // Drop borrows (AccountInfo references don't need dropping)
            drop(order_data);
            drop(counterparty_data);
            
            // Get AccountInfo references fresh for transfers
            let order_owner_base_info = ctx.remaining_accounts
                .get(account_idx - 4)
                .ok_or(DarkpoolError::OrderNotFound)?;
            let order_owner_quote_info = ctx.remaining_accounts
                .get(account_idx - 3)
                .ok_or(DarkpoolError::OrderNotFound)?;
            let counterparty_owner_base_info = ctx.remaining_accounts
                .get(account_idx - 2)
                .ok_or(DarkpoolError::OrderNotFound)?;
            let counterparty_owner_quote_info = ctx.remaining_accounts
                .get(account_idx - 1)
                .ok_or(DarkpoolError::OrderNotFound)?;
            
            // Validate keys still match
            require!(order_owner_base_info.key() == order_owner_base_key, DarkpoolError::OrderNotFound);
            require!(order_owner_quote_info.key() == order_owner_quote_key, DarkpoolError::OrderNotFound);
            require!(counterparty_owner_base_info.key() == counterparty_owner_base_key, DarkpoolError::OrderNotFound);
            require!(counterparty_owner_quote_info.key() == counterparty_owner_quote_key, DarkpoolError::OrderNotFound);
            
            // Do transfers - all AccountInfo from remaining_accounts (no lifetime conflict!)
            match order_side {
                OrderSide::Bid => {
                    // Order is buying base with quote
                    // Transfer base to order owner
                    let cpi_accounts = Transfer {
                        from: base_vault_info.to_account_info(),
                        to: order_owner_base_info.to_account_info(),
                        authority: market_info.to_account_info(),
                    };
                    let cpi_ctx = CpiContext::new_with_signer(token_program_info.to_account_info(), cpi_accounts, signer);
                    token::transfer(cpi_ctx, amount_out)?;

                    // Transfer quote to counterparty owner
                    let cpi_accounts = Transfer {
                        from: quote_vault_info.to_account_info(),
                        to: counterparty_owner_quote_info.to_account_info(),
                        authority: market_info.to_account_info(),
                    };
                    let cpi_ctx = CpiContext::new_with_signer(token_program_info.to_account_info(), cpi_accounts, signer);
                    token::transfer(cpi_ctx, amount_in)?;
                }
                OrderSide::Ask => {
                    // Order is selling base for quote
                    // Transfer quote to order owner
                    let cpi_accounts = Transfer {
                        from: quote_vault_info.to_account_info(),
                        to: order_owner_quote_info.to_account_info(),
                        authority: market_info.to_account_info(),
                    };
                    let cpi_ctx = CpiContext::new_with_signer(token_program_info.to_account_info(), cpi_accounts, signer);
                    token::transfer(cpi_ctx, amount_out)?;

                    // Transfer base to counterparty owner
                    let cpi_accounts = Transfer {
                        from: base_vault_info.to_account_info(),
                        to: counterparty_owner_base_info.to_account_info(),
                        authority: market_info.to_account_info(),
                    };
                    let cpi_ctx = CpiContext::new_with_signer(token_program_info.to_account_info(), cpi_accounts, signer);
                    token::transfer(cpi_ctx, amount_in)?;
                }
            }
        }

        emit!(BatchSettled {
            fills_count: fills.len() as u8,
            arcium_signature,
        });

        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + Config::LEN,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateMarket<'info> {
    #[account(
        seeds = [b"config"],
        bump = config.bump,
        constraint = config.admin == admin.key() @ DarkpoolError::Unauthorized
    )]
    pub config: Account<'info, Config>,
    #[account(
        init,
        payer = admin,
        space = 8 + Market::LEN,
        seeds = [b"market", base_mint.key().as_ref(), quote_mint.key().as_ref()],
        bump
    )]
    pub market: Account<'info, Market>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub base_mint: Account<'info, Mint>,
    pub quote_mint: Account<'info, Mint>,
    #[account(
        init,
        payer = admin,
        token::mint = base_mint,
        token::authority = market,
        seeds = [b"vault", b"base".as_ref(), base_mint.key().as_ref(), quote_mint.key().as_ref()],
        bump
    )]
    pub base_vault: Account<'info, TokenAccount>,
    #[account(
        init,
        payer = admin,
        token::mint = quote_mint,
        token::authority = market,
        seeds = [b"vault", b"quote".as_ref(), base_mint.key().as_ref(), quote_mint.key().as_ref()],
        bump
    )]
    pub quote_vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(side: OrderSide, amount_in: u64, min_amount_out: u64, nonce: u64)]
pub struct PlaceOrder<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + Order::LEN,
        seeds = [b"order", market.key().as_ref(), owner.key().as_ref(), &nonce.to_le_bytes()],
        bump
    )]
    pub order: Account<'info, Order>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub market: Account<'info, Market>,
    #[account(
        mut,
        constraint = user_base_account.owner == owner.key() @ DarkpoolError::InvalidTokenAccount,
        constraint = user_base_account.mint == market.base_mint @ DarkpoolError::InvalidMint
    )]
    pub user_base_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = user_quote_account.owner == owner.key() @ DarkpoolError::InvalidTokenAccount,
        constraint = user_quote_account.mint == market.quote_mint @ DarkpoolError::InvalidMint
    )]
    pub user_quote_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = base_vault.mint == market.base_mint @ DarkpoolError::InvalidMint
    )]
    pub base_vault: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = quote_vault.mint == market.quote_mint @ DarkpoolError::InvalidMint
    )]
    pub quote_vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CancelOrder<'info> {
    #[account(
        mut,
        seeds = [b"order", order.market.as_ref(), order.owner.as_ref(), &order.nonce.to_le_bytes()],
        bump = order.bump,
        constraint = order.owner == owner.key() @ DarkpoolError::Unauthorized
    )]
    pub order: Account<'info, Order>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub market: Account<'info, Market>,
    #[account(
        mut,
        constraint = user_base_account.owner == owner.key() @ DarkpoolError::InvalidTokenAccount,
        constraint = user_base_account.mint == market.base_mint @ DarkpoolError::InvalidMint
    )]
    pub user_base_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = user_quote_account.owner == owner.key() @ DarkpoolError::InvalidTokenAccount,
        constraint = user_quote_account.mint == market.quote_mint @ DarkpoolError::InvalidMint
    )]
    pub user_quote_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = base_vault.mint == market.base_mint @ DarkpoolError::InvalidMint
    )]
    pub base_vault: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = quote_vault.mint == market.quote_mint @ DarkpoolError::InvalidMint
    )]
    pub quote_vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct SettleBatch<'info> {
    #[account(
        seeds = [b"config"],
        bump = config.bump,
        constraint = config.admin == admin.key() @ DarkpoolError::Unauthorized
    )]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub market: Account<'info, Market>,
    // Remaining accounts: Expects:
    // [base_vault, quote_vault, market, token_program, then for each fill:
    //  order_account, counterparty_order_account, order_owner_base_account, 
    //  order_owner_quote_account, counterparty_owner_base_account, counterparty_owner_quote_account]
    // First 4 accounts are: base_vault, quote_vault, market, token_program
    // Then 6 accounts per fill
    // Accounts are validated in instruction
}

#[account]
pub struct Config {
    pub admin: Pubkey,
    pub bump: u8,
}

impl Config {
    pub const LEN: usize = 32 + 1; // admin + bump
}

#[account]
pub struct Market {
    pub base_mint: Pubkey,
    pub quote_mint: Pubkey,
    pub base_vault: Pubkey,
    pub quote_vault: Pubkey,
    pub bump: u8,
}

impl Market {
    pub const LEN: usize = 32 + 32 + 32 + 32 + 1; // 4 pubkeys + bump
}

#[account]
pub struct Order {
    pub owner: Pubkey,
    pub market: Pubkey,
    pub side: OrderSide,
    pub amount_in: u64,
    pub filled_amount_in: u64,
    pub min_amount_out: u64,
    pub status: OrderStatus,
    pub created_at: i64,
    pub bump: u8,
    pub nonce: u64,
}

impl Order {
    pub const LEN: usize = 32 + 32 + 1 + 8 + 8 + 8 + 1 + 8 + 1 + 8; // All fields
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum OrderSide {
    Bid,
    Ask,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum OrderStatus {
    Open,
    PartiallyFilled,
    Filled,
    Cancelled,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Fill {
    pub order: Pubkey,
    pub counterparty: Pubkey,
    pub amount_in: u64,
    pub amount_out: u64,
}

#[event]
pub struct OrderPlaced {
    pub order: Pubkey,
    pub owner: Pubkey,
    pub market: Pubkey,
    pub side: OrderSide,
    pub amount_in: u64,
    pub min_amount_out: u64,
}

#[event]
pub struct OrderCancelled {
    pub order: Pubkey,
    pub owner: Pubkey,
    pub remaining: u64,
}

#[event]
pub struct BatchSettled {
    pub fills_count: u8,
    pub arcium_signature: Vec<u8>,
}

#[error_code]
pub enum DarkpoolError {
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Order is not open")]
    OrderNotOpen,
    #[msg("Order not found")]
    OrderNotFound,
    #[msg("Insufficient remaining amount")]
    InsufficientRemaining,
    #[msg("Mismatched market")]
    MismatchedMarket,
    #[msg("Order already cancelled")]
    OrderCancelled,
    #[msg("Invalid token account")]
    InvalidTokenAccount,
    #[msg("Invalid mint")]
    InvalidMint,
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Nothing to cancel")]
    NothingToCancel,
    #[msg("Orders have same side")]
    SameSideOrders,
}
