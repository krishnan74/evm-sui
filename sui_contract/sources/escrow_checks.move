module sui_contract::escrow_checks {
    use sui::coin::{Coin};
    use sui::clock::{Clock, timestamp_ms};
    use sui::hash;
    use sui_contract::escrow_structs::{
        Immutables, 
        taker, 
        maker, 
        hashlock, 
        timelocks,
        src_withdrawal_time,
        src_public_withdrawal_time,
        src_cancellation_time,
        src_public_cancellation_time,
        dst_withdrawal_time,
        dst_public_withdrawal_time,
        dst_cancellation_time
    };

    // Error codes
    const E_NOT_TAKER: u64 = 1;
    // const E_INVALID_SECRET: u64 = 2;
    const E_INVALID_SECRET_LENGTH: u64 = 3;
    const E_INVALID_HASH_LENGTH: u64 = 4;
    const E_INVALID_TIME_BEFORE: u64 = 5;
    const E_INVALID_TIME_AFTER: u64 = 6;
    const E_HASH_MISMATCH: u64 = 7;

    public fun only_taker(ctx: &TxContext, immutables: &Immutables) {
        assert!(tx_context::sender(ctx) == taker(immutables), E_NOT_TAKER);
    }

    public fun only_maker(ctx: &TxContext, immutables: &Immutables) {
        assert!(tx_context::sender(ctx) == maker(immutables), E_NOT_TAKER);
    }

    public fun only_valid_secret(secret: String, immutables: &Immutables) {
        assert!(vector::length(&secret) > 0, E_INVALID_SECRET_LENGTH);
        let hash = hash::keccak256(&secret);
        assert!(vector::length(&hash) == 32, E_INVALID_HASH_LENGTH);
        assert!(hash == hashlock(immutables), E_HASH_MISMATCH);
    }

    public fun only_after(clock: &Clock, start: u64) {
        let current_time = timestamp_ms(clock);
        assert!(current_time >= start, E_INVALID_TIME_AFTER);
    }

    public fun only_before(clock: &Clock, stop: u64) {
        let current_time = timestamp_ms(clock);
        assert!(current_time < stop, E_INVALID_TIME_BEFORE);
    }

    // Time check helpers for source escrow
    public fun check_src_withdrawal_time(clock: &Clock, immutables: &Immutables) {
        let timelocks = timelocks(immutables);
        only_after(clock, src_withdrawal_time(&timelocks));
        only_before(clock, src_cancellation_time(&timelocks));
    }

    public fun check_src_public_withdrawal_time(clock: &Clock, immutables: &Immutables) {
        let timelocks = timelocks(immutables);
        only_after(clock, src_public_withdrawal_time(&timelocks));
        only_before(clock, src_cancellation_time(&timelocks));
    }

    public fun check_src_cancellation_time(clock: &Clock, immutables: &Immutables) {
        let timelocks = timelocks(immutables);
        only_after(clock, src_cancellation_time(&timelocks));
    }

    public fun check_src_public_cancellation_time(clock: &Clock, immutables: &Immutables) {
        let timelocks = timelocks(immutables);
        only_after(clock, src_public_cancellation_time(&timelocks));
    }

    // Time check helpers for destination escrow
    public fun check_dst_withdrawal_time(clock: &Clock, immutables: &Immutables) {
        let timelocks = timelocks(immutables);
        only_after(clock, dst_withdrawal_time(&timelocks));
        only_before(clock, dst_cancellation_time(&timelocks));
    }

    public fun check_dst_public_withdrawal_time(clock: &Clock, immutables: &Immutables) {
        let timelocks = timelocks(immutables);
        only_after(clock, dst_public_withdrawal_time(&timelocks));
        only_before(clock, dst_cancellation_time(&timelocks));
    }

    public fun check_dst_cancellation_time(clock: &Clock, immutables: &Immutables) {
        let timelocks = timelocks(immutables);
        only_after(clock, dst_cancellation_time(&timelocks));
    }

    public fun sui_transfer<T>(coin: Coin<T>, to: address) {
        transfer::public_transfer(coin, to);
    }

    public fun keccak_bytes32(secret: String) : String {
        let hash = hash::keccak256(&secret);
        assert!(vector::length(&hash) == 32, E_INVALID_HASH_LENGTH);
        hash
    }
}
