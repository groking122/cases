'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from './ui/button'

interface PaymentRecoveryProps {
  onClose: () => void
  userWalletAddress?: string
}

interface RecoveryResult {
  success: boolean
  recovered?: boolean
  alreadyProcessed?: boolean
  details?: {
    txHash?: string
    creditsAdded?: number
    newBalance?: number
    message?: string
  }
  error?: string
}

export default function PaymentRecovery({ onClose, userWalletAddress }: PaymentRecoveryProps) {
  const [txHash, setTxHash] = useState('')
  const [credits, setCredits] = useState<number>(1000)
  const [isRecovering, setIsRecovering] = useState(false)
  const [result, setResult] = useState<RecoveryResult | null>(null)

  const handleRecover = async () => {
    if (!txHash.trim()) {
      setResult({
        success: false,
        error: 'Please enter a transaction hash'
      })
      return
    }

    // Get wallet address if not provided
    let walletAddress = userWalletAddress || ''
    if (!walletAddress || walletAddress === 'connected_wallet') {
      // Try to get wallet from meshsdk
      try {
        const { useWallet } = await import('@meshsdk/react')
        const { wallet, connected } = useWallet()
        
        if (!connected || !wallet) {
          setResult({
            success: false,
            error: 'Please connect your wallet first'
          })
          return
        }
        
        const addresses = await wallet.getUsedAddresses()
        walletAddress = addresses[0]
        
        if (!walletAddress) {
          setResult({
            success: false,
            error: 'Could not get wallet address'
          })
          return
        }
      } catch (error: any) {
        setResult({
          success: false,
          error: 'Could not access wallet. Please connect your wallet first.'
        })
        return
      }
    }

    setIsRecovering(true)
    setResult(null)

    try {
      console.log('🔄 Attempting payment recovery:', {
        txHash: txHash.substring(0, 16) + '...',
        credits,
        wallet: (userWalletAddress || 'No wallet').substring(0, 20) + '...'
      })

      const response = await fetch('/api/recover-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          txHash: txHash.trim(),
          walletAddress: walletAddress,
          credits
        })
      })

      const data = await response.json()

      if (response.ok) {
        console.log('✅ Payment recovery successful:', data)
        setResult({
          success: true,
          recovered: data.recovered,
          alreadyProcessed: data.alreadyProcessed,
          details: data.details
        })
        
        // Clear the form on success
        setTxHash('')
        
      } else {
        console.error('❌ Payment recovery failed:', data)
        setResult({
          success: false,
          error: data.error || 'Recovery failed'
        })
      }

    } catch (error: any) {
      console.error('❌ Payment recovery error:', error)
      setResult({
        success: false,
        error: 'Network error. Please try again.'
      })
    } finally {
      setIsRecovering(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-gradient-to-br from-purple-900 to-blue-900 p-6 rounded-2xl shadow-2xl max-w-md w-full border border-purple-500/30"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">💰 Recover Lost Payment</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          {/* Transaction Hash Input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Transaction Hash
            </label>
            <input
              type="text"
              value={txHash}
              onChange={(e) => setTxHash(e.target.value)}
              placeholder="Enter your Cardano transaction hash (64 characters)"
              className="w-full p-3 bg-black/30 border border-purple-500/30 rounded-lg text-white placeholder-gray-400 focus:border-purple-400 focus:outline-none"
              disabled={isRecovering}
              maxLength={64}
            />
            <div className="text-xs text-gray-400 mt-1">
              Find this in your wallet's transaction history
            </div>
          </div>

          {/* Credits Input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Credits Purchased
            </label>
            <select
              value={credits}
              onChange={(e) => setCredits(Number(e.target.value))}
              className="w-full p-3 bg-black/30 border border-purple-500/30 rounded-lg text-white focus:border-purple-400 focus:outline-none"
              disabled={isRecovering}
            >
              <option value={100}>100 Credits (~1 ADA)</option>
              <option value={500}>500 Credits (~5 ADA)</option>
              <option value={1000}>1000 Credits (~10 ADA)</option>
              <option value={2500}>2500 Credits (~25 ADA)</option>
              <option value={5000}>5000 Credits (~50 ADA)</option>
            </select>
          </div>

          {/* Wallet Address Display */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Your Wallet
            </label>
            <div className="p-3 bg-black/20 border border-gray-600 rounded-lg text-gray-300 text-sm">
              {userWalletAddress ? 
                userWalletAddress.substring(0, 30) + '...' : 
                'No wallet connected'
              }
            </div>
          </div>

          {/* Recovery Button */}
          <Button
            onClick={handleRecover}
            disabled={isRecovering || !txHash.trim() || !userWalletAddress}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 
              text-white font-semibold py-3 text-lg transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50"
          >
            {isRecovering ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full"></div>
                Recovering Payment...
              </div>
            ) : (
              '🔄 Recover Payment'
            )}
          </Button>

          {/* Result Display */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`p-4 rounded-lg border ${
                  result.success 
                    ? 'bg-green-900/30 border-green-500/30 text-green-200' 
                    : 'bg-red-900/30 border-red-500/30 text-red-200'
                }`}
              >
                <div className="font-semibold mb-2">
                  {result.success ? (
                    result.alreadyProcessed ? '✅ Already Processed' : '✅ Recovery Successful'
                  ) : (
                    '❌ Recovery Failed'
                  )}
                </div>
                
                <div className="text-sm">
                  {result.success ? (
                    result.details?.message || 
                    `${result.details?.creditsAdded || 0} credits ${result.alreadyProcessed ? 'were already' : 'have been'} added to your account`
                  ) : (
                    result.error
                  )}
                </div>

                {result.success && result.details?.newBalance && (
                  <div className="text-xs text-green-300 mt-1">
                    New balance: {result.details.newBalance} credits
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Help Text */}
          <div className="text-xs text-gray-400 text-center mt-4 p-3 bg-black/20 rounded-lg">
            <div className="font-medium mb-2">📖 How to use this recovery tool:</div>
            <div className="space-y-1 text-left">
              <div>1. Find your transaction hash in your Cardano wallet</div>
              <div>2. Select the amount of credits you purchased</div>
              <div>3. Click "Recover Payment" to process your transaction</div>
              <div>4. Your credits will be added to your account</div>
            </div>
            
            <div className="mt-3 text-orange-300">
              ⚠️ Only use this if you made a payment but didn't receive credits
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
} 