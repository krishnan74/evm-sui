# SwapYourSuiii - Cross-Chain EVM ↔ SUI Swaps

A modern, decentralized application for cross-chain token swaps between Ethereum and Sui networks using 1inch SDK and custom escrow contracts.

## 🚀 Features

- **Cross-Chain Swaps**: Seamlessly swap tokens between Ethereum and Sui networks
- **Secure Escrow**: Your funds are protected by smart contract escrow
- **Dutch Auctions**: Dynamic pricing with time-based decay strategies
- **Real-time Charts**: Interactive Dutch auction price charts using Recharts
- **Wallet Integration**: Support for both EVM and SUI wallets
- **Modern UI**: Beautiful, responsive interface built with shadcn/ui
- **Toast Notifications**: Real-time feedback for all actions
- **Order Management**: Complete order lifecycle management

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **UI Components**: shadcn/ui
- **State Management**: Zustand
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod
- **Notifications**: Custom Toast System
- **Blockchain**: 
  - EVM: wagmi + viem
  - SUI: @mysten/sui.js + @mysten/wallet-adapter
- **Cross-Chain**: 1inch SDK

## 📁 Project Structure

```
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Landing page
│   ├── swap/page.tsx      # Swap creation page
│   ├── orders/page.tsx    # Orders listing page
│   └── orders/[id]/page.tsx # Order detail page
├── components/            # Reusable UI components
│   ├── ui/               # shadcn/ui components
│   └── navigation.tsx    # Main navigation
├── lib/                  # Utilities and configurations
│   ├── store.ts          # Zustand state management
│   ├── constants.ts      # App constants
│   └── utils.ts          # Utility functions
├── hooks/                # Custom React hooks
└── public/              # Static assets
```

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
NEXT_PUBLIC_EVM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/your-api-key
NEXT_PUBLIC_SUI_RPC_URL=https://fullnode.mainnet.sui.io:443
```

4. Start the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📱 Pages & Functionality

### 🏠 Landing Page (`/`)
- Hero section with animated background
- Live swap activity feed
- How it works explanation
- Supported networks showcase
- Call-to-action sections

### 🔁 Swap Page (`/swap`)
- Chain selection (EVM/SUI)
- Token selection with icons
- Amount inputs with real-time estimation
- Safety deposit configuration
- Expiration time setting
- Dutch auction options
- Advanced settings panel

### 📜 Orders Page (`/orders`)
- Comprehensive order listing
- Search and filter functionality
- Status indicators and time tracking
- Order statistics dashboard
- Responsive card layout

### 🔍 Order Detail Page (`/orders/[id]`)
- Complete order breakdown
- Interactive Dutch auction chart
- Claim/Refund actions
- Time lock information
- Transaction history
- Explorer links

## 🎨 UI Components

### Custom Components
- **Navigation**: Responsive header with wallet connection
- **SwapForm**: Comprehensive swap creation interface
- **OrderCard**: Order display with status indicators
- **DutchAuctionChart**: Interactive price decay visualization

### shadcn/ui Components Used
- Button (with custom variants)
- Card (with all sub-components)
- Input (with validation)
- Select (for dropdowns)
- Toast (for notifications)

## 🔧 Configuration

### Supported Chains
- **Ethereum**: Mainnet with ETH, USDC, USDT, WETH
- **Sui**: Mainnet with SUI, USDC

### Dutch Auction Strategies
- **Linear Decay**: Price decreases linearly over time
- **Exponential Decay**: Price decreases exponentially
- **Step Decay**: Price decreases in discrete steps

### Safety Deposit
- Minimum: 0.001
- Maximum: 1.0
- Default: 0.01

## 🎯 Key Features

### Cross-Chain Swaps
- Secure escrow-based swaps
- Support for multiple token pairs
- Real-time price estimation
- Automatic order matching

### Dutch Auctions
- Configurable decay strategies
- Real-time price updates
- Interactive charts
- Time-based pricing

### Wallet Integration
- EVM wallet support (MetaMask, WalletConnect)
- SUI wallet support (Sui Wallet, Suiet)
- Automatic chain detection
- Transaction signing

### Order Management
- Complete order lifecycle
- Status tracking
- Time lock management
- Refund capabilities

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository
2. Set environment variables
3. Deploy automatically

### Manual Deployment
```bash
npm run build
npm start
```

## 🔒 Security Features

- Smart contract escrow protection
- Time lock mechanisms
- Hash lock verification
- Public withdrawal options
- Cancellation safeguards

## 📊 Performance Optimizations

- Next.js 14 App Router
- Turbopack for faster builds
- Image optimization
- Code splitting
- Lazy loading
- Responsive design

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support, please open an issue on GitHub or contact the development team.

---

**SwapYourSuiii** - Bridging the gap between EVM and SUI ecosystems with secure, efficient cross-chain swaps.
