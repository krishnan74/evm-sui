module sui_contract::escrow_checks {
    use sui::coin::{Coin};
    use sui::clock::{Clock, timestamp_ms};
    use sui_contract::escrow_structs::{Immutables, taker, hashlock};
    use sui::hash;

    public fun only_taker(ctx: &TxContext, immutables: Immutables) {
        assert!(tx_context::sender(ctx) == taker(&immutables), 0);
    }

    public fun only_valid_secret(secret: vector<u8>, immutables: Immutables) {
        assert!(vector::length(&secret) > 0, 1);
        let hash = hash::keccak256(&secret);
        assert!(vector::length(&hash) == 32, 2);
        assert!(hash == hashlock(&immutables), 3);
    }

    public fun only_after(clock: &Clock, start: u64) {
        let current_time = timestamp_ms(clock);
        assert!(current_time >= start, 3);
    }

    public fun only_before(clock: &Clock, stop: u64) {
        let current_time = timestamp_ms(clock);
        assert!(current_time < stop, 4);
    }

    public fun sui_transfer<T>(coin: Coin<T>, to: address) {
        transfer::public_transfer(coin, to);
    }

    public fun keccakBytes32(secret: vector<u8>) : vector<u8> {
        let hash = hash::keccak256(&secret);
        assert!(vector::length(&hash) == 32, 5);
        hash
    }
}
