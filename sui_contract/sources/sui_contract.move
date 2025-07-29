module sui_contract::htlc {
    use sui::coin::{Coin};
    use sui::coin;
    use sui::event;
    use sui::hash;
    use sui::clock::{Clock};

    /// The HTLC struct. Coin is stored in this object.
    public struct Swap<T: store> has key, store {
        id: UID,
        sender: address,
        recipient: address,
        hashlock: vector<u8>,
        timelock: u64,
        coin: Coin<T>,
    }

    public struct SwapInitiatedEvent<T: copy + drop> has copy, drop, store {
        sender: address,
        recipient: address,
        amount: u64,
    }

    public struct SwapClaimedEvent<T: copy + drop> has copy, drop, store {
        recipient: address,
        amount: u64,
    }

    public struct SwapRefundedEvent<T: copy + drop> has copy, drop, store {
        sender: address,
        amount: u64,
    }

    // Create the swap and store the coin in it
    public entry fun initiate_swap<T: store + copy + drop>(
        coin: Coin<T>,
        recipient: address,
        hashlock: vector<u8>,
        timelock: u64,
        ctx: &mut TxContext
    ) {
        let uid = object::new(ctx);
        let sender = tx_context::sender(ctx);
        let amount = coin::value(&coin);
        let swap = Swap {
            id: uid,
            sender,
            recipient,
            hashlock,
            timelock,
            coin,
        };
        transfer::public_transfer(swap, sender);
        let event = SwapInitiatedEvent<T> { sender, recipient, amount };
        event::emit(event);
    }

    public entry fun claim_swap<T: store + copy + drop>(
        _clock: &Clock,
        swap: Swap<T>,
        preimage: vector<u8>,
        ctx: &mut TxContext
    ) {
        let computed = hash::blake2b256(&preimage);
        assert!(computed == swap.hashlock, 101);
        assert!(tx_context::sender(ctx) == swap.recipient, 102);

        let Swap {
            id,
            sender: _,
            recipient,
            hashlock: _,
            timelock: _,
            coin,
        } = swap;

        let amount = coin::value(&coin);
        transfer::public_transfer(coin, tx_context::sender(ctx));
        let event = SwapClaimedEvent<T> { recipient, amount };
        event::emit(event);
        object::delete(id);
    }

    public entry fun refund_swap<T: store + copy + drop>(
        clock: &Clock,
        swap: Swap<T>,
        ctx: &mut TxContext
    ) {
        assert!(tx_context::sender(ctx) == swap.sender, 200);

        let current_time = clock.timestamp_ms() / 1000;
        assert!(current_time > swap.timelock, 202);

        let Swap {
            id,
            sender,
            recipient: _,
            hashlock: _,
            timelock: _,
            coin,
        } = swap;

        let amount = coin::value(&coin);
        transfer::public_transfer(coin, sender);
        let event = SwapRefundedEvent<T> { sender, amount };
        event::emit(event);

        object::delete(id);
    }
}
