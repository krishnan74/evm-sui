module sui_contract::escrow_structs {

    public struct Immutables has copy, drop, store {
        hashlock: vector<u8>,
        maker: address,
        taker: address,
        token: address,
        amount: u64,
        safetyDeposit: u64,
        timelocks: Timelocks,
    }

    public struct Timelocks has copy, drop, store {
        start: u64,
        end: u64,
    }

    public fun taker(immutables: &Immutables): address {
        immutables.taker
    }

    public fun hashlock(immutables: &Immutables): vector<u8> {
        immutables.hashlock
    }
}
