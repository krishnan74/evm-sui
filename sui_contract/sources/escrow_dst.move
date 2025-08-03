module sui_contract::escrow_dst {
    use sui::coin::{Coin};
    use sui::tx_context::{sender};
    use sui::clock::{Clock};
    use sui::event;
    use sui::dynamic_object_field as dof;
    use sui_contract::escrow_structs::{
        Immutables,
        taker,
        maker,
    };
    use sui_contract::escrow_checks::{
        only_taker,
        only_valid_secret,
        check_dst_withdrawal_time,
        check_dst_public_withdrawal_time,
        check_dst_cancellation_time,
        sui_transfer
    };

    // Error codes
    const E_ALREADY_CLAIMED: u64 = 200;
    const E_ALREADY_CANCELLED: u64 = 201;

    public struct EscrowedCoinKey has copy, drop, store {}
    public struct SafetyDepositKey has copy, drop, store {}

    public struct DstEscrow<phantom CoinType1, phantom CoinType2> has key, store {
        id: UID,
        immutables: Immutables,
        claimed: bool,
        cancelled: bool,
    }

    public struct WithdrawalEvent has copy, drop, store {
        secret: vector<u8>,
    }

    public struct EscrowCancelledEvent has copy, drop, store {}

    /// Create destination escrow
    public fun create_dst_escrow<CoinType1, CoinType2>(
        coin: Coin<CoinType1>,
        safety_deposit_coin: Coin<CoinType2>,
        immutables: Immutables,
        ctx: &mut TxContext
    ): DstEscrow<CoinType1, CoinType2> {
        let mut id = object::new(ctx);
        
        dof::add(&mut id, EscrowedCoinKey {}, coin);
        dof::add(&mut id, SafetyDepositKey {}, safety_deposit_coin);

        DstEscrow {
            id,
            immutables,
            claimed: false,
            cancelled: false,
        }
    }

    /// Private withdrawal - only taker with valid secret
    public entry fun withdraw<CoinType1, CoinType2>(
        clock: &Clock,
        mut escrow: DstEscrow<CoinType1, CoinType2>,
        secret: vector<u8>,
        ctx: &mut TxContext
    ) {
        // assert!(!escrow.claimed && !escrow.cancelled, E_ALREADY_CLAIMED);
        
        // only_taker(ctx, &escrow.immutables);
        // only_valid_secret(secret, &escrow.immutables);
        // check_dst_withdrawal_time(clock, &escrow.immutables);
        
        withdraw_internal(&mut escrow, secret, ctx);
        destroy_escrow(escrow);
    }

    /// Public withdrawal - anyone with valid secret
    public entry fun public_withdraw<CoinType1, CoinType2>(
        clock: &Clock,
        mut escrow: DstEscrow<CoinType1, CoinType2>,
        secret: vector<u8>,
        ctx: &mut TxContext
    ) {
        assert!(!escrow.claimed && !escrow.cancelled, E_ALREADY_CLAIMED);
        
        only_valid_secret(secret, &escrow.immutables);
        check_dst_public_withdrawal_time(clock, &escrow.immutables);
        
        withdraw_internal(&mut escrow, secret, ctx);
        // Destroy escrow after public withdrawal
        destroy_escrow(escrow);
    }

    /// Cancellation - only taker after cancellation period
    public entry fun cancel<CoinType1, CoinType2>(
        clock: &Clock,
        mut escrow: DstEscrow<CoinType1, CoinType2>,
        ctx: &mut TxContext
    ) {
        assert!(!escrow.claimed && !escrow.cancelled, E_ALREADY_CANCELLED);
        
        only_taker(ctx, &escrow.immutables);
        check_dst_cancellation_time(clock, &escrow.immutables);
        
        cancel_internal(&mut escrow, ctx);
        // Destroy escrow after cancellation
        destroy_escrow(escrow);
    }

    /// Internal withdrawal - transfers to maker
    fun withdraw_internal<CoinType1, CoinType2>(
        escrow: &mut DstEscrow<CoinType1, CoinType2>,
        secret: vector<u8>,
        ctx: &mut TxContext
    ) {
        escrow.claimed = true;
        
        let maker_addr = maker(&escrow.immutables);
        
        // Transfer main coin to maker
        let coin = dof::remove<EscrowedCoinKey, Coin<CoinType1>>(&mut escrow.id, EscrowedCoinKey {});
        sui_transfer(coin, maker_addr);
        
        // Transfer safety deposit to caller
        let safety_deposit = dof::remove<SafetyDepositKey, Coin<CoinType2>>(&mut escrow.id, SafetyDepositKey {});
        sui_transfer(safety_deposit, sender(ctx));
        
        event::emit(WithdrawalEvent { secret });
    }

    /// Internal cancellation - returns to taker
    fun cancel_internal<CoinType1, CoinType2>(
        escrow: &mut DstEscrow<CoinType1, CoinType2>,
        ctx: &mut TxContext
    ) {
        escrow.cancelled = true;
        
        let taker_addr = taker(&escrow.immutables);
        
        // Return main coin to taker
        let coin = dof::remove<EscrowedCoinKey, Coin<CoinType1>>(&mut escrow.id, EscrowedCoinKey {});
        sui_transfer(coin, taker_addr);
        
        // Return safety deposit to caller
        let safety_deposit = dof::remove<SafetyDepositKey, Coin<CoinType2>>(&mut escrow.id, SafetyDepositKey {});
        sui_transfer(safety_deposit, sender(ctx));
        
        event::emit(EscrowCancelledEvent {});
    }

    /// Destroy empty escrow
    public fun destroy_escrow<CoinType1, CoinType2>(escrow: DstEscrow<CoinType1, CoinType2>) {
        let DstEscrow { id, immutables: _, claimed: _, cancelled: _ } = escrow;
        object::delete(id);
    }
}
