# 🔁 EVM ↔ SUI Cross-Chain Swap via 1inch

This project enables **cross-chain token swaps** between EVM-based chains (e.g., Base Sepolia) and the SUI blockchain, integrating **1inch Fusion**, **custom resolvers**, and **SUI Move contracts**.

---

## 🧱 Project Structure
---
├── relayer_app # Next.js relayer dApp (backend logic)
├── sui_contract # SUI Move modules for HTLC contracts
└── evm_contract # EVM contracts: custom resolver + 1inch official contracts

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
- `api/cross-chain-swap.ts`: the core api route for initiating swaps across chains.

### Features
- Connect both **EVM** and **SUI** blockchain.
- 
- Interact with both 1inch LOP protocol and custom escrow contracts.

---

## 📦 SUI Contracts (Move)

Located in `/sui_contract`.

- Resolver Module
- Escrow Factory Module 
- Source Escrow Module
- Destination Escrow Module
- Structs and Checks Module 
- Factory module to create new escrows

---

## ⚙️ EVM Contracts

Located in `/evm_contract`.

- Uses [1inch official Cross Chain Swap contracts](https://github.com/1inch/cross-chain-swap)
- Includes:
  - Custom resolver
  - Escrow logic for cross-chain safety

---

## 🧪 Local Development

### Requirements
- Node.js v18+
- Sui CLI (`sui`), Sui SDK
- Foundry for EVM contracts

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
sui client publish 

# Compile & deploy EVM contracts (via Hardhat)
cd ../evm_contract
forge build
