
// // ===== htlc_main.move (Main contract integrating everything) =====
// module sui_contract::htlc_main {
//     use sui::bcs;
//     use sui::coin::{Coin};
//     use sui::tx_context::{sender};
//     use sui::clock::{Clock};
//     use sui::event;
//     use sui::hash;
//     use sui_contract::escrow_structs::{
//         SwapOrder,
//         OrderInfo,
//         EscrowParams,
//         Details,
//         AuctionDetails,
//         Immutables,
//         DstImmutablesComplement,
//         Timelocks,
//         new_timelocks,
//         new_order_info
//     };
//     use sui_contract::escrow_factory;

//     // Error codes
//     const E_INVALID_SECRET_LENGTH: u64 = 400;
//     const E_INVALID_HASH: u64 = 401;

//     public struct HTLCManager has key {
//         id: UID,
//         owner: address,
//         total_swaps: u64,
//     }

//     public struct SwapInitiated has copy, drop, store {
//         swap_id: address,
//         maker: address,
//         taker: address,
//         src_amount: u64,
//         dst_amount: u64,
//         hashlock: vector<u8>,
//     }

//     /// Initialize the HTLC manager
//     fun init(ctx: &mut TxContext) {
//         let manager = HTLCManager {
//             id: object::new(ctx),
//             owner: sender(ctx),
//             total_swaps: 0,
//         };
//         transfer::share_object(manager);
//     }

//     /// Create a complete cross-chain swap order
//     public entry fun create_swap_order<T>(
//         manager: &mut HTLCManager,
//         factory: &escrow_factory::EscrowFactory,
//         clock: &Clock,
//         coin: Coin<T>,
//         safety_deposit_coin: Coin<T>,
//         // Order info
//         salt: vector<u8>,
//         maker: address,
//         taker: address,
//         making_amount: u64,
//         taking_amount: u64,
//         maker_asset: address,
//         taker_asset: address,
//         // Escrow params
//         secret: vector<u8>, // Will be hashed to create hashlock
//         src_withdrawal_delay: u64,
//         src_public_withdrawal_delay: u64,
//         src_cancellation_delay: u64,
//         src_public_cancellation_delay: u64,
//         dst_withdrawal_delay: u64,
//         dst_public_withdrawal_delay: u64,
//         dst_cancellation_delay: u64,
//         src_safety_deposit: u64,
//         dst_safety_deposit: u64,
//         // Destination chain info
//         dst_chain_id: u64,
//         // Auction details
//         auction_start_time: u64,
//         auction_duration: u64,
//         initial_rate_bump: u64,
//         // Whitelist
//         whitelist: vector<address>,
//         ctx: &mut TxContext
//     ) {
//         // Validate secret and create hashlock
//         assert!(vector::length(&secret) > 0, E_INVALID_SECRET_LENGTH);
//         let hashlock = hash::keccak256(&secret);
//         assert!(vector::length(&hashlock) == 32, E_INVALID_HASH);

//         // Create order hash from order info
//         let order_info = new_order_info(
//             salt,
//             maker,
//             taker,
//             making_amount,
//             taking_amount,
//             maker_asset,
//             taker_asset
//         );

//         let order_hash = hash::keccak256(&bcs::to_bytes(&order_info));

//         // Create source escrow through factory
//         escrow_factory::create_src_escrow<T>(
//             factory,
//             clock,
//             coin,
//             safety_deposit_coin,
//             order_hash,
//             hashlock,
//             maker,
//             taker,
//             maker_asset,
//             making_amount,
//             src_safety_deposit,
//             src_withdrawal_delay,
//             src_public_withdrawal_delay,
//             src_cancellation_delay,
//             src_public_cancellation_delay,
//             dst_withdrawal_delay,
//             dst_public_withdrawal_delay,
//             dst_cancellation_delay,
//             dst_chain_id,
//             taker_asset,
//             taking_amount,
//             dst_safety_deposit,
//             ctx
//         );

//         manager.total_swaps = manager.total_swaps + 1;

//         event::emit(SwapInitiated {
//             swap_id: object::id_address(manager),
//             maker,
//             taker,
//             src_amount: making_amount,
//             dst_amount: taking_amount,
//             hashlock,
//         });
//     }

//     /// Helper function to create hashlock from secret
//     public fun create_hashlock(secret: vector<u8>): vector<u8> {
//         assert!(vector::length(&secret) > 0, E_INVALID_SECRET_LENGTH);
//         let hashlock = hash::keccak256(&secret);
//         assert!(vector::length(&hashlock) == 32, E_INVALID_HASH);
//         hashlock
//     }

//     /// Get total number of swaps created
//     public fun get_total_swaps(manager: &HTLCManager): u64 {
//         manager.total_swaps
//     }

//     /// Verify secret against hashlock
//     public fun verify_secret(secret: vector<u8>, hashlock: vector<u8>): bool {
//         if (vector::length(&secret) == 0) {
//             return false
//         };
//         let computed_hash = hash::keccak256(&secret);
//         computed_hash == hashlock
//     }
// }
