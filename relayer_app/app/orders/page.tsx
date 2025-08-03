"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowRight, Clock, CheckCircle, XCircle, AlertCircle, Search, Filter } from "lucide-react"
import { useAppStore } from "@/lib/store"
import { SUPPORTED_CHAINS } from "@/lib/constants"
import { formatDistanceToNow } from "date-fns"

export default function OrdersPage() {
  const { orders } = useAppStore()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [chainFilter, setChainFilter] = useState<string>("all")

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch = 
        order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.sourceToken.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.destinationToken.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.maker.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus = statusFilter === "all" || order.status === statusFilter
      const matchesChain = chainFilter === "all" || order.sourceChain === chainFilter

      return matchesSearch && matchesStatus && matchesChain
    })
  }, [orders, searchTerm, statusFilter, chainFilter])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'claimed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'refunded':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'expired':
        return <AlertCircle className="h-4 w-4 text-gray-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'claimed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'refunded':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'expired':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const getTimeLeft = (expiration: Date) => {
    const now = new Date()
    const timeLeft = expiration.getTime() - now.getTime()
    
    if (timeLeft <= 0) {
      return "Expired"
    }
    
    return formatDistanceToNow(expiration, { addSuffix: true })
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Swap Orders</h1>
        <p className="text-muted-foreground">
          View and manage your cross-chain swap orders
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search orders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="claimed">Claimed</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Chain</label>
              <Select value={chainFilter} onValueChange={setChainFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Chains</SelectItem>
                  {Object.values(SUPPORTED_CHAINS).map((chain) => (
                    <SelectItem key={chain.id} value={chain.id}>
                      {chain.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Total Orders</label>
              <div className="text-2xl font-bold text-primary">
                {filteredOrders.length}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      {filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <div className="text-4xl mb-4">📋</div>
              <h3 className="text-lg font-semibold mb-2">No Orders Found</h3>
              <p className="text-muted-foreground mb-4">
                {orders.length === 0 
                  ? "You haven't created any swap orders yet."
                  : "No orders match your current filters."
                }
              </p>
              {orders.length === 0 && (
                <Link href="/swap">
                  <Button>
                    Create Your First Swap
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <Card key={order.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Order Info */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Order #{order.id}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {getStatusIcon(order.status)}
                      <span>Created {formatDistanceToNow(order.createdAt, { addSuffix: true })}</span>
                    </div>
                  </div>

                  {/* Token Pair */}
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Token Pair</div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <span className="text-sm">{order.sourceToken}</span>
                        <span className="text-xs text-muted-foreground">({order.sourceChain})</span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <div className="flex items-center gap-1">
                        <span className="text-sm">{order.destinationToken}</span>
                        <span className="text-xs text-muted-foreground">({order.destinationChain})</span>
                      </div>
                    </div>
                  </div>

                  {/* Amounts */}
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Amounts</div>
                    <div className="space-y-1 text-sm">
                      <div>Send: {order.amount} {order.sourceToken}</div>
                      <div>Receive: {order.expectedAmount} {order.destinationToken}</div>
                      <div className="text-xs text-muted-foreground">
                        Safety: {order.safetyDeposit}
                      </div>
                    </div>
                  </div>

                  {/* Actions & Time */}
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Time Left</div>
                    <div className="text-sm text-muted-foreground">
                      {getTimeLeft(order.expiration)}
                    </div>
                    <Link href={`/orders/${order.id}`}>
                      <Button variant="outline" size="sm" className="w-full">
                        View Details
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Dutch Auction Info */}
                {order.dutchAuction && (
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">Dutch Auction Active</span>
                      <span className="text-muted-foreground">
                        Current Price: {order.dutchAuction.currentPrice.toFixed(6)} {order.destinationToken}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Stats */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Order Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{orders.length}</div>
              <div className="text-sm text-muted-foreground">Total Orders</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {orders.filter(o => o.status === 'pending').length}
              </div>
              <div className="text-sm text-muted-foreground">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {orders.filter(o => o.status === 'claimed').length}
              </div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {orders.filter(o => o.status === 'refunded').length}
              </div>
              <div className="text-sm text-muted-foreground">Refunded</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 