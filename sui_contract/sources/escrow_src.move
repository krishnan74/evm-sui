module sui_contract::escrow_src {
    use std::string::String;
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
        check_src_withdrawal_time,
        check_src_public_withdrawal_time,
        check_src_cancellation_time,
        check_src_public_cancellation_time,
        sui_transfer
    };

    // Error codes
    const E_ALREADY_CLAIMED: u64 = 100;
    const E_ALREADY_CANCELLED: u64 = 101;
    // const E_INSUFFICIENT_BALANCE: u64 = 102;

    public struct EscrowedCoinKey has copy, drop, store {}
    public struct SafetyDepositKey has copy, drop, store {}

    public struct SrcEscrow<phantom T> has key, store {
        id: UID,
        immutables: Immutables,
        claimed: bool,
        cancelled: bool,
    }

    public struct WithdrawalEvent has copy, drop, store {
        secret: vector<u8>,
        recipient: address,
    }

    public struct EscrowCancelledEvent has copy, drop, store {
        recipient: address,
    }

    /// Create source escrow with coin and safety deposit
    public fun create_src_escrow<T>(
        coin: Coin<T>,
        safety_deposit_coin: Coin<T>, // For simplicity, using same token type
        immutables: Immutables,
        ctx: &mut TxContext
    ): SrcEscrow<T> {
        let mut id = object::new(ctx);
        
        // Store the main coin and safety deposit
        dof::add(&mut id, EscrowedCoinKey {}, coin);
        dof::add(&mut id, SafetyDepositKey {}, safety_deposit_coin);

        SrcEscrow {
            id,
            immutables,
            claimed: false,
            cancelled: false,
        }
    }

    /// Private withdrawal - only taker with valid secret during withdrawal period
    public entry fun withdraw<T>(
        clock: &Clock,
        mut escrow: SrcEscrow<T>,
        secret: vector<u8>,
        ctx: &mut TxContext
    ) {
        assert!(!escrow.claimed && !escrow.cancelled, E_ALREADY_CLAIMED);
        
        only_taker(ctx, &escrow.immutables);
        only_valid_secret(secret, &escrow.immutables);
        check_src_withdrawal_time(clock, &escrow.immutables);
        
        withdraw_internal(&mut escrow, secret, sender(ctx), ctx);
        // Destroy escrow after withdrawal
        destroy_escrow(escrow);
    }

    /// Withdraw to specific target
    public entry fun withdraw_to<T>(
        clock: &Clock,
        mut escrow: SrcEscrow<T>,
        secret: vector<u8>,
        target: address,
        ctx: &mut TxContext
    ) {
        assert!(!escrow.claimed && !escrow.cancelled, E_ALREADY_CLAIMED);
        
        only_taker(ctx, &escrow.immutables);
        only_valid_secret(secret, &escrow.immutables);
        check_src_withdrawal_time(clock, &escrow.immutables);
        
        withdraw_internal(&mut escrow, secret, target, ctx);
        // Destroy escrow after withdrawal
        destroy_escrow(escrow);
    }

    /// Public withdrawal - anyone with valid secret during public withdrawal period
    public entry fun public_withdraw<T>(
        clock: &Clock,
        mut escrow: SrcEscrow<T>,
        secret: vector<u8>,
        ctx: &mut TxContext
    ) {
        assert!(!escrow.claimed && !escrow.cancelled, E_ALREADY_CLAIMED);
        
        only_valid_secret(secret, &escrow.immutables);
        check_src_public_withdrawal_time(clock, &escrow.immutables);
        
        let taker_addr = taker(&escrow.immutables);
        withdraw_internal(&mut escrow, secret, taker_addr, ctx);
        // Destroy escrow after public withdrawal
        destroy_escrow(escrow);
    }

    /// Private cancellation - only taker after cancellation period
    public entry fun cancel<T>(
        clock: &Clock,
        mut escrow: SrcEscrow<T>,
        ctx: &mut TxContext
    ) {
        assert!(!escrow.claimed && !escrow.cancelled, E_ALREADY_CANCELLED);
        
        only_taker(ctx, &escrow.immutables);
        check_src_cancellation_time(clock, &escrow.immutables);
        
        cancel_internal(&mut escrow, ctx);
        // Destroy escrow after cancellation
        destroy_escrow(escrow);
    }

    /// Public cancellation - anyone after public cancellation period
    public entry fun public_cancel<T>(
        clock: &Clock,
        mut escrow: SrcEscrow<T>,
        ctx: &mut TxContext
    ) {
        assert!(!escrow.claimed && !escrow.cancelled, E_ALREADY_CANCELLED);
        
        check_src_public_cancellation_time(clock, &escrow.immutables);
        
        cancel_internal(&mut escrow, ctx);
        // Destroy escrow after public cancellation
        destroy_escrow(escrow);
    }

    /// Internal withdrawal logic
    fun withdraw_internal<T>(
        escrow: &mut SrcEscrow<T>,
        secret: vector<u8>,
        target: address,
        ctx: &mut TxContext
    ) {
        escrow.claimed = true;
        
        // Transfer main coin to target
        let coin = dof::remove<EscrowedCoinKey, Coin<T>>(&mut escrow.id, EscrowedCoinKey {});
        sui_transfer(coin, target);
        
        // Transfer safety deposit to caller
        let safety_deposit = dof::remove<SafetyDepositKey, Coin<T>>(&mut escrow.id, SafetyDepositKey {});
        sui_transfer(safety_deposit, sender(ctx));
        
        event::emit(WithdrawalEvent { 
            secret, 
            recipient: target 
        });
    }

    /// Internal cancellation logic
    fun cancel_internal<T>(
        escrow: &mut SrcEscrow<T>,
        ctx: &mut TxContext
    ) {
        escrow.cancelled = true;
        
        let maker_addr = maker(&escrow.immutables);
        
        // Return main coin to maker
        let coin = dof::remove<EscrowedCoinKey, Coin<T>>(&mut escrow.id, EscrowedCoinKey {});
        sui_transfer(coin, maker_addr);
        
        // Return safety deposit to caller
        let safety_deposit = dof::remove<SafetyDepositKey, Coin<T>>(&mut escrow.id, SafetyDepositKey {});
        sui_transfer(safety_deposit, sender(ctx));
        
        event::emit(EscrowCancelledEvent { 
            recipient: maker_addr 
        });
    }

    /// Destroy empty escrow
    public fun destroy_escrow<T>(escrow: SrcEscrow<T>) {
        let SrcEscrow { id, immutables: _, claimed: _, cancelled: _ } = escrow;
        object::delete(id);
    }
}
