module sui_contract::escrow_structs {
    use std::string::String;

    public struct Order has copy, drop {
        salt: u256,
        maker: address,
        receiver: address,
        maker_asset: address,
        taker_asset: address,
        making_amount: u256,
        taking_amount: u256,
    }

    public struct AuctionData has copy, drop {
        start_time: u64,
        end_time: u64,
        taking_amount_start: u256,
        taking_amount_end: u256,
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
        order_hash: String,
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

    // Getter functions for Order
    public fun order_making_amount(order: &Order): u256 {
        order.making_amount 
    }

    public fun order_taking_amount(order: &Order): u256 {
        order.taking_amount
    }

    public fun order_maker(order: &Order): address {
        order.maker
    }

    public fun order_receiver(order: &Order): address {
        order.receiver
    }

    public fun order_maker_asset(order: &Order): address {
        order.maker_asset
    }

    public fun order_taker_asset(order: &Order): address {
        order.taker_asset
    }

    // Getter functions for AuctionData
    public fun auction_start_time(auction_data: &AuctionData): u64 {
        auction_data.start_time
    }

    public fun auction_end_time(auction_data: &AuctionData): u64 {
        auction_data.end_time
    }

    public fun auction_taking_amount_start(auction_data: &AuctionData): u256 {
        auction_data.taking_amount_start
    }

    public fun auction_taking_amount_end(auction_data: &AuctionData): u256 {
        auction_data.taking_amount_end
    }


    // Constructor functions
    public fun new_immutables(
        order_hash: String,
        hashlock: vector<u8>,
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

     /// Create a new Order struct
    public fun create_order(
        salt: u256,
        maker: address,
        receiver: address,
        maker_asset: address,
        taker_asset: address,
        making_amount: u256,
        taking_amount: u256
    ): Order {
        Order {
            salt,
            maker,
            receiver,
            maker_asset,
            taker_asset,
            making_amount,
            taking_amount,
        }
    }

    public fun create_auction_data(
        start_time: u64,
        end_time: u64,
        taking_amount_start: u256,
        taking_amount_end: u256
    ): AuctionData {
        AuctionData {
            start_time,
            end_time,
            taking_amount_start,
            taking_amount_end,
        }
    }

    // Timelock accessor functions
    public fun src_withdrawal_time(timelocks: &Timelocks): u64 {
        timelocks.src_withdrawal
    }

    public fun src_public_withdrawal_time(timelocks: &Timelocks): u64 {
        timelocks.src_public_withdrawal
    }

    public fun src_cancellation_time(timelocks: &Timelocks): u64 {
        timelocks.src_cancellation
    }

    public fun src_public_cancellation_time(timelocks: &Timelocks): u64 {
        timelocks.src_public_cancellation
    }

    public fun dst_withdrawal_time(timelocks: &Timelocks): u64 {
        timelocks.dst_withdrawal
    }

    public fun dst_public_withdrawal_time(timelocks: &Timelocks): u64 {
        timelocks.dst_public_withdrawal
    }

    public fun dst_cancellation_time(timelocks: &Timelocks): u64 {
        timelocks.dst_cancellation
    }
}
