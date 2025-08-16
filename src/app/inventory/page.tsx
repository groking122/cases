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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-black/60 rounded-2xl border border-gray-800 p-6 text-center">
          <div className="text-2xl font-bold mb-2">Connect Wallet</div>
          <p className="text-gray-400 mb-4">Connect your Cardano wallet to view your credit chest.</p>
          <WalletSelector 
            onWalletSelect={handleWalletSelect} 
            onError={(e) => toast.error(e)} 
            connecting={connecting}
          />
          <motion.button
            onClick={() => router.push('/')}
            className="mt-6 text-sm text-gray-400 hover:text-white"
            whileHover={{ scale: 1.03 }}
          >
            ← Back to Home
          </motion.button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 text-white">
      <header className="border-b border-gray-800/50 bg-black/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold">💎</span>
            </div>
            <span className="text-lg font-bold">Credit Chest</span>
          </div>
          <motion.button
            onClick={() => router.push('/')}
            className="text-sm text-gray-300 hover:text-white"
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


