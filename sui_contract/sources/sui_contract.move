module sui_contract::htlc {
    use sui::dynamic_object_field as dof;
    use sui::coin::{Coin};
    use sui::coin;
    use sui::event;
    use sui::hash;
    use sui::clock::{Clock};
    use sui_contract::escrow_checks;
    use sui_contract::escrow_structs::{Immutables, DstImmutablesComplement,Timelocks, new_immutables, new_dst_immutables_complement};

    public struct EscrowedObjectKey has copy, drop, store {}

    public struct SourceEscrow<phantom T: key + store> has key, store{
        id: UID,
        immutables: Immutables,
    }

    public struct DestEscrow<phantom T: store> has key, store {
        id: UID,
        immutables: DstImmutablesComplement,
    }

    public struct SrcEscrowCreated<T: copy + drop> has copy, drop, store {
        src_immutables: Immutables,
        dst_immutables_complement: DstImmutablesComplement,
    }

    public struct DstEscrowCreated<T> has store {
        swap_id: UID,
        hashlock: vector<u8>,
        taker: address,
    }

    public struct SwapRefundedEvent<T: copy + drop> has copy, drop, store {
        sender: address,
        amount: u64,
    }

    public struct SwapClaimedEvent<T: copy + drop> has copy, drop, store {
        recipient: address,
        amount: u64,
    }

    // Create the swap and store the coin in it
    public fun create_src_escrow<T: store + copy + drop>(
        order: SwapOrder<T>,
        taker: address,
        hashlock: vector<u8>,
        timelock: Timelocks,
        ctx: &mut TxContext
    ) {
        let uid = object::new(ctx);
        let sender = tx_context::sender(ctx);

        let immutables = new_immutables (
            hashlock,
            order.order_info.maker,
            taker,
            address(0), 
            amount,
            safety_deposit: 0,
            timelocks: timelock,
        );

        let dst_immutables_complement = new_dst_immutables_complement {
            maker: order.order_info.maker,
            amount: order.order_info.amount,
            token: coin::coin_type(&coin),
            safety_deposit: order.order_info.safety_deposit,
            chain_id: order.order_info.chain_id,
        };

        let src_escrow = SourceEscrow {
            id: uid,
            immutables,
        };

       dof::add(&mut src_escrow.id, EscrowedObjectKey {}, escrowed);

        let event = SrcEscrowCreated<T> { immutables, dst_immutables_complement };
        event::emit(event);
    }

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

   
}
