module sui_contract::resolver {
    use std::string::String;
    use sui::coin::{Coin};
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{TxContext, sender};
    use sui::clock::{Clock, timestamp_ms};
    use sui::event;
    use sui::transfer;
    use sui_contract::escrow_structs::{
        Immutables,
        new_immutables,
        new_timelocks,
        dst_cancellation_time
    };
    use sui_contract::escrow_factory::{Self, EscrowFactory};
    use sui_contract::escrow_src::{Self, SrcEscrow};
    use sui_contract::escrow_dst::{Self, DstEscrow};

    // Error codes
    const E_NOT_OWNER: u64 = 500;
    const E_INVALID_CREATION_TIME: u64 = 501;
    const E_INSUFFICIENT_COIN_AMOUNT: u64 = 502;
    const E_INSUFFICIENT_SAFETY_DEPOSIT: u64 = 503;

    public struct Resolver has key {
        id: UID,
        owner: address,
    }

    // Modifier equivalent for owner-only functions
    // public fun assert_owner(resolver: &Resolver, ctx: &TxContext) {
    //     assert!(sender(ctx) == resolver.owner, E_NOT_OWNER);
    // }

    /// Initialize resolver - called when contract is deployed
    fun init(ctx: &mut TxContext) {
        let resolver = Resolver {
            id: object::new(ctx),
            owner: sender(ctx),
        };
        transfer::share_object(resolver);
    }

    /// Deploy source escrow with automatic safety deposit handling
    public entry fun deploy_src<T>(
        // resolver: &Resolver,
        clock: &Clock,
        coin: Coin<T>,
        safety_deposit_coin: Coin<T>,
        // Immutables parameters
        order_hash: String,
        hashlock: vector<u8>,
        maker: address,
        taker: address,
        token: address,
        amount: u64,
        safety_deposit: u64,
        // Timelock delays (in milliseconds from deployment)
        src_withdrawal_delay: u64,
        src_public_withdrawal_delay: u64,
        src_cancellation_delay: u64,
        src_public_cancellation_delay: u64,
        dst_withdrawal_delay: u64,
        dst_public_withdrawal_delay: u64,
        dst_cancellation_delay: u64,
        // Destination chain info
        dst_chain_id: u64,
        dst_token: address,
        dst_amount: u64,
        dst_safety_deposit: u64,
        ctx: &mut TxContext
    ) {
        // assert_owner(resolver, ctx);

        // Create source escrow
        escrow_factory::create_src_escrow(
            clock,
            coin,
            safety_deposit_coin,
            order_hash,
            hashlock,
            maker,
            taker,
            token,
            amount,
            safety_deposit,
            src_withdrawal_delay,
            src_public_withdrawal_delay,
            src_cancellation_delay,
            src_public_cancellation_delay,
            dst_withdrawal_delay,
            dst_public_withdrawal_delay,
            dst_cancellation_delay,
            dst_chain_id,
            dst_token,
            dst_amount,
            dst_safety_deposit,
            ctx
        );

    }

    /// Deploy destination escrow
    public entry fun deploy_dst<T>(
        // resolver: &Resolver,
        clock: &Clock,
        coin: Coin<T>,
        safety_deposit_coin: Coin<T>,
        // Immutables parameters
        order_hash: String,
        hashlock: vector<u8>,
        maker: address,
        taker: address,
        token: address,
        amount: u64,
        safety_deposit: u64,
        // Timelock delays
        dst_withdrawal_delay: u64,
        dst_public_withdrawal_delay: u64,
        dst_cancellation_delay: u64,
        src_cancellation_timestamp: u64,
        deployed_at: u64,
        ctx: &mut TxContext
    ) {
        // assert_owner(resolver, ctx);

        escrow_factory::create_dst_escrow(
            clock,
            coin,
            safety_deposit_coin,
            order_hash,
            hashlock,
            maker,
            taker,
            token,
            amount,
            safety_deposit,
            dst_withdrawal_delay,
            dst_public_withdrawal_delay,
            dst_cancellation_delay,
            src_cancellation_timestamp,
            deployed_at,
            ctx
        );

    }

    /// Withdraw from source escrow (anyone can call)
    public entry fun withdraw_src<T>(
        clock: &Clock,
        escrow: SrcEscrow<T>,
        secret: vector<u8>,
        ctx: &mut TxContext
    ) {
        let escrow_id = object::id(&escrow);
        
        escrow_src::withdraw<T>(clock, escrow, secret, ctx);

    }

    /// Withdraw from source escrow to specific target (anyone can call)
    public entry fun withdraw_src_to<T>(
        clock: &Clock,
        escrow: SrcEscrow<T>,
        secret: vector<u8>,
        target: address,
        ctx: &mut TxContext
    ) {
        let escrow_id = object::id(&escrow);
        
        escrow_src::withdraw_to<T>(clock, escrow, secret, target, ctx);

    }

    /// Public withdraw from source escrow (anyone can call)
    public entry fun public_withdraw_src<T>(
        clock: &Clock,
        escrow: SrcEscrow<T>,
        secret: vector<u8>,
        ctx: &mut TxContext
    ) {
        let escrow_id = object::id(&escrow);
        
        escrow_src::public_withdraw<T>(clock, escrow, secret, ctx);


    }

    /// Withdraw from destination escrow (anyone can call)
    public entry fun withdraw_dst<T>(
        clock: &Clock,
        escrow: DstEscrow<T>,
        secret: vector<u8>,
        ctx: &mut TxContext
    ) {
        let escrow_id = object::id(&escrow);
        
        escrow_dst::withdraw<T>(clock, escrow, secret, ctx);

    }

    /// Public withdraw from destination escrow (anyone can call)
    public entry fun public_withdraw_dst<T>(
        clock: &Clock,
        escrow: DstEscrow<T>,
        secret: vector<u8>,
        ctx: &mut TxContext
    ) {
        let escrow_id = object::id(&escrow);
        
        escrow_dst::public_withdraw<T>(clock, escrow, secret, ctx);

    }

    /// Cancel source escrow (anyone can call)
    public entry fun cancel_src<T>(
        clock: &Clock,
        escrow: SrcEscrow<T>,
        ctx: &mut TxContext
    ) {
        let escrow_id = object::id(&escrow);
        
        escrow_src::cancel<T>(clock, escrow, ctx);

  
    }

    /// Public cancel source escrow (anyone can call)
    public entry fun public_cancel_src<T>(
        clock: &Clock,
        escrow: SrcEscrow<T>,
        ctx: &mut TxContext
    ) {
        let escrow_id = object::id(&escrow);
        
        escrow_src::public_cancel<T>(clock, escrow, ctx);

    }

    /// Cancel destination escrow (anyone can call)
    public entry fun cancel_dst<T>(
        clock: &Clock,
        escrow: DstEscrow<T>,
        ctx: &mut TxContext
    ) {
        let escrow_id = object::id(&escrow);
        
        escrow_dst::cancel<T>(clock, escrow, ctx);

    }

    /// Get resolver owner
    public fun owner(resolver: &Resolver): address {
        resolver.owner
    }


}
