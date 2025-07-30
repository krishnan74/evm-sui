module sui_contract::escrow_src {
    use sui::coin::{Coin};
    use sui::tx_context::{TxContext, sender};
    use sui::clock::{Clock};
    use sui::event;
    use sui_contract::escrow_structs::{Immutables, Timelocks};
    use sui_contract::escrow_checks;

    public struct SrcEscrow has key, store {
        id: UID,
        immutables: Immutables,
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
        mut escrow: SrcEscrow,
        secret: vector<u8>,
        ctx: &mut TxContext
    ) {
        assert!(!escrow.claimed && !escrow.cancelled, 100);
        escrow_checks::only_valid_secret(secret, escrow.immutables);
        escrow_checks::only_taker(ctx, escrow.immutables);
        escrow_checks::only_after(clock, escrow.immutables.timelocks.src_withdrawal);
        escrow_checks::only_before(clock, escrow.immutables.timelocks.src_cancellation);
        // Transfer coin to taker (pseudo, actual coin logic needed)
        // escrow_checks::sui_transfer(coin, escrow.immutables.taker);
        escrow.claimed = true;
        event::emit(WithdrawalEvent { secret });
    }

    /// Public withdraw
    public entry fun public_withdraw(
        clock: &Clock,
        mut escrow: SrcEscrow,
        secret: vector<u8>,
        ctx: &mut TxContext
    ) {
        assert!(!escrow.claimed && !escrow.cancelled, 110);
        escrow_checks::only_valid_secret(secret, escrow.immutables);
        escrow_checks::only_after(clock, escrow.immutables.timelocks.src_public_withdrawal);
        escrow_checks::only_before(clock, escrow.immutables.timelocks.src_cancellation);
        // Transfer coin to taker (pseudo)
        // escrow_checks::sui_transfer(coin, escrow.immutables.taker);
        escrow.claimed = true;
        event::emit(WithdrawalEvent { secret });
    }

    /// Cancel (private)
    public entry fun cancel(
        clock: &Clock,
        mut escrow: SrcEscrow,
        ctx: &mut TxContext
    ) {
        assert!(!escrow.claimed && !escrow.cancelled, 120);
        escrow_checks::only_taker(ctx, escrow.immutables);
        escrow_checks::only_after(clock, escrow.immutables.timelocks.src_cancellation);
        // Transfer coin to maker (pseudo)
        // escrow_checks::sui_transfer(coin, escrow.immutables.maker);
        escrow.cancelled = true;
        event::emit(EscrowCancelledEvent {});
    }

    /// Public cancel
    public entry fun public_cancel(
        clock: &Clock,
        mut escrow: SrcEscrow,
        ctx: &mut TxContext
    ) {
        assert!(!escrow.claimed && !escrow.cancelled, 130);
        escrow_checks::only_after(clock, escrow.immutables.timelocks.src_public_cancellation);
        // Transfer coin to maker (pseudo)
        // escrow_checks::sui_transfer(coin, escrow.immutables.maker);
        escrow.cancelled = true;
        event::emit(EscrowCancelledEvent {});
    }
}
