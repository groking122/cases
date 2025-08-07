"use client"

import { useState } from 'react'
import { useWallet } from '@meshsdk/react'
import { Transaction } from '@meshsdk/core'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'

interface WalletPaymentProps {
  onPaymentSuccess: (txHash: string) => void
  onError: (error: string) => void
  casePrice: number // Price in ADA
  disabled?: boolean
}

interface PaymentState {
  isProcessing: boolean
  step: string
  txHash?: string
  error?: string
}

export default function WalletPayment({ 
  onPaymentSuccess, 
  onError, 
  casePrice, 
  disabled = false 
}: WalletPaymentProps) {
  const { connect, connected, wallet, connecting, disconnect } = useWallet()
  const [paymentState, setPaymentState] = useState<PaymentState>({
    isProcessing: false,
    step: ''
  })

  // Handle wallet connection with automatic wallet detection
  const handleConnect = async () => {
    try {
      // Try to detect available wallets
      if (typeof window !== 'undefined' && window.cardano) {
        const availableWallets = Object.keys(window.cardano)
        if (availableWallets.length > 0) {
          // Use the first available wallet (usually Nami)
          const walletName = availableWallets[0]
          await connect(walletName)
        } else {
          onError('No Cardano wallets found. Please install Nami, Eternl, or another CIP-30 wallet.')
        }
      } else {
        onError('No Cardano wallets detected. Please install a Cardano wallet extension.')
      }
    } catch (error: any) {
      onError(`Wallet connection failed: ${error.message || 'Unknown error'}`)
    }
  }

  // Your project's payment address (replace with your actual address)
  const PAYMENT_ADDRESS = process.env.NEXT_PUBLIC_PAYMENT_ADDRESS || "addr_test1qzx9hu8j4ah3auytk0mwcup5m9tl9yz2ghj3z9wdggq7a6v5v2a"

  const handlePayment = async () => {
    if (!connected || !wallet) {
      onError('Wallet not connected')
      return
    }

    setPaymentState({
      isProcessing: true,
      step: 'Building transaction...'
    })

    try {
      // Step 1: Build transaction
      const priceInLovelace = (casePrice * 1000000).toString() // Convert ADA to lovelace
      
      const tx = new Transaction({ initiator: wallet })
        .sendLovelace(
          PAYMENT_ADDRESS,
          priceInLovelace
        )

      setPaymentState(prev => ({ ...prev, step: 'Building transaction...' }))
      const unsignedTx = await tx.build()

      // Step 2: Sign transaction
      setPaymentState(prev => ({ ...prev, step: 'Waiting for signature...' }))
      const signedTx = await wallet.signTx(unsignedTx)

      // Step 3: Submit transaction
      setPaymentState(prev => ({ ...prev, step: 'Submitting to blockchain...' }))
      const txHash = await wallet.submitTx(signedTx)

      setPaymentState(prev => ({ ...prev, step: 'Verifying payment...', txHash }))

      // Step 4: Verify payment on backend
      const verificationResponse = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          txHash,
          expectedAmount: priceInLovelace,
          expectedAddress: PAYMENT_ADDRESS
        })
      })

      if (!verificationResponse.ok) {
        throw new Error('Payment verification failed')
      }

      setPaymentState(prev => ({ ...prev, step: 'Payment successful!' }))
      
      // Small delay to show success message
      setTimeout(() => {
        setPaymentState({ isProcessing: false, step: '' })
        onPaymentSuccess(txHash)
      }, 2000)

    } catch (error: any) {
      console.error('Payment failed:', error)
      
      let errorMessage = 'Payment failed'
      if (error.info) {
        errorMessage = `Payment rejected: ${error.info}`
      } else if (error.message?.includes('insufficient')) {
        errorMessage = 'Insufficient funds'
      } else if (error.message?.includes('network')) {
        errorMessage = 'Network error. Please try again.'
      } else if (error.message) {
        errorMessage = error.message
      }

      setPaymentState({ 
        isProcessing: false, 
        step: '', 
        error: errorMessage 
      })
      onError(errorMessage)

      // Clear error after 5 seconds
      setTimeout(() => {
        setPaymentState(prev => ({ ...prev, error: undefined }))
      }, 5000)
    }
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 12)}...${address.slice(-8)}`
  }

  return (
    <div className="space-y-4">
      {/* Wallet Connection Status */}
      {connected && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-900/20 border border-green-500/30 rounded-lg p-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <div>
                <div className="text-sm font-medium text-green-300">Wallet Connected</div>
                <div className="text-xs text-gray-400">Ready for payment</div>
              </div>
            </div>
            <Button
              onClick={disconnect}
              variant="outline"
              size="sm"
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Disconnect
            </Button>
          </div>
        </motion.div>
      )}

      {/* Payment Button */}
      <Button
        onClick={connected ? handlePayment : handleConnect}
        disabled={disabled || paymentState.isProcessing || connecting}
        className={`w-full h-14 text-lg font-semibold ${
          connected 
            ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700' 
            : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
        } transition-all duration-300 disabled:opacity-50`}
      >
        {connecting ? (
          <div className="flex items-center space-x-2">
            <div className="animate-spin">⚙️</div>
            <span>Connecting Wallet...</span>
          </div>
        ) : paymentState.isProcessing ? (
          <div className="flex items-center space-x-2">
            <div className="animate-spin">⚙️</div>
            <span>{paymentState.step}</span>
          </div>
        ) : connected ? (
          `Buy Mystery Box (${casePrice} ADA)`
        ) : (
          "Connect Wallet"
        )}
      </Button>

      {/* Transaction Hash Display */}
      {paymentState.txHash && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4"
        >
          <div className="text-sm font-medium text-blue-300 mb-2">Transaction Hash</div>
          <div className="font-mono text-xs text-gray-300 break-all">
            {paymentState.txHash}
          </div>
          <div className="mt-2">
            <a
              href={`https://cardanoscan.io/transaction/${paymentState.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 text-sm underline"
            >
              View on CardanoScan →
            </a>
          </div>
        </motion.div>
      )}

      {/* Error Display */}
      <AnimatePresence>
        {paymentState.error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-red-900/20 border border-red-500/30 rounded-lg p-4"
          >
            <div className="text-red-300 text-sm">{paymentState.error}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment Info */}
      {!connected && (
        <div className="text-center text-gray-400 text-sm">
          <div className="mb-2">💰 Payment: {casePrice} ADA</div>
          <div className="mb-2">🔒 Secure on-chain payment</div>
          <div>🎁 Instant case opening after confirmation</div>
        </div>
      )}
    </div>
  )
} 