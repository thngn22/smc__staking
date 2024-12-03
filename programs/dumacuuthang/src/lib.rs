use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("FM6Y4E2QVz1YeL34KXyoyo85dJnAsX8eSb54VxV1SMCb");

#[error_code]
pub enum ErrorCode {
    #[msg("Insufficient token balance in your wallet.")]
    InsufficientBalance,
    #[msg("You do not have enough balance in your bank account.")]
    InsufficientUserBalance,
    #[msg("The provided token is not supported.")]
    InvalidToken,
    #[msg("Token is already whitelisted.")]
    TokenAlreadyWhitelisted,
    #[msg("You must claim rewards before withdrawing.")]
    ClaimRewardsFirst,
}

#[program]
pub mod dumacuuthang {
    use super::*;

    pub fn initialize_pool_account(ctx: Context<InitializePoolAccount>) -> Result<()> {
        let user_pool_account = &mut ctx.accounts.user_pool_account;
        user_pool_account.owner = ctx.accounts.owner.key();
        user_pool_account.balances = Vec::new();
        user_pool_account.last_stake_block = 0;
        msg!("User pool account initialized successfully");
        Ok(())
    }

    pub fn staking(ctx: Context<Staking>, amount: u64) -> Result<()> {
        let token_mint = ctx.accounts.user_ata.mint;

        if ctx.accounts.user_ata.amount < amount {
            return Err(ErrorCode::InsufficientBalance.into());
        }

        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.user_ata.to_account_info(),
                to: ctx.accounts.pool_ata.to_account_info(),
                authority: ctx.accounts.user_authority.to_account_info(),
            },
        );
        token::transfer(cpi_ctx, amount)?;

        ctx.accounts
            .user_pool_account
            .add_balance(token_mint, amount)?;

        let current_block = Clock::get()?.slot;
        ctx.accounts.user_pool_account.last_stake_block = current_block;

        msg!(
            "Deposit successful. Amount: {} Token: {:?}. Last stake block: {}",
            amount,
            token_mint,
            current_block
        );
        Ok(())
    }

    pub fn unstaking(ctx: Context<UnStaking>, amount: u64) -> Result<()> {
        let token_mint = ctx.accounts.pool_ata.mint;

        // Tính toán reward
        let current_block = Clock::get()?.slot;
        let block_diff = current_block - ctx.accounts.user_pool_account.last_stake_block;
        let reward = (amount * block_diff) / 100; 

        if ctx.accounts.pool_ata.amount < reward {
            return Err(ErrorCode::InsufficientBalance.into());
        }

        let reward_cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.pool_ata.to_account_info(),
                to: ctx.accounts.user_ata.to_account_info(),
                authority: ctx.accounts.pool_authority.to_account_info(),
            },
        );
        token::transfer(reward_cpi_ctx, reward)?;

        // ctx.accounts
        //     .user_pool_account
        //     .subtract_balance(token_mint, reward)?;

        ctx.accounts.user_pool_account.last_stake_block = current_block;

        msg!(
            "Unstaking successful. Amount: {} Token: {:?}. Reward: {}",
            amount,
            token_mint,
            reward
        );

        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        let token_mint = ctx.accounts.pool_ata.mint;

        if !ctx
            .accounts
            .user_pool_account
            .has_sufficient_balance(token_mint, amount)
        {
            return Err(ErrorCode::InsufficientUserBalance.into());
        }

        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.pool_ata.to_account_info(),
                to: ctx.accounts.user_ata.to_account_info(),
                authority: ctx.accounts.pool_authority.to_account_info(),
            },
        );
        token::transfer(cpi_ctx, amount)?;

        ctx.accounts
            .user_pool_account
            .subtract_balance(token_mint, amount)?;

        msg!(
            "Withdraw successful. Amount: {} Token: {:?}",
            amount,
            token_mint
        );
        Ok(())
    }
}

#[account]
pub struct PoolAccount {
    pub owner: Pubkey,
    pub balances: Vec<(Pubkey, u64)>,
    pub last_stake_block: u64,
}
impl PoolAccount {
    pub fn add_balance(&mut self, token: Pubkey, amount: u64) -> Result<()> {
        for (key, balance) in &mut self.balances {
            if *key == token {
                *balance += amount;
                return Ok(());
            }
        }
        self.balances.push((token, amount));
        Ok(())
    }

    pub fn subtract_balance(&mut self, token: Pubkey, amount: u64) -> Result<()> {
        for (key, balance) in &mut self.balances {
            if *key == token {
                if *balance < amount {
                    return Err(ErrorCode::InsufficientUserBalance.into());
                }
                *balance -= amount;
                return Ok(());
            }
        }
        Err(ErrorCode::InsufficientUserBalance.into())
    }

    pub fn has_sufficient_balance(&self, token: Pubkey, amount: u64) -> bool {
        self.balances
            .iter()
            .find(|(key, _)| *key == token)
            .map_or(false, |(_, balance)| *balance >= amount)
    }

    pub fn calculate_reward(&self, token: Pubkey, current_block: u64) -> Result<u64> {
        let mut staked_amount = 0;

        for (key, balance) in &self.balances {
            if *key == token {
                staked_amount = *balance;
                break;
            }
        }

        if staked_amount == 0 {
            return Ok(0);
        }

        let block_diff = current_block - self.last_stake_block;
        let reward = staked_amount * block_diff / 100;
        Ok(reward)
    }
}

#[derive(Accounts)]
pub struct InitializePoolAccount<'info> {
    #[account(init, payer = owner, space = 8 + 32 + 64 * 100 + 8)]
    pub user_pool_account: Account<'info, PoolAccount>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Staking<'info> {
    #[account(
        mut,
        constraint = user_ata.mint == pool_ata.mint,
        token::authority = user_authority
    )]
    pub user_ata: Account<'info, TokenAccount>,

    #[account(mut)]
    pub pool_ata: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user_pool_account: Account<'info, PoolAccount>,

    pub user_authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct UnStaking<'info> {
    #[account(mut)]
    pub user_ata: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = pool_ata.mint == user_ata.mint,
        token::authority = pool_authority
    )]
    pub pool_ata: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user_pool_account: Account<'info, PoolAccount>,

    pub pool_authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(
        mut,
        constraint = pool_ata.mint == user_ata.mint,
        token::authority = pool_authority
    )]
    pub user_ata: Account<'info, TokenAccount>,

    #[account(mut)]
    pub pool_ata: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user_pool_account: Account<'info, PoolAccount>,

    pub pool_authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
}