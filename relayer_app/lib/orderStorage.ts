import { MockOrder } from './types'

export interface StoredOrder extends MockOrder {
  id: string
  createdAt: Date
}

// In-memory storage for orders (in production, you'd use a database)
let orders: StoredOrder[] = []

export const orderStorage = {
  // Add a new order
  addOrder: (order: StoredOrder) => {
    orders.push(order)
    return order
  },

  // Get all orders with optional filtering
  getOrders: (options?: {
    limit?: number
    offset?: number
    maker?: string
    status?: string
  }) => {
    let filteredOrders = [...orders]

    if (options?.maker) {
      filteredOrders = filteredOrders.filter(order => 
        order.maker.toLowerCase() === options.maker!.toLowerCase()
      )
    }

    const limit = options?.limit || 50
    const offset = options?.offset || 0

    return {
      orders: filteredOrders.slice(offset, offset + limit),
      total: filteredOrders.length,
      limit,
      offset,
      hasMore: offset + limit < filteredOrders.length
    }
  },

  // Get a specific order by ID
  getOrderById: (id: string): StoredOrder | undefined => {
    return orders.find(order => order.id === id)
  },

  // Update an order
  updateOrder: (id: string, updates: Partial<StoredOrder>) => {
    const index = orders.findIndex(order => order.id === id)
    if (index !== -1) {
      orders[index] = { ...orders[index], ...updates }
      return orders[index]
    }
    return null
  },

  // Delete an order
  deleteOrder: (id: string) => {
    const index = orders.findIndex(order => order.id === id)
    if (index !== -1) {
      orders.splice(index, 1)
      return true
    }
    return false
  },

  // Clear all orders (for testing)
  clearOrders: () => {
    orders = []
  },

  // Get all orders (for internal use)
  getAllOrders: () => orders
} 