"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight, ArrowLeftRight, Shield, Zap, TrendingUp } from "lucide-react"
import { useAppStore } from "@/lib/store"
import { SUPPORTED_CHAINS, APP_CONFIG } from "@/lib/constants"

// Mock data for live swaps
const mockSwaps = [
  { id: 1, from: "ETH", to: "SUI", amount: "0.5", user: "0x1234...5678", time: "2 min ago" },
  { id: 2, from: "SUI", to: "ETH", amount: "100", user: "0xabcd...efgh", time: "5 min ago" },
  { id: 3, from: "USDC", to: "SUI", amount: "500", user: "0x9876...4321", time: "8 min ago" },
]

export default function Home() {
  const [currentSwapIndex, setCurrentSwapIndex] = useState(0)
  const { orders } = useAppStore()

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSwapIndex((prev) => (prev + 1) % mockSwaps.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const features = [
    {
      icon: <ArrowLeftRight className="h-6 w-6" />,
      title: "Cross-Chain Swaps",
      description: "Seamlessly swap between Ethereum and Sui networks",
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Secure Escrow",
      description: "Your funds are protected by smart contract escrow",
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: "Fast Execution",
      description: "Powered by 1inch SDK for optimal routing",
    },
    {
      icon: <TrendingUp className="h-6 w-6" />,
      title: "Dutch Auctions",
      description: "Dynamic pricing with time-based decay",
    },
  ]

  const steps = [
    {
      step: "1",
      title: "Connect Wallet",
      description: "Connect your EVM or SUI wallet to get started",
    },
    {
      step: "2",
      title: "Create Swap",
      description: "Select tokens, amounts, and create your swap order",
    },
    {
      step: "3",
      title: "Claim or Refund",
      description: "Complete the swap or refund if needed",
    },
  ]

  return (
    <div className="min-h-screen">
      {/* Animated Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-20" />
      </div>

      {/* Hero Section */}
      <section className="relative pt-16 md:pt-20 pb-16">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent animate-pulse">
              SwapYourSuiii
            </h1>
            <p className="text-lg md:text-xl lg:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              The first cross-chain swap platform connecting Ethereum and Sui networks
              with secure escrow and Dutch auction pricing.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/swap">
                <Button size="lg" className="text-base md:text-lg px-6 md:px-8 py-4 md:py-6">
                  Start Swapping
                  <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
                </Button>
              </Link>
              <Link href="/orders">
                <Button variant="outline" size="lg" className="text-base md:text-lg px-6 md:px-8 py-4 md:py-6">
                  View Orders
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Live Swap Feed */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <Card className="max-w-2xl mx-auto glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Live Swap Activity
              </CardTitle>
              <CardDescription>
                Recent swaps happening on the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockSwaps.map((swap, index) => (
                  <div
                    key={swap.id}
                    className={`flex items-center justify-between p-3 rounded-lg transition-all duration-500 ${
                      index === currentSwapIndex
                        ? "bg-primary/10 border border-primary/20"
                        : "bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{swap.from}</span>
                        <ArrowRight className="h-4 w-4" />
                        <span className="font-medium">{swap.to}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {swap.amount}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-mono">{swap.user}</div>
                      <div className="text-xs text-muted-foreground">{swap.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Simple 3-step process to complete your cross-chain swap
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {steps.map((step) => (
              <Card key={step.step} className="text-center">
                <CardHeader>
                  <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                    {step.step}
                  </div>
                  <CardTitle>{step.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{step.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose SwapYourSuiii</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Built with security, speed, and user experience in mind
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {features.map((feature) => (
              <Card key={feature.title} className="text-center">
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 text-primary rounded-lg flex items-center justify-center mx-auto mb-4">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Supported Chains */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Supported Networks</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Swap between the most popular blockchain networks
            </p>
          </div>
          <div className="flex justify-center gap-8">
            {Object.values(SUPPORTED_CHAINS).map((chain) => (
              <Card key={chain.id} className="text-center min-w-[200px]">
                <CardHeader>
                  <div className="text-4xl mb-2">{chain.icon}</div>
                  <CardTitle>{chain.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Native token: {chain.nativeToken}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Start Swapping?
          </h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Join thousands of users who trust SwapYourSuiii for their cross-chain swaps
          </p>
          <Link href="/swap">
            <Button size="lg" variant="secondary" className="text-lg px-8 py-6">
              Get Started Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  )
}
