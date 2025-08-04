# SwapYourSuiii - Cross-Chain EVM ↔ SUI Swaps

A modern, decentralized application for cross-chain token swaps between Ethereum and Sui networks using 1inch SDK and custom escrow contracts.

## 🚀 Features

- **Cross-Chain Swaps**: Seamlessly swap tokens between Ethereum and Sui networks
- **Secure Escrow**: Your funds are protected by smart contract escrow

## How it's Made
This project was built by integrating both EVM and Sui smart contract ecosystems to enable atomic swaps via HTLCs (Hashed Timelock Contracts). Here's how it came together:

- 🔧 Tech Stack Solidity: HTLC smart contract deployed on an EVM. Handles ERC-20 token locking, claiming, and refunds.

- Move (Sui): HTLC module deployed on Sui testnet. Handles Coin<T> deposits with similar hashlock/timelock logic.

- Next.js: Used for the frontend interface and to build the off-chain relayer service.

- TypeScript: For the relayer logic to listen to events on both chains.

- Ethers.js: To interact with the EVM chain.

- Sui SDK (TypeScript): For interacting with the Sui chain and reading on-chain objects.

- Keccak256 hashing: Used consistently to derive the same preimage hash on both sides.

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Blockchain**: 
  - EVM: ethers
  - SUI: @mysten/sui
  - 1inch: @1inch/cross-chain-sdk

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd swapyoursuiii
```

2. Install dependencies:
```bash
npm install --legacy-peer-deps
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Add your configuration:
```env
SRC_CHAIN_RPC=https://base-sepolia-rpc.publicnode.com
DST_CHAIN_RPC=https://fullnode.testnet.sui.io:443
SRC_CHAIN_CREATE_FORK=false
DST_CHAIN_CREATE_FORK=false
EVM_USER_PK = ""
SUI_RESOLVER_PK = ""
EVM_RESOLVER_PK = ""
SUI_USER_PK = ""
```

4. Start the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Cross-Chain Swaps
- Secure escrow-based swaps
- Real-time price estimation
- Automatic order matching

### Dutch Auctions in SUI
- Configurable decay strategies
- Time-based pricing

## 🔒 Security Features

- Smart contract escrow protection
- Time lock mechanisms
- Hash lock verification
- Public withdrawal options
- Cancellation safeguards

**SwapYourSuiii** - Bridging the gap between EVM and SUI ecosystems with secure, efficient cross-chain swaps.
