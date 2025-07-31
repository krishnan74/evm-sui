module sui_contract::escrow_structs {
    
    public struct SwapOrder<T: store> has key, store {
        id: UID,
        order_info: OrderInfo,
        escrow_params: EscrowParams,
        details: Details,
    }

    public struct OrderInfo has copy, drop, store {
        salt: String,
        maker: address,
        taker: address,
        making_amount: u64,
        taking_amount: u64,
        maker_asset: address,
        taker_asset: address,
    }

    public struct EscrowParams has copy, drop, store {
        hashlock: String,
        timelocks: Timelocks,
        src_safety_deposit: u64,
        dst_safety_deposit: u64,
    }

    public struct Details has copy, drop, store {
        auction: AuctionDetails,
        whitelist: vector<address>,
    }

    public struct AuctionDetails has copy, drop, store {
        start_time: u64,
        duration: u64,
        initial_rate_bump: u64,
    }

    public struct Immutables has copy, drop, store {
        order_hash: String,
        hashlock: String,
        maker: address,
        taker: address,
        token: address,
        amount: u64,
        safety_deposit: u64,
        timelocks: Timelocks,
    }

    public struct DstImmutablesComplement has copy, drop, store {
        maker: address,
        amount: u64,
        token: address,
        safety_deposit: u64,
        chain_id: u64,
    }

    public struct Timelocks has copy, drop, store {
        src_withdrawal: u64,
        src_public_withdrawal: u64,
        src_cancellation: u64,
        src_public_cancellation: u64,
        dst_withdrawal: u64,
        dst_public_withdrawal: u64,
        dst_cancellation: u64,
        deployed_at: u64,
    }

    // Accessor functions
    public fun taker(immutables: &Immutables): address {
        immutables.taker
    }

    public fun maker(immutables: &Immutables): address {
        immutables.maker
    }

    public fun hashlock(immutables: &Immutables): vector<u8> {
        immutables.hashlock
    }

    public fun token(immutables: &Immutables): address {
        immutables.token
    }

    public fun amount(immutables: &Immutables): u64 {
        immutables.amount
    }

    public fun safety_deposit(immutables: &Immutables): u64 {
        immutables.safety_deposit
    }

    public fun timelocks(immutables: &Immutables): Timelocks {
        immutables.timelocks
    }

    // Constructor functions
    public fun new_immutables(
        order_hash: String,
        hashlock: String,
        maker: address,
        taker: address,
        token: address,
        amount: u64,
        safety_deposit: u64,
        timelocks: Timelocks
    ): Immutables {
        Immutables {
            order_hash,
            hashlock,
            maker,
            taker,
            token,
            amount,
            safety_deposit,
            timelocks,
        }
    }

    public fun new_dst_immutables_complement(
        maker: address,
        amount: u64,
        token: address,
        safety_deposit: u64,
        chain_id: u64
    ): DstImmutablesComplement {
        DstImmutablesComplement {
            maker,
            amount,
            token,
            safety_deposit,
            chain_id,
        }
    }

    public fun new_timelocks(
        src_withdrawal: u64,
        src_public_withdrawal: u64,
        src_cancellation: u64,
        src_public_cancellation: u64,
        dst_withdrawal: u64,
        dst_public_withdrawal: u64,
        dst_cancellation: u64,
        deployed_at: u64,
    ): Timelocks {
        Timelocks {
            src_withdrawal,
            src_public_withdrawal,
            src_cancellation,
            src_public_cancellation,
            dst_withdrawal,
            dst_public_withdrawal,
            dst_cancellation,
            deployed_at,
        }
    }

    public fun new_order_info(
        salt: String,
        maker: address,
        taker: address,
        making_amount: u64,
        taking_amount: u64,
        maker_asset: address,
        taker_asset: address
    ): OrderInfo {
        OrderInfo {
            salt,
            maker,
            taker,
            making_amount,
            taking_amount,
            maker_asset,
            taker_asset
        }
    }

    // Timelock accessor functions
    public fun src_withdrawal_time(timelocks: &Timelocks): u64 {
        timelocks.deployed_at + timelocks.src_withdrawal
    }

    public fun src_public_withdrawal_time(timelocks: &Timelocks): u64 {
        timelocks.deployed_at + timelocks.src_public_withdrawal
    }

    public fun src_cancellation_time(timelocks: &Timelocks): u64 {
        timelocks.deployed_at + timelocks.src_cancellation
    }

    public fun src_public_cancellation_time(timelocks: &Timelocks): u64 {
        timelocks.deployed_at + timelocks.src_public_cancellation
    }

    public fun dst_withdrawal_time(timelocks: &Timelocks): u64 {
        timelocks.deployed_at + timelocks.dst_withdrawal
    }

    public fun dst_public_withdrawal_time(timelocks: &Timelocks): u64 {
        timelocks.deployed_at + timelocks.dst_public_withdrawal
    }

    public fun dst_cancellation_time(timelocks: &Timelocks): u64 {
        timelocks.deployed_at + timelocks.dst_cancellation
    }
}
