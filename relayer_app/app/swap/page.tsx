"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowRight, ArrowLeftRight, Settings, Info } from "lucide-react"
import { useAppStore } from "@/lib/store"
import { useToast } from "@/hooks/use-toast"
import { SUPPORTED_CHAINS, SUPPORTED_TOKENS, DUTCH_AUCTION_STRATEGIES, APP_CONFIG } from "@/lib/constants"

const swapSchema = z.object({
  sourceChain: z.enum(['EVM', 'SUI']),
  destinationChain: z.enum(['EVM', 'SUI']),
  sourceToken: z.string().min(1, "Source token is required"),
  destinationToken: z.string().min(1, "Destination token is required"),
  amount: z.string().min(1, "Amount is required"),
  expectedAmount: z.string().min(1, "Expected amount is required"),
  safetyDeposit: z.string().min(1, "Safety deposit is required"),
  expiration: z.string().min(1, "Expiration is required"),
  dutchAuction: z.boolean().default(false),
  auctionStrategy: z.string().optional(),
})

type SwapFormData = z.infer<typeof swapSchema>

export default function SwapPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const { wallet, addOrder, setUI } = useAppStore()
  const { toast } = useToast()

  const form = useForm<SwapFormData>({
    resolver: zodResolver(swapSchema),
    defaultValues: {
      sourceChain: 'EVM',
      destinationChain: 'SUI',
      sourceToken: '',
      destinationToken: '',
      amount: '',
      expectedAmount: '',
      safetyDeposit: APP_CONFIG.defaultSafetyDeposit,
      expiration: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      dutchAuction: false,
      auctionStrategy: 'linear',
    },
  })

  const sourceChain = form.watch('sourceChain')
  const destinationChain = form.watch('destinationChain')
  const dutchAuction = form.watch('dutchAuction')

  const handleChainChange = (chain: 'EVM' | 'SUI') => {
    if (chain === sourceChain) return
    
    form.setValue('sourceChain', chain)
    form.setValue('destinationChain', chain === 'EVM' ? 'SUI' : 'EVM')
    form.setValue('sourceToken', '')
    form.setValue('destinationToken', '')
  }

  const handleAmountChange = (value: string) => {
    form.setValue('amount', value)
    // Simulate price estimation
    if (value && !isNaN(Number(value))) {
      const estimated = (Number(value) * 1.2).toFixed(6)
      form.setValue('expectedAmount', estimated)
    }
  }

  const onSubmit = async (data: SwapFormData) => {
    if (!wallet.isConnected) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet first",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    setUI({ isLoading: true })

    try {
      // Simulate swap creation
      await new Promise(resolve => setTimeout(resolve, 2000))

      const newOrder = {
        id: Date.now().toString(),
        sourceChain: data.sourceChain,
        destinationChain: data.destinationChain,
        sourceToken: data.sourceToken,
        destinationToken: data.destinationToken,
        amount: data.amount,
        expectedAmount: data.expectedAmount,
        safetyDeposit: data.safetyDeposit,
        expiration: new Date(data.expiration),
        status: 'pending' as const,
        maker: wallet.evmAddress || wallet.suiAddress || '',
        orderHash: `0x${Date.now().toString(16)}`,
        hashLock: `0x${Math.random().toString(16).slice(2)}`,
        timeLocks: {
          src_withdrawal: Date.now() + 3600000,
          src_public_withdrawal: Date.now() + 7200000,
          src_cancellation: Date.now() + 1800000,
          src_public_cancellation: Date.now() + 5400000,
          dst_withdrawal: Date.now() + 3600000,
          dst_public_withdrawal: Date.now() + 7200000,
          dst_cancellation: Date.now() + 1800000,
          deployed_at: Date.now(),
        },
        createdAt: new Date(),
        ...(data.dutchAuction && {
          dutchAuction: {
            startPrice: Number(data.expectedAmount),
            endPrice: Number(data.expectedAmount) * 0.8,
            decayRate: DUTCH_AUCTION_STRATEGIES.find(s => s.id === data.auctionStrategy)?.decayRate || 0.1,
            currentPrice: Number(data.expectedAmount),
          }
        })
      }

      addOrder(newOrder)

      toast({
        title: "Swap Created Successfully",
        description: `Order ${newOrder.id} has been created and is now live`,
        variant: "success",
      })

      form.reset()
    } catch (error) {
      toast({
        title: "Swap Creation Failed",
        description: "Failed to create swap order. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setUI({ isLoading: false })
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Create Cross-Chain Swap</h1>
          <p className="text-muted-foreground">
            Swap tokens between Ethereum and Sui networks with secure escrow
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5" />
              Swap Configuration
            </CardTitle>
            <CardDescription>
              Configure your cross-chain swap parameters
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Chain Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Source Chain</label>
                  <Select
                    value={sourceChain}
                    onValueChange={handleChainChange}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(SUPPORTED_CHAINS).map((chain) => (
                        <SelectItem key={chain.id} value={chain.id}>
                          <div className="flex items-center gap-2">
                            <span>{chain.icon}</span>
                            <span>{chain.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Destination Chain</label>
                  <Select
                    value={destinationChain}
                    onValueChange={(value) => form.setValue('destinationChain', value as 'EVM' | 'SUI')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(SUPPORTED_CHAINS).map((chain) => (
                        <SelectItem key={chain.id} value={chain.id}>
                          <div className="flex items-center gap-2">
                            <span>{chain.icon}</span>
                            <span>{chain.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Token Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Source Token</label>
                  <Select
                    value={form.watch('sourceToken')}
                    onValueChange={(value) => form.setValue('sourceToken', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select token" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_TOKENS[sourceChain].map((token) => (
                        <SelectItem key={token.address} value={token.symbol}>
                          <div className="flex items-center gap-2">
                            <span>{token.icon}</span>
                            <span>{token.symbol}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Destination Token</label>
                  <Select
                    value={form.watch('destinationToken')}
                    onValueChange={(value) => form.setValue('destinationToken', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select token" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_TOKENS[destinationChain].map((token) => (
                        <SelectItem key={token.address} value={token.symbol}>
                          <div className="flex items-center gap-2">
                            <span>{token.icon}</span>
                            <span>{token.symbol}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Amount Inputs */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Amount to Send</label>
                  <Input
                    type="number"
                    placeholder="0.0"
                    value={form.watch('amount')}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    onError={form.formState.errors.amount?.message}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Expected to Receive</label>
                  <Input
                    type="number"
                    placeholder="0.0"
                    value={form.watch('expectedAmount')}
                    onChange={(e) => form.setValue('expectedAmount', e.target.value)}
                    error={form.formState.errors.expectedAmount?.message}
                  />
                </div>
              </div>

              {/* Safety Deposit */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Safety Deposit</label>
                <Input
                  type="number"
                  placeholder={APP_CONFIG.defaultSafetyDeposit}
                  value={form.watch('safetyDeposit')}
                  onChange={(e) => form.setValue('safetyDeposit', e.target.value)}
                  error={form.formState.errors.safetyDeposit?.message}
                />
                <p className="text-xs text-muted-foreground">
                  Minimum: {APP_CONFIG.minSafetyDeposit} | Maximum: {APP_CONFIG.maxSafetyDeposit}
                </p>
              </div>

              {/* Expiration */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Expiration</label>
                <Input
                  type="datetime-local"
                  value={form.watch('expiration')}
                  onChange={(e) => form.setValue('expiration', e.target.value)}
                  error={form.formState.errors.expiration?.message}
                />
              </div>

              {/* Advanced Options */}
              <div className="space-y-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-2"
                >
                  <Settings className="h-4 w-4" />
                  Advanced Options
                </Button>

                {showAdvanced && (
                  <div className="space-y-4 p-4 border rounded-lg">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="dutchAuction"
                        checked={dutchAuction}
                        onChange={(e) => form.setValue('dutchAuction', e.target.checked)}
                        className="rounded"
                      />
                      <label htmlFor="dutchAuction" className="text-sm font-medium">
                        Enable Dutch Auction
                      </label>
                    </div>

                    {dutchAuction && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Auction Strategy</label>
                        <Select
                          value={form.watch('auctionStrategy')}
                          onValueChange={(value) => form.setValue('auctionStrategy', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DUTCH_AUCTION_STRATEGIES.map((strategy) => (
                              <SelectItem key={strategy.id} value={strategy.id}>
                                {strategy.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          {DUTCH_AUCTION_STRATEGIES.find(s => s.id === form.watch('auctionStrategy'))?.description}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !wallet.isConnected}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="spinner" />
                    Creating Swap...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <ArrowRight className="h-4 w-4" />
                    Create Swap
                  </div>
                )}
              </Button>

              {!wallet.isConnected && (
                <div className="text-center text-sm text-muted-foreground">
                  Please connect your wallet to create a swap
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              How It Works
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <p>
                1. <strong>Create Order:</strong> Your tokens are locked in an escrow contract
              </p>
              <p>
                2. <strong>Wait for Taker:</strong> Someone can claim your swap or you can refund
              </p>
              <p>
                3. <strong>Complete Swap:</strong> The taker receives your tokens and you get theirs
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 