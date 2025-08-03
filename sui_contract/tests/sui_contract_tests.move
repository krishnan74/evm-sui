#[test_only]
module sui_contract::only_valid_secret_tests {
    use sui_contract::escrow_structs::{
        Immutables, new_timelocks, 
        new_immutables,
    };
    use sui_contract::escrow_checks::{only_valid_secret};
    use sui::hash;
    use std::debug;

    const E_HASH_MISMATCH: u64 = 7;

    #[test]
    fun test_only_valid_secret_success() {
        // The secret and hashlock must match (hashlock = keccak256(secret))
        let secret: vector<u8> = vector[
            65, 191,   7,  43,  27, 181, 193, 164,
            49, 221, 208, 142, 157,   6, 168,  44,
            195,  70, 131,  61,  36, 161,  12, 155,
            87, 183,  90, 119, 183, 121, 225, 164
        ];

        // Compute the hashlock from the secret
        let hashlock = hash::keccak256(&secret);

        debug::print(&hashlock);

        let timelocks = new_timelocks(
            0, 0, 0, 0, 0, 0, 0, 0,
        );

        let immutables = new_immutables(
            std::string::utf8(b"0x1234567890abcdef"),
            hashlock,
            @0x0, // maker
            @0x0, // taker
            @0x0, // token
            100,
            10,
            timelocks
        );

        // This should pass, as the secret matches the hashlock
        only_valid_secret(secret, &immutables);
    }

    // #[test]
    // #[expected_failure(abort_code = E_HASH_MISMATCH)]
    // fun test_only_valid_secret_failure() {
    //     // Use an incorrect secret (change one byte)
    //     let secret: vector<u8> = vector[
    //         66, 191,   7,  43,  27, 181, 193, 164, // <-- changed 65 to 66
    //         49, 221, 208, 142, 157,   6, 168,  44,
    //         195,  70, 131,  61,  36, 161,  12, 155,
    //         87, 183,  90, 119, 183, 121, 225, 164
    //     ];

    //     // The hashlock is still the hash of the original secret
    //     let correct_secret: vector<u8> = vector[
    //         65, 191,   7,  43,  27, 181, 193, 164,
    //         49, 221, 208, 142, 157,   6, 168,  44,
    //         195,  70, 131,  61,  36, 161,  12, 155,
    //         87, 183,  90, 119, 183, 121, 225, 164
    //     ];
    //     let hashlock = hash::keccak256(&secret);

    //     let timelocks = new_timelocks(
    //         0, 0, 0, 0, 0, 0, 0, 0,
    //     );

    //     let immutables = new_immutables(
    //         std::string::utf8(b"0x1234567890abcdef"),
    //         hashlock,
    //         @0x0, // maker
    //         @0x0, // taker
    //         @0x0, // token
    //         100,
    //         10,
    //         timelocks
    //     );

    //     // This should fail, as the secret does not match the hashlock
    //     only_valid_secret(secret, &immutables);
    // }
}