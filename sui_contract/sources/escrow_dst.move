module sui_contract::escrow_dst {
    use sui::coin::{Coin};
    use sui::tx_context::{TxContext, sender};
    use sui::clock::{Clock};
    use sui::event;
    use sui_contract::escrow_structs::{DstImmutablesComplement, Timelocks};
    use sui_contract::escrow_checks;

    public struct DstEscrow has key, store {
        id: UID,
        immutables: DstImmutablesComplement,
        claimed: bool,
        cancelled: bool,
    }

    public struct WithdrawalEvent has copy, drop, store {
        secret: vector<u8>,
    }
    public struct EscrowCancelledEvent has copy, drop, store {}

    /// Withdraw (private)
    public entry fun withdraw(
        clock: &Clock,
        mut escrow: DstEscrow,
        secret: vector<u8>,
        ctx: &mut TxContext
    ) {
        assert!(!escrow.claimed && !escrow.cancelled, 200);
        // Only taker check if needed
        // escrow_checks::only_taker(ctx, ...); // DstImmutablesComplement may need taker field
        // Secret check if needed
        // Time checks
        // escrow_checks::only_after(clock, ...); // Add correct timelock field
        // escrow_checks::only_before(clock, ...);
        // Transfer coin to maker/taker as needed (pseudo)
        // escrow_checks::sui_transfer(coin, ...);
        escrow.claimed = true;
        event::emit(WithdrawalEvent { secret });
    }

    /// Public withdraw
    public entry fun public_withdraw(
        clock: &Clock,
        mut escrow: DstEscrow,
        secret: vector<u8>,
        ctx: &mut TxContext
    ) {
        assert!(!escrow.claimed && !escrow.cancelled, 210);
        // Time checks
        // escrow_checks::only_after(clock, ...);
        // escrow_checks::only_before(clock, ...);
        // Transfer coin to maker/taker as needed (pseudo)
        // escrow_checks::sui_transfer(coin, ...);
        escrow.claimed = true;
        event::emit(WithdrawalEvent { secret });
    }

    /// Cancel (private)
    public entry fun cancel(
        clock: &Clock,
        mut escrow: DstEscrow,
        ctx: &mut TxContext
    ) {
        assert!(!escrow.claimed && !escrow.cancelled, 220);
        // Only taker check if needed
        // Time checks
        // escrow_checks::only_after(clock, ...);
        // Transfer coin to taker/maker as needed (pseudo)
        // escrow_checks::sui_transfer(coin, ...);
        escrow.cancelled = true;
        event::emit(EscrowCancelledEvent {});
    }
}
