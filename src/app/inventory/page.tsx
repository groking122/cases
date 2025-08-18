"use client"

import { useEffect, useState, useCallback } from "react"
import { motion } from "framer-motion"
import { useWallet } from "@meshsdk/react"
import toast from "react-hot-toast"
import { useRouter } from "next/navigation"
import PlayerInventory from "@/components/PlayerInventory"
import WalletSelector from "@/components/WalletSelector"

export default function InventoryPage() {
  const { connected, wallet, connect, connecting } = useWallet()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(true)

  useEffect(() => {
    setIsOpen(true)
  }, [])

  const handleWalletSelect = useCallback(async (walletKey: string) => {
    try {
      await connect(walletKey)
      toast.success('Wallet connected successfully!')
    } catch (error: any) {
      toast.error(`Wallet connection failed: ${error.message || 'Unknown error'}`)
    }
  }, [connect])

  if (!connected) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card rounded-2xl border border-border p-6 text-center">
          <div className="text-2xl font-bold mb-2">Connect Wallet</div>
          <p className="text-foreground/60 mb-4">Connect your Cardano wallet to view your stash.</p>
          <WalletSelector 
            onWalletSelect={handleWalletSelect} 
            onError={(e) => toast.error(e)} 
            connecting={connecting}
          />
          <motion.button
            onClick={() => router.push('/')}
            className="mt-6 text-sm text-foreground/70 hover:text-foreground"
            whileHover={{ scale: 1.03 }}
          >
            ← Back to Home
          </motion.button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/70 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center border border-border">
              <span className="text-lg">💎</span>
            </div>
            <span className="text-lg font-bold">Stash</span>
          </div>
          <motion.button
            onClick={() => router.push('/')}
            className="text-sm text-foreground/70 hover:text-foreground"
            whileHover={{ scale: 1.05 }}
          >
            ← Back
          </motion.button>
        </div>
      </header>

      {/* Render inventory as full-screen modal overlay */}
      <PlayerInventory
        isOpen={isOpen}
        onClose={() => router.push('/')}
        onCreditsUpdated={() => {}}
      />
    </div>
  )
}


