// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IERC20 {
    function transfer(address to, uint amount) external returns (bool);

    function transferFrom(
        address from,
        address to,
        uint amount
    ) external returns (bool);
}

contract HTLC {
    struct Swap {
        address sender;
        address recipient;
        bytes32 hashlock;
        uint256 timelock; // Unix timestamp
        uint256 amount;
        address token;
        bool claimed;
    }

    mapping(bytes32 => Swap) public swaps;

    event SwapInitiated(
        bytes32 indexed swapId,
        address indexed sender,
        address indexed recipient,
        uint256 amount,
        address token
    );

    event SwapClaimed(bytes32 indexed swapId, address indexed recipient);

    event SwapRefunded(bytes32 indexed swapId, address indexed sender);

    function initiateSwap(
        bytes32 swapId,
        address recipient,
        bytes32 hashlock,
        uint256 timelock,
        address token,
        uint256 amount
    ) external {
        require(swaps[swapId].sender == address(0), "Swap already exists");
        require(timelock > block.timestamp, "Invalid timelock");

        swaps[swapId] = Swap({
            sender: msg.sender,
            recipient: recipient,
            hashlock: hashlock,
            timelock: timelock,
            amount: amount,
            token: token,
            claimed: false
        });

        require(
            IERC20(token).transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );

        emit SwapInitiated(swapId, msg.sender, recipient, amount, token);
    }

    function claimSwap(bytes32 swapId, bytes calldata preimage) external {
        Swap storage swap = swaps[swapId];
        require(!swap.claimed, "Already claimed");
        require(msg.sender == swap.recipient, "Not recipient");
        require(keccak256(preimage) == swap.hashlock, "Invalid preimage");

        swap.claimed = true;
        require(
            IERC20(swap.token).transfer(swap.recipient, swap.amount),
            "Transfer failed"
        );

        emit SwapClaimed(swapId, msg.sender);
    }

    function refundSwap(bytes32 swapId) external {
        Swap storage swap = swaps[swapId];
        require(!swap.claimed, "Already claimed");
        require(msg.sender == swap.sender, "Not sender");
        require(block.timestamp > swap.timelock, "Timelock not expired");

        swap.claimed = true;
        require(
            IERC20(swap.token).transfer(swap.sender, swap.amount),
            "Refund failed"
        );

        emit SwapRefunded(swapId, msg.sender);
    }
}
