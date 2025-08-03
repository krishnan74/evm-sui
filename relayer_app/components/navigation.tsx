"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Wallet, Moon, Sun, Menu, X } from "lucide-react"
import { useAppStore } from "@/lib/store"
import { useToast } from "@/hooks/use-toast"
import { SUPPORTED_CHAINS } from "@/lib/constants"

export function Navigation() {
  const pathname = usePathname()
  const { wallet, setWallet, ui, setUI } = useAppStore()
  const { toast } = useToast()

  const toggleTheme = () => {
    const newTheme = ui.theme === 'light' ? 'dark' : 'light'
    setUI({ theme: newTheme })
    document.documentElement.classList.toggle('dark')
  }

  const connectWallet = async () => {
    try {
      // This would integrate with wagmi and SUI wallet adapters
      // For now, we'll simulate a connection
      setWallet({
        evmAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        isConnected: true,
        chainId: 1,
      })
      
      toast({
        title: "Wallet Connected",
        description: "Successfully connected to wallet",
        variant: "success",
      })
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Failed to connect wallet",
        variant: "destructive",
      })
    }
  }

  const disconnectWallet = () => {
    setWallet({
      evmAddress: undefined,
      suiAddress: undefined,
      isConnected: false,
      chainId: undefined,
    })
    
    toast({
      title: "Wallet Disconnected",
      description: "Successfully disconnected wallet",
    })
  }

  const navItems = [
    { href: "/", label: "Home" },
    { href: "/swap", label: "Swap" },
    { href: "/orders", label: "Orders" },
  ]

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <div className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            SwapYourSuiii
          </div>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-6">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-sm font-medium transition-colors hover:text-primary ${
                pathname === item.href
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-4">
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-9 w-9"
          >
            {ui.theme === 'light' ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
          </Button>

          {/* Wallet Connection */}
          {wallet.isConnected ? (
            <div className="flex items-center space-x-2">
              <div className="hidden md:flex items-center space-x-2 text-sm">
                <span className="text-muted-foreground">Connected:</span>
                <span className="font-mono">
                  {wallet.evmAddress?.slice(0, 6)}...{wallet.evmAddress?.slice(-4)}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={disconnectWallet}
                className="text-xs"
              >
                Disconnect
              </Button>
            </div>
          ) : (
            <Button onClick={connectWallet} className="flex items-center space-x-2">
              <Wallet className="h-4 w-4" />
              <span className="hidden sm:inline">Connect Wallet</span>
            </Button>
          )}

          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setUI({ sidebarOpen: !ui.sidebarOpen })}
          >
            {ui.sidebarOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Menu className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {ui.sidebarOpen && (
        <div className="md:hidden border-t bg-background">
          <div className="container py-4 space-y-4 px-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`block text-sm font-medium transition-colors hover:text-primary ${
                  pathname === item.href
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
                onClick={() => setUI({ sidebarOpen: false })}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  )
} 