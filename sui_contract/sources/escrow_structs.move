module sui_contract::escrow_structs {
    
    public struct SwapOrder<T: store> has key, store {
        id: UID,
        order_info: OrderInfo,
        escrow_params: EscrowParams,
        details: Details,
    }

    public struct OrderInfo has copy, drop, store {
        salt: vector<u8>,
        maker: address,
        taker: address,
        making_amount: u64,
        taking_amount: u64,
        maker_asset: address,
        taker_asset: address,
    }

    public struct EscrowParams has copy, drop, store {
        hashlock: vector<u8>,
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
        hashlock: vector<u8>,
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
    }

    public fun taker(immutables: &Immutables): address {
        immutables.taker
    }

    public fun hashlock(immutables: &Immutables): vector<u8> {
        immutables.hashlock
    }

    /// Creates and returns a new Immutables object
    public fun new_immutables(
        hashlock: vector<u8>,
        maker: address,
        taker: address,
        token: address,
        amount: u64,
        safety_deposit: u64,
        timelocks: Timelocks
    ): Immutables {
        Immutables {
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

}
