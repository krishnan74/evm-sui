module sui_contract::escrow_factory {
    use std::string::String;
    use sui::coin;
    use sui::coin::Coin;
    use sui::bcs;
    use sui::object::{UID};
    use sui::tx_context::{TxContext, sender};
    use sui::clock::{Clock, timestamp_ms};
    use sui::event;
    use sui::transfer;
    use sui_contract::escrow_structs::{
        Immutables,
        DstImmutablesComplement,
        Timelocks,
        new_immutables,
        new_dst_immutables_complement,
        new_timelocks,
        dst_cancellation_time
    };
    use sui_contract::escrow_src::{Self, SrcEscrow};
    use sui_contract::escrow_dst::{Self, DstEscrow};

    // Error codes
    const E_INSUFFICIENT_COIN_AMOUNT: u64 = 300;
    const E_INSUFFICIENT_SAFETY_DEPOSIT: u64 = 301;
    const E_INVALID_CREATION_TIME: u64 = 302;

    public struct EscrowFactory has key {
        id: UID,
        owner: address,
    }

    public struct SrcEscrowCreated has copy, drop, store {
        escrow_id: address,
        src_immutables: Immutables,
        dst_immutables_complement: DstImmutablesComplement,
    }

    public struct DstEscrowCreated has copy, drop, store {
        escrow_id: address,
        hashlock: vector<u8>,
        taker: address,
    }

    /// Initialize the factory
    fun init(ctx: &mut TxContext) {
        let factory = EscrowFactory {
            id: object::new(ctx),
            owner: sender(ctx),
        };
        transfer::share_object(factory);
    }

    /// Create source escrow
    public entry fun create_src_escrow<T>(
        clock: &Clock,
        coin: Coin<T>,
        safety_deposit_coin: Coin<T>,
        order_hash: String,
        hashlock: vector<u8>,
        maker: address,
        taker: address,
        token: address,
        amount: u64,
        safety_deposit: u64,
        src_withdrawal: u64,
        src_public_withdrawal: u64,
        src_cancellation: u64,
        src_public_cancellation: u64,
        dst_withdrawal: u64,
        dst_public_withdrawal: u64,
        dst_cancellation: u64,
        // Destination chain info
        dst_chain_id: u64,
        dst_token: address,
        dst_amount: u64,
        dst_safety_deposit: u64,
        ctx: &mut TxContext
    ) {
        // Validate coin amounts
        assert!(coin::value(&coin) >= amount, E_INSUFFICIENT_COIN_AMOUNT);
        assert!(coin::value(&safety_deposit_coin) >= safety_deposit, E_INSUFFICIENT_SAFETY_DEPOSIT);

        let current_time = timestamp_ms(clock);
        let timelocks = new_timelocks(
            src_withdrawal,
            src_public_withdrawal,
            src_cancellation,
            src_public_cancellation,
            dst_withdrawal,
            dst_public_withdrawal,
            dst_cancellation,
            current_time,
        );

        let immutables = new_immutables(
            order_hash,
            hashlock,
            maker,
            taker,
            token,
            amount,
            safety_deposit,
            timelocks
        );

        let dst_immutables_complement = new_dst_immutables_complement(
            maker,
            dst_amount,
            dst_token,
            dst_safety_deposit,
            dst_chain_id
        );

        let escrow = escrow_src::create_src_escrow(
            coin,
            safety_deposit_coin,
            immutables,
            ctx
        );

        let escrow_id = object::id_address(&escrow);
        sui::transfer::public_share_object(escrow);

        event::emit(SrcEscrowCreated {
            escrow_id,
            src_immutables: immutables,
            dst_immutables_complement,
        });
    }

    /// Create destination escrow
    public entry fun create_dst_escrow<T>(
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
        dst_withdrawal: u64,
        dst_public_withdrawal: u64,
        dst_cancellation: u64,
        src_cancellation_timestamp: u64,
        deployed_at: u64,
        ctx: &mut TxContext
    ) {
        // Validate coin amounts
        assert!(coin::value(&coin) >= amount, E_INSUFFICIENT_COIN_AMOUNT);
        assert!(coin::value(&safety_deposit_coin) >= safety_deposit, E_INSUFFICIENT_SAFETY_DEPOSIT);
        
        // Create minimal timelocks for dst (only dst times matter)
        let timelocks = new_timelocks(
            0, // src_withdrawal
            0, // src_public_withdrawal
            0, // src_cancellation
            0, // src_public_cancellation
            dst_withdrawal,
            dst_public_withdrawal,
            dst_cancellation,
            deployed_at,
        );

        // Check that dst cancellation starts before src cancellation
        assert!(dst_cancellation_time(&timelocks) <= src_cancellation_timestamp, E_INVALID_CREATION_TIME);

        let immutables = new_immutables(
            order_hash,
            hashlock,
            maker,
            taker,
            token,
            amount,
            safety_deposit,
            timelocks
        );

        let escrow = escrow_dst::create_dst_escrow(
            coin,
            safety_deposit_coin,
            immutables,
            ctx
        );

        let escrow_id = object::id_address(&escrow);
        sui::transfer::public_share_object(escrow);

        event::emit(DstEscrowCreated {
            escrow_id,
            hashlock,
            taker,
        });
    }

    // public entry fun execute_src_escrow_with_intent<T>(
    //     factory: &EscrowFactory,
    //     clock: &Clock,
    //     coin: Coin<T>,
    //     safety_deposit_coin: Coin<T>,
    //     intent_data: vector<u8>,
    //     signature: vector<u8>,
    //     user_address: address,
    //     ctx: &mut TxContext
    // ) {

    //         // 1. Verify signature
    //     let valid = sui::signature::verify(intent_data, signature, user_address);
    //     assert!(valid, E_INVALID_SIGNATURE);

    //     // 2. Deserialize intent_data to get all params
    //     let params = bcs::from_bytes<CreateSrcEscrowIntent>(intent_data);

    //     // 3. Call create_src_escrow() with params
    //     create_src_escrow<T>(
    //         factory,
    //         clock,
    //         coin,
    //         safety_deposit_coin,
    //         params.order_hash,
    //         params.hashlock,
    //         params.maker,
    //         params.taker,
    //         params.token,
    //         params.amount,
    //         params.safety_deposit,
    //         params.src_withdrawal,
    //         params.src_public_withdrawal,
    //         params.src_cancellation,
    //         params.src_public_cancellation,
    //         params.dst_withdrawal,
    //         params.dst_public_withdrawal,
    //         params.dst_cancellation,
    //         params.dst_chain_id,
    //         params.dst_token,
    //         params.dst_amount,
    //         params.dst_safety_deposit,
    //         ctx
    //     );
    // }
}