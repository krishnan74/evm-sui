export const SUPPORTED_CHAINS = {
  EVM: {
    id: 'EVM',
    name: 'Ethereum',
    icon: '🔷',
    color: 'purple',
    rpcUrl: process.env.NEXT_PUBLIC_EVM_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/your-api-key',
    explorer: 'https://etherscan.io',
    nativeToken: 'ETH',
  },
  SUI: {
    id: 'SUI',
    name: 'Sui',
    icon: '🔵',
    color: 'blue',
    rpcUrl: process.env.NEXT_PUBLIC_SUI_RPC_URL || 'https://fullnode.mainnet.sui.io:443',
    explorer: 'https://suiexplorer.com',
    nativeToken: 'SUI',
  },
} as const

export const SUPPORTED_TOKENS = {
  EVM: [
    {
      symbol: 'ETH',
      name: 'Ethereum',
      address: '0x0000000000000000000000000000000000000000',
      decimals: 18,
      icon: '🔷',
    },
    {
      symbol: 'USDC',
      name: 'USD Coin',
      address: '0xA0b86a33E6441b8C4C8C0C8C0C8C0C8C0C8C0C8',
      decimals: 6,
      icon: '💵',
    },
    {
      symbol: 'USDT',
      name: 'Tether USD',
      address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      decimals: 6,
      icon: '💵',
    },
    {
      symbol: 'WETH',
      name: 'Wrapped Ethereum',
      address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      decimals: 18,
      icon: '🔷',
    },
  ],
  SUI: [
    {
      symbol: 'SUI',
      name: 'Sui',
      address: '0x2::sui::SUI',
      decimals: 9,
      icon: '🔵',
    },
    {
      symbol: 'USDC',
      name: 'USD Coin',
      address: '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::USDC',
      decimals: 6,
      icon: '💵',
    },
  ],
} as const

export const DUTCH_AUCTION_STRATEGIES = [
  {
    id: 'linear',
    name: 'Linear Decay',
    description: 'Price decreases linearly over time',
    decayRate: 0.1,
  },
  {
    id: 'exponential',
    name: 'Exponential Decay',
    description: 'Price decreases exponentially over time',
    decayRate: 0.05,
  },
  {
    id: 'step',
    name: 'Step Decay',
    description: 'Price decreases in steps',
    decayRate: 0.2,
  },
] as const

export const APP_CONFIG = {
  name: 'SwapYourSuiii',
  description: 'Cross-chain swaps between EVM and SUI networks',
  version: '1.0.0',
  defaultExpirationHours: 24,
  minSafetyDeposit: '0.001',
  maxSafetyDeposit: '1.0',
  defaultSafetyDeposit: '0.01',
} as const

export const EXPLORER_URLS = {
  ethereum: 'https://etherscan.io',
  sui: 'https://suiexplorer.com',
} as const


export const evmResolverContractAddress = "0x42376B4769B6e676511bF1811d3dF718398dA012";
export const evmEscrowFactoryAddress = "0x570B01ae28A5B460Fa24C27e30ed2C769ebA169C";
export const suiResolverContractAddress =
  "0x2ffbee72e7dd17cb0cdc05ad8b0deaeadfd823b8e2e50cf8cf360c2cf1da02ad";
export const suiEscrowFactoryAddress =
  "0x2ffbee72e7dd17cb0cdc05ad8b0deaeadfd823b8e2e50cf8cf360c2cf1da02ad";