import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import GlobalContexts from "./globalContexts";
import { Toaster } from "@/components/ui/toaster";
import { Navigation } from "@/components/navigation";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SwapYourSuiii - Cross-Chain EVM ↔ SUI Swaps",
  description: "Swap tokens between Ethereum and Sui networks using 1inch SDK and custom escrow contracts",
  keywords: ["defi", "swap", "cross-chain", "ethereum", "sui", "1inch"],
  authors: [{ name: "SwapYourSuiii Team" }],
  viewport: "width=device-width, initial-scale=1",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <GlobalContexts>
          <Navigation />
          <main className="min-h-screen">
            {children}
          </main>
          <Toaster />
        </GlobalContexts>
      </body>
    </html>
  );
}
