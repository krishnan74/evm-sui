module sui_contract::htlc_test {
    use sui::coin::{Coin, mint, value};
    use sui::sui::SUI;
    use sui::tx_context::{TxContext, sender};
    use sui::clock::{Clock, new as new_clock};
    use sui::object;
    use sui_contract::htlc;
    use std::vector;

    const TEST_HASHLOCK: vector<u8> = b"testhash";
    const TEST_PREIMAGE: vector<u8> = b"testhash";
    const WRONG_PREIMAGE: vector<u8> = b"wrong";
    const TIMELOCK: u64 = 1000;

    #[test]
    fun test_initiate_and_claim_swap() {
        let mut ctx = TxContext::new_for_testing(@0x1);
        let recipient = @0x2;
        let coin = mint<SUI>(100, &mut ctx);

        // Initiate swap
        htlc::initiate_swap<Coin<SUI>>(coin, recipient, TEST_HASHLOCK, TIMELOCK, &mut ctx);

        // Get the swap object (simulate transfer to sender)
        let swap: htlc::Swap<SUI> = /* fetch from sender's objects */;
        let clock = new_clock(0);

        // Claim swap with correct preimage
        htlc::claim_swap<SUI>(&clock, swap, TEST_PREIMAGE, &mut ctx);
        // Assert recipient received the coin, etc.
    }

    #[test]
    #[expected_failure]
    fun test_claim_with_wrong_preimage_fails() {
        let mut ctx = TxContext::new_for_testing(@0x1);
        let recipient = @0x2;
        let coin = mint<SUI>(100, &mut ctx);

        htlc::initiate_swap<Coin<SUI>>(coin, recipient, TEST_HASHLOCK, TIMELOCK, &mut ctx);
        let swap: htlc::Swap<SUI> = /* fetch from sender's objects */;
        let clock = new_clock(0);

        // Should fail: wrong preimage
        htlc::claim_swap<SUI>(&clock, swap, WRONG_PREIMAGE, &mut ctx);
    }

    #[test]
    #[expected_failure]
    fun test_refund_before_timelock_fails() {
        let mut ctx = TxContext::new_for_testing(@0x1);
        let recipient = @0x2;
        let coin = mint<SUI>(100, &mut ctx);

        htlc::initiate_swap<Coin<SUI>>(coin, recipient, TEST_HASHLOCK, TIMELOCK, &mut ctx);
        let swap: htlc::Swap<SUI> = /* fetch from sender's objects */;
        let clock = new_clock(0);

        // Should fail: timelock not expired
        htlc::refund_swap<SUI>(&clock, swap, &mut ctx);
    }

    #[test]
    fun test_refund_after_timelock() {
        let mut ctx = TxContext::new_for_testing(@0x1);
        let recipient = @0x2;
        let coin = mint<SUI>(100, &mut ctx);

        htlc::initiate_swap<Coin<SUI>>(coin, recipient, TEST_HASHLOCK, TIMELOCK, &mut ctx);
        let swap: htlc::Swap<SUI> = /* fetch from sender's objects */;
        let clock = new_clock(TIMELOCK + 1);

        // Should succeed: timelock expired
        htlc::refund_swap<SUI>(&clock, swap, &mut ctx);
        // Assert sender received the coin back, etc.
    }

    #[test]
    #[expected_failure]
    fun test_double_claim_fails() {
        let mut ctx = TxContext::new_for_testing(@0x1);
        let recipient = @0x2;
        let coin = mint<SUI>(100, &mut ctx);

        htlc::initiate_swap<Coin<SUI>>(coin, recipient, TEST_HASHLOCK, TIMELOCK, &mut ctx);
        let swap: htlc::Swap<SUI> = /* fetch from sender's objects */;
        let clock = new_clock(0);

        htlc::claim_swap<SUI>(&clock, swap, TEST_PREIMAGE, &mut ctx);
        // Try to claim again (should fail)
        htlc::claim_swap<SUI>(&clock, swap, TEST_PREIMAGE, &mut ctx);
    }
}
