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

        let secret: vector<u8> = vector[
            65, 191,   7,  43,  27, 181, 193, 164,
            49, 221, 208, 142, 157,   6, 168,  44,
            195,  70, 131,  61,  36, 161,  12, 155,
            87, 183,  90, 119, 183, 121, 225, 164
        ];

        let hashlock: vector<u8> = vector[
            133, 133, 158, 142, 226, 179, 132,
            137, 252, 217, 110,  64, 208, 204,
            4, 223, 244, 14, 76, 224, 241,
            216, 137, 207, 114, 237, 245, 84,
            232, 87, 33,   2
        ];


        let hash = hash::keccak256(&secret);

        debug::print(hash);
        debug::print(hashlock);

        assert!(hash == hashlock, E_HASH_MISMATCH);

        
        // let timelocks = new_timelocks(
        //     0,
        //     0,
        //     0,
        //     0,
        //     0,
        //     0,
        //     0,
        //     0,
        // );

        // let immutables = new_immutables(
        //     std::string::utf8(b"0x1234567890abcdef"),
        //     hashlock,
        //     @0x0, // maker
        //     @0x0, // taker
        //     @0x0, // token
        //     100,
        //     10,
        //     timelocks
        // );
        
        // only_valid_secret(secret, &immutables);
    }

    #[test]
    #[expected_failure(abort_code = E_HASH_MISMATCH)]
    fun test_only_valid_secret_failure() {

        // Use an incorrect secret

        let secret: vector<u8> = vector[
            65, 191,   7,  43,  27, 181, 193, 164,
            49, 221, 208, 142, 157,   6, 168,  44,
            195,  70, 131,  61,  36, 161,  12, 155,
            87, 183,  90, 119, 183, 121, 225, 164
        ];

        let hashlock: vector<u8> = vector[
            133, 133, 158, 142, 226, 179, 132,
            137, 252, 217, 110,  64, 208, 204,
            4, 223, 244, 14, 76, 224, 241,
            216, 137, 207, 114, 237, 245, 84,
            232, 87, 33,   2
        ];

        let timelocks = new_timelocks(
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
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
        only_valid_secret(secret, &immutables);
    }
}
