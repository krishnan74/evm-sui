import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface SwapOrder {
  id: string
  sourceChain: 'EVM' | 'SUI'
  destinationChain: 'EVM' | 'SUI'
  sourceToken: string
  destinationToken: string
  amount: string
  expectedAmount: string
  safetyDeposit: string
  expiration: Date
  status: 'pending' | 'claimed' | 'refunded' | 'expired'
  maker: string
  taker?: string
  orderHash: string
  hashLock: string
  timeLocks: {
    src_withdrawal: number
    src_public_withdrawal: number
    src_cancellation: number
    src_public_cancellation: number
    dst_withdrawal: number
    dst_public_withdrawal: number
    dst_cancellation: number
    deployed_at: number
  }
  createdAt: Date
  dutchAuction?: {
    startPrice: number
    endPrice: number
    decayRate: number
    currentPrice: number
  }
}

export interface WalletState {
  evmAddress?: string
  suiAddress?: string
  isConnected: boolean
  chainId?: number
}

export interface UIState {
  isLoading: boolean
  theme: 'light' | 'dark'
  sidebarOpen: boolean
}

interface AppState {
  // Wallet state
  wallet: WalletState
  
  // Swap orders
  orders: SwapOrder[]
  
  // UI state
  ui: UIState
  
  // Actions
  setWallet: (wallet: Partial<WalletState>) => void
  addOrder: (order: SwapOrder) => void
  updateOrder: (id: string, updates: Partial<SwapOrder>) => void
  removeOrder: (id: string) => void
  setUI: (ui: Partial<UIState>) => void
  clearOrders: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      wallet: {
        isConnected: false,
      },
      
      orders: [],
      
      ui: {
        isLoading: false,
        theme: 'light',
        sidebarOpen: false,
      },
      
      // Actions
      setWallet: (wallet) =>
        set((state) => ({
          wallet: { ...state.wallet, ...wallet },
        })),
      
      addOrder: (order) =>
        set((state) => ({
          orders: [order, ...state.orders],
        })),
      
      updateOrder: (id, updates) =>
        set((state) => ({
          orders: state.orders.map((order) =>
            order.id === id ? { ...order, ...updates } : order
          ),
        })),
      
      removeOrder: (id) =>
        set((state) => ({
          orders: state.orders.filter((order) => order.id !== id),
        })),
      
      setUI: (ui) =>
        set((state) => ({
          ui: { ...state.ui, ...ui },
        })),
      
      clearOrders: () =>
        set({ orders: [] }),
    }),
    {
      name: 'swapyoursuiii-storage',
      partialize: (state) => ({
        orders: state.orders,
        ui: state.ui,
      }),
    }
  )
) 