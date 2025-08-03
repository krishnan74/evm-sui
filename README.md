# 🔁 EVM ↔ SUI Cross-Chain Swap via 1inch

This project enables **cross-chain token swaps** between EVM-based chains (e.g., Base Sepolia) and the SUI blockchain, integrating **1inch Fusion**, **custom resolvers**, and **SUI Move contracts**.

---

## 🧱 Project Structure
---
├── relayer_app # Next.js relayer dApp (frontend/backend logic)
├── sui_contract # SUI Move modules for escrow/resolver logic
└── evm_contract # EVM contracts: custom resolver, escrow factory + 1inch official

## 🚀 Live Contracts

### EVM (Base Sepolia)
| Component               | Address                                                                 |
|------------------------|-------------------------------------------------------------------------|
| LOP Protocol           | `0xE53136D9De56672e8D2665C98653AC7b8A60Dc44`                            |
| Resolver Contract      | `0x9ad804B82c91b23bA6ce63cA09075564a0C47605`                            |
| Escrow Factory         | `0x2407963257C24a95C302C641E72B372a6d587e86`                            |

### SUI
| Component               | Package ID                                                                                                    |
|------------------------|----------------------------------------------------------------------------------------------------------------|
| Resolver Module        | `0x8adbb951d559961b8079d8606f55b08e517037cd318f0134af11b70d27eec7e1`                                           |
| Escrow Factory Module  | `0x8adbb951d559961b8079d8606f55b08e517037cd318f0134af11b70d27eec7e1`                                           |

---

## 🧭 Relayer App (Next.js)

Located in `/relayer_app`.

### ✨ Main Route
- `pages/cross-chain-swap.tsx`: the core user interface for initiating swaps across chains.

### Features
- Connect both **EVM** and **SUI** wallets.
- Create and resolve swap orders.
- Interact with both 1inch Fusion orders and custom escrow contracts.
- Handles Dutch auctions via dynamic pricing graphs.
- Toast messages, responsive UI, and smart contract transaction handling.

---

## 📦 SUI Contracts (Move)

Located in `/sui_contract`.

- Implements `SrcEscrow` and `DstEscrow` object models
- Safety deposit system to prevent griefing
- Resolver Move module verifies and finalizes incoming orders
- Factory module to deploy new escrows

---

## ⚙️ EVM Contracts

Located in `/evm_contract`.

- Uses [1inch official Fusion contracts](https://github.com/1inch/fusion-contracts)
- Includes:
  - Custom resolver for SUI bridging
  - Escrow logic for cross-chain safety
  - Minimal LOP token implementation for testing
  - Factory for escrows

---

## 🧪 Local Development

### Requirements
- Node.js v18+
- Sui CLI (`sui`), Sui SDK
- Hardhat for EVM contracts

### Commands

```bash
# Install dependencies
cd relayer_app && npm install

# Start Next.js app
npm run dev

# Compile SUI Move contracts
cd ../sui_contract
sui move build

# Deploy SUI packages
sui client publish --gas-budget 100000000

# Compile & deploy EVM contracts (via Hardhat)
cd ../evm_contract
npx hardhat compile
npx hardhat run scripts/deploy.ts --network baseSepolia
