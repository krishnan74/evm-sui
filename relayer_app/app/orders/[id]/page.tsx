"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Clock, CheckCircle, XCircle, AlertCircle, ExternalLink, TrendingDown } from "lucide-react"
import { useAppStore } from "@/lib/store"
import { useToast } from "@/hooks/use-toast"
import { SUPPORTED_CHAINS, EXPLORER_URLS } from "@/lib/constants"
import { formatDistanceToNow, format } from "date-fns"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts"

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { orders, updateOrder, wallet } = useAppStore()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const order = orders.find(o => o.id === params.id)

  useEffect(() => {
    if (!order) {
      router.push('/orders')
    }
  }, [order, router])

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Order Not Found</h1>
          <p className="text-muted-foreground mb-4">
            The order you're looking for doesn't exist or has been removed.
          </p>
          <Button onClick={() => router.push('/orders')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Orders
          </Button>
        </div>
      </div>
    )
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />
      case 'claimed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'refunded':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'expired':
        return <AlertCircle className="h-5 w-5 text-gray-500" />
      default:
        return <Clock className="h-5 w-5 text-gray-500" />
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

  const isExpired = order.expiration.getTime() <= Date.now()
  const canClaim = order.status === 'pending' && !isExpired
  const canRefund = order.status === 'pending' && (isExpired || order.maker === wallet.evmAddress || order.maker === wallet.suiAddress)

  // Generate Dutch auction data
  const generateAuctionData = () => {
    if (!order.dutchAuction) return []

    const data = []
    const startTime = order.createdAt.getTime()
    const endTime = order.expiration.getTime()
    const timeStep = (endTime - startTime) / 20

    for (let i = 0; i <= 20; i++) {
      const time = startTime + (i * timeStep)
      const progress = i / 20
      const currentPrice = order.dutchAuction.startPrice - 
        (progress * (order.dutchAuction.startPrice - order.dutchAuction.endPrice))
      
      data.push({
        time: format(new Date(time), 'HH:mm'),
        price: currentPrice,
        timestamp: time,
      })
    }

    return data
  }

  const auctionData = generateAuctionData()

  const handleClaim = async () => {
    if (!wallet.isConnected) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to claim this swap",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      // Simulate claim transaction
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      updateOrder(order.id, { status: 'claimed', taker: wallet.evmAddress || wallet.suiAddress })
      
      toast({
        title: "Swap Claimed Successfully",
        description: "The swap has been completed and tokens transferred",
        variant: "success",
      })
    } catch (error) {
      toast({
        title: "Claim Failed",
        description: "Failed to claim the swap. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefund = async () => {
    if (!wallet.isConnected) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to refund this swap",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      // Simulate refund transaction
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      updateOrder(order.id, { status: 'refunded' })
      
      toast({
        title: "Swap Refunded Successfully",
        description: "Your tokens have been returned to your wallet",
        variant: "success",
      })
    } catch (error) {
      toast({
        title: "Refund Failed",
        description: "Failed to refund the swap. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" onClick={() => router.push('/orders')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Orders
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Order #{order.id}</h1>
          <p className="text-muted-foreground">
            Created {formatDistanceToNow(order.createdAt, { addSuffix: true })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getStatusIcon(order.status)}
                Order Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                    {order.status.toUpperCase()}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {getTimeLeft(order.expiration)}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Expires</div>
                  <div className="font-medium">{format(order.expiration, 'PPp')}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Swap Details */}
          <Card>
            <CardHeader>
              <CardTitle>Swap Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Source Chain</div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{SUPPORTED_CHAINS[order.sourceChain].icon}</span>
                      <span className="font-medium">{SUPPORTED_CHAINS[order.sourceChain].name}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Amount to Send</div>
                    <div className="text-2xl font-bold">
                      {order.amount} {order.sourceToken}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Maker Address</div>
                    <div className="font-mono text-sm break-all">
                      {order.maker}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Destination Chain</div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{SUPPORTED_CHAINS[order.destinationChain].icon}</span>
                      <span className="font-medium">{SUPPORTED_CHAINS[order.destinationChain].name}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Amount to Receive</div>
                    <div className="text-2xl font-bold">
                      {order.expectedAmount} {order.destinationToken}
                    </div>
                  </div>
                  {order.taker && (
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Taker Address</div>
                      <div className="font-mono text-sm break-all">
                        {order.taker}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 pt-6 border-t">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Safety Deposit</div>
                    <div className="font-medium">{order.safetyDeposit}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Order Hash</div>
                    <div className="font-mono text-sm break-all">
                      {order.orderHash}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dutch Auction Chart */}
          {order.dutchAuction && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5" />
                  Dutch Auction Price Chart
                </CardTitle>
                <CardDescription>
                  Price decreases over time until expiration
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={auctionData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="time" 
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => value.toFixed(4)}
                      />
                      <Tooltip 
                        formatter={(value: number) => [value.toFixed(6), 'Price']}
                        labelFormatter={(label) => `Time: ${label}`}
                      />
                      <ReferenceLine 
                        x={format(new Date(), 'HH:mm')}
                        stroke="red"
                        strokeDasharray="3 3"
                        label="Current Time"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="price" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 text-center text-sm text-muted-foreground">
                  Current Price: {order.dutchAuction.currentPrice.toFixed(6)} {order.destinationToken}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                {canClaim && (
                  <Button 
                    onClick={handleClaim} 
                    disabled={isLoading}
                    className="flex-1"
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="spinner" />
                        Claiming...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Claim Swap
                      </div>
                    )}
                  </Button>
                )}
                
                {canRefund && (
                  <Button 
                    variant="destructive" 
                    onClick={handleRefund}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="spinner" />
                        Refunding...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4" />
                        Refund Swap
                      </div>
                    )}
                  </Button>
                )}

                <Button variant="outline" className="flex-1">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View on Explorer
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Time Locks */}
          <Card>
            <CardHeader>
              <CardTitle>Time Locks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span>Source Withdrawal</span>
                  <span>{format(order.timeLocks.src_withdrawal, 'PPp')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Source Public Withdrawal</span>
                  <span>{format(order.timeLocks.src_public_withdrawal, 'PPp')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Source Cancellation</span>
                  <span>{format(order.timeLocks.src_cancellation, 'PPp')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Source Public Cancellation</span>
                  <span>{format(order.timeLocks.src_public_cancellation, 'PPp')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Destination Withdrawal</span>
                  <span>{format(order.timeLocks.dst_withdrawal, 'PPp')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Destination Public Withdrawal</span>
                  <span>{format(order.timeLocks.dst_public_withdrawal, 'PPp')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Destination Cancellation</span>
                  <span>{format(order.timeLocks.dst_cancellation, 'PPp')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Deployed At</span>
                  <span>{format(order.timeLocks.deployed_at, 'PPp')}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transaction History */}
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span>Order Created</span>
                  <span className="text-green-600">✓</span>
                </div>
                {order.status === 'claimed' && (
                  <div className="flex justify-between items-center">
                    <span>Swap Claimed</span>
                    <span className="text-green-600">✓</span>
                  </div>
                )}
                {order.status === 'refunded' && (
                  <div className="flex justify-between items-center">
                    <span>Swap Refunded</span>
                    <span className="text-red-600">✓</span>
                  </div>
                )}
                {isExpired && order.status === 'pending' && (
                  <div className="flex justify-between items-center">
                    <span>Order Expired</span>
                    <span className="text-gray-600">⚠</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 