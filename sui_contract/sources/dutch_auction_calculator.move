module sui_contract::dutch_auction_calculator {
    use sui::clock::{Self, Clock};
    use std::vector;
    use sui_contract::escrow_structs::{
        Order,
        AuctionData,
        create_order,
        create_auction_data,
        order_making_amount,
        order_taking_amount,
        order_maker,
        order_receiver,
        order_maker_asset,
        order_taker_asset,
        auction_start_time,
        auction_end_time,
        auction_taking_amount_start,
        auction_taking_amount_end,
    };

    // Error codes
    const EInvalidTimeRange: u64 = 0;
    const EInvalidAuctionData: u64 = 1;
    const EOrderExpired: u64 = 2;
    const EZeroMakingAmount: u64 = 3;

    /// Calculate the making amount based on Dutch auction logic
    public fun get_making_amount(
        order: &Order,
        _extension: &vector<u8>, 
        _order_hash: &vector<u8>, 
        _taker: address, 
        taking_amount: u256,
        _remaining_making_amount: u256, 
        extra_data: &vector<u8>,
        clock: &Clock
    ): u256 {
        let auction_data = decode_auction_data(extra_data);
        let calculated_taking_amount = calculate_auction_taking_amount(
            &auction_data,
            clock
        );
        
        // Equivalent to: order.makingAmount * takingAmount / calculatedTakingAmount
        (order_making_amount(order) * order_taking_amount(order)) / calculated_taking_amount
    }

    /// Calculate the taking amount based on Dutch auction logic
    public fun get_taking_amount(
        order: &Order,
        _extension: &vector<u8>, 
        _order_hash: &vector<u8>, 
        _taker: address, 
        making_amount: u256,
        _remaining_making_amount: u256, 
        extra_data: &vector<u8>,
        clock: &Clock
    ): u256 {
        let auction_data = decode_auction_data(extra_data);
        let calculated_taking_amount = calculate_auction_taking_amount(
            &auction_data,
            clock
        );
        
        // Equivalent to: (calculatedTakingAmount * makingAmount).ceilDiv(order.makingAmount)
        ceil_div(calculated_taking_amount * making_amount, order_making_amount(order))
    }

    /// Calculate the current taking amount based on auction parameters and current time
    fun calculate_auction_taking_amount(
        auction_data: &AuctionData,
        clock: &Clock
    ): u256 {
        let start_time = auction_start_time(auction_data);
        let end_time = auction_end_time(auction_data);
        let taking_amount_start = auction_taking_amount_start(auction_data);
        let taking_amount_end = auction_taking_amount_end(auction_data);

        assert!(end_time > start_time, EInvalidTimeRange);

        let current_time_ms = clock::timestamp_ms(clock);
        // Convert to seconds to match Solidity's block.timestamp
        let current_time = current_time_ms / 1000;

        // Clamp current time between start and end time
        let clamped_time = if (current_time < start_time) {
            start_time
        } else if (current_time > end_time) {
            end_time
        } else {
            current_time
        };

        // Linear interpolation formula:
        // result = (takingAmountStart * (endTime - currentTime) + takingAmountEnd * (currentTime - startTime)) / (endTime - startTime)
        let time_range = (end_time - start_time) as u256;
        let time_from_start = (clamped_time - start_time) as u256;
        let time_to_end = (end_time - clamped_time) as u256;

        (taking_amount_start * time_to_end + taking_amount_end * time_from_start) / time_range
    }

    /// Decode auction data from bytes
    /// Expected format: start_time (8 bytes) + end_time (8 bytes) + taking_amount_start (32 bytes) + taking_amount_end (32 bytes)
    fun decode_auction_data(extra_data: &vector<u8>): AuctionData {
        assert!(vector::length(extra_data) >= 80, EInvalidAuctionData); // 8 + 8 + 32 + 32

        let start_time = decode_u64(extra_data, 0);
        let end_time = decode_u64(extra_data, 8);
        let taking_amount_start = decode_u256(extra_data, 16);
        let taking_amount_end = decode_u256(extra_data, 48);

        create_auction_data(
            start_time,
            end_time,
            taking_amount_start,
            taking_amount_end
        )
    }

    /// Helper function to decode u64 from bytes (big-endian)
    fun decode_u64(data: &vector<u8>, offset: u64): u64 {
        let mut result = 0u64;
        let mut i = 0;
        while (i < 8) {
            result = (result << 8) | (*vector::borrow(data, offset + i) as u64);
            i = i + 1;
        };
        result
    }

    /// Helper function to decode u256 from bytes (big-endian)
    fun decode_u256(data: &vector<u8>, offset: u64): u256 {
        let mut result = 0u256;
        let mut i = 0;
        while (i < 32) {
            result = (result << 8) | (*vector::borrow(data, offset + i) as u256);
            i = i + 1;
        };
        result
    }

    /// Ceiling division implementation
    fun ceil_div(a: u256, b: u256): u256 {
        if (a == 0) {
            0
        } else {
            (a - 1) / b + 1
        }
    }

    /// Utility function to encode auction data for testing
    public fun encode_auction_data(
        start_time: u64,
        end_time: u64,
        taking_amount_start: u256,
        taking_amount_end: u256
    ): vector<u8> {
        let mut data = vector::empty<u8>();
        
        // Encode start_time (8 bytes, big-endian)
        encode_u64_to_bytes(&mut data, start_time);
        
        // Encode end_time (8 bytes, big-endian)
        encode_u64_to_bytes(&mut data, end_time);
        
        // Encode taking_amount_start (32 bytes, big-endian)
        encode_u256_to_bytes(&mut data, taking_amount_start);
        
        // Encode taking_amount_end (32 bytes, big-endian)
        encode_u256_to_bytes(&mut data, taking_amount_end);
        
        data
    }

    /// Helper function to encode u64 to bytes (big-endian)
    fun encode_u64_to_bytes(data: &mut vector<u8>, value: u64) {
        let mut i = 8;
        while (i > 0) {
            i = i - 1;
            vector::push_back(data, ((value >> (i * 8)) & 0xFF) as u8);
        };
    }

    /// Helper function to encode u256 to bytes (big-endian)
    fun encode_u256_to_bytes(data: &mut vector<u8>, value: u256) {
        let mut i = 32;
        while (i > 0) {
            i = i - 1;
            vector::push_back(data, ((value >> (i * 8)) & 0xFF) as u8);
        };
    }

}