"use client"

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { useWallet } from '@meshsdk/react'
import { Transaction } from '@meshsdk/core'
import WalletSelector from './WalletSelector'

interface CreditPack {
  id: number
  credits: number
  price: number // Price in ADA
}

const CREDIT_PACKS: CreditPack[] = [
  { id: 1, credits: 1000, price: 9.99 }, // 1 ADA/case (10 cases)
  { id: 2, credits: 2500, price: 19.99 }, // 0.80 ADA/case (25 cases, 20% discount)
  { id: 3, credits: 6000, price: 39.99 } // 0.67 ADA/case (60 cases, 33% discount)
]

interface CreditPacksProps {
  walletAddress: string
  onCreditsUpdated: (newCredits: number) => void
  selectedWallet: any
  onPurchaseSuccess?: (credits: number, txHash: string) => void
  onError?: (error: string) => void
}

export default function CreditPacks({ 
  walletAddress, 
  onCreditsUpdated, 
  selectedWallet,
  onPurchaseSuccess, 
  onError 
}: CreditPacksProps) {
  const { connected, wallet, connect, connecting } = useWallet()
  const [purchasing, setPurchasing] = useState<number | null>(null)

  // Debug wallet connection state
  useEffect(() => {
    console.log('CreditPacks - Wallet State:', { connected, wallet: !!wallet, connecting })
  }, [connected, wallet, connecting])

  // Add debug function for troubleshooting
  const debugEnvironment = () => {
    console.log('🔍 DEBUG - Environment Check:')
    console.log('Payment address:', process.env.NEXT_PUBLIC_PAYMENT_ADDRESS ? 'SET' : '❌ MISSING')
    console.log('Address length:', process.env.NEXT_PUBLIC_PAYMENT_ADDRESS?.length || 0)
    console.log('Wallet connected:', connected)
    console.log('Wallet object:', !!wallet)
    console.log('Current purchasing:', purchasing)
  }

  // Handle wallet connection using the wallet selector
  const handleWalletSelect = async (walletKey: string) => {
    try {
      await connect(walletKey)
    } catch (error: any) {
      if (onError) {
        onError(`Wallet connection failed: ${error.message || 'Unknown error'}`)
      } else {
        console.error('Wallet connection failed:', error)
      }
    }
  }

  const calculateDiscount = (pack: CreditPack) => {
    const casesInPack = pack.credits / 100 // Each case costs 100 credits
    const baselinePricePerCase = 0.999 // ~1 ADA per case (baseline from first pack: 9.99/10)
    const regularPrice = casesInPack * baselinePricePerCase
    const savings = regularPrice - pack.price
    const discountPercent = Math.round((savings / regularPrice) * 100)
    return discountPercent > 0 ? discountPercent : 0
  }

  const handlePurchase = async (pack: CreditPack) => {
    console.log('🛒 Starting instant credit purchase for pack:', pack)
    
    if (!connected || !wallet) {
      const errorMsg = 'Please connect your wallet first'
      if (onError) {
        onError(errorMsg)
      } else {
        console.error(errorMsg)
      }
      return
    }

    // Confirm purchase with user before proceeding
    const confirmed = window.confirm(`Purchase ${pack.credits} credits for ${pack.price} ADA?`)
    if (!confirmed) {
      return
    }

    setPurchasing(pack.id)

    try {
      // Debug environment variables
      console.log('🔧 Environment check:')
      console.log('Payment address status:', process.env.NEXT_PUBLIC_PAYMENT_ADDRESS ? 'SET' : 'MISSING')
      console.log('Payment address length:', process.env.NEXT_PUBLIC_PAYMENT_ADDRESS?.length || 0)
      console.log('Payment address preview:', process.env.NEXT_PUBLIC_PAYMENT_ADDRESS?.substring(0, 30) + '...' || 'NONE')

      // Get payment address from environment
      const paymentAddress = process.env.NEXT_PUBLIC_PAYMENT_ADDRESS
      if (!paymentAddress) {
        throw new Error('Payment address not configured. Please check environment variables.')
      }

      if (paymentAddress.length < 50) {
        throw new Error('Payment address appears to be incomplete.')
      }

      console.log('💰 Building transaction:', {
        pack: pack.credits + ' credits',
        price: pack.price + ' ADA',
        address: paymentAddress.substring(0, 20) + '...'
      })

      // Check wallet balance first
      try {
        const balance = await wallet.getBalance()
        console.log('💳 Wallet balance check:', balance)
        
        let adaBalance = 0
        if (Array.isArray(balance)) {
          const adaAsset = balance.find(asset => asset.unit === 'lovelace')
          if (adaAsset) {
            adaBalance = parseInt(adaAsset.quantity) / 1000000
          }
        }
        
        console.log('💰 ADA Balance:', adaBalance, 'Required:', pack.price)
        
        if (adaBalance < pack.price) {
          throw new Error(`Insufficient ADA balance. You have ${adaBalance.toFixed(2)} ADA but need ${pack.price} ADA`)
        }
      } catch (balanceError: any) {
        console.warn('⚠️ Could not check balance:', balanceError)
        // Continue anyway, let the transaction fail if insufficient funds
      }

      // Build transaction with proper error handling
      const priceInLovelace = Math.floor(pack.price * 1000000).toString()
      console.log('🔨 Transaction details:', {
        priceInADA: pack.price,
        priceInLovelace: priceInLovelace,
        paymentAddress: paymentAddress
      })

      const tx = new Transaction({ initiator: wallet })
        .sendLovelace(paymentAddress, priceInLovelace)

      console.log('🏗️ Building unsigned transaction...')
      let unsignedTx: string
      
      try {
        unsignedTx = await tx.build()
        console.log('✅ Unsigned transaction built successfully')
      } catch (buildError: any) {
        console.error('❌ Transaction build failed:', buildError)
        throw new Error(`Transaction build failed: ${buildError.message || buildError}`)
      }
      
      console.log('✍️ Requesting wallet signature...')
      let signedTx: string
      
      try {
        signedTx = await wallet.signTx(unsignedTx)
        console.log('✅ Transaction signed successfully')
      } catch (signError: any) {
        console.error('❌ Transaction signing failed:', signError)
        if (signError.code === 2) {
          throw new Error('Transaction was cancelled by user')
        }
        throw new Error(`Transaction signing failed: ${signError.message || signError}`)
      }
      
      // SECURITY FIX: Only allow real transactions for credit purchases
      // Remove test mode to prevent free credits exploit
      console.log('📡 Submitting transaction to blockchain...')
      
      let txHash: string
      try {
        txHash = await wallet.submitTx(signedTx)
        console.log('✅ Transaction submitted successfully! Hash:', txHash)
        
        // Validate transaction hash format
        if (!txHash || txHash.length !== 64) {
          throw new Error('Invalid transaction hash received from wallet')
        }
        
        // Additional security: Ensure it's not a test hash
        if (txHash.startsWith('test_')) {
          throw new Error('Test transactions are not allowed for credit purchases')
        }
        
      } catch (submitError: any) {
        console.error('❌ Transaction submission failed:', submitError)
        
        // Provide specific error messages for common issues
        if (submitError.message?.includes('insufficient')) {
          throw new Error('Insufficient ADA to cover transaction and fees')
        } else if (submitError.message?.includes('network')) {
          throw new Error('Network connection issue. Please check your internet and try again.')
        } else if (submitError.code === 1) {
          throw new Error('Transaction was rejected by the network. Please try again.')
        } else {
          throw new Error(`Transaction submission failed: ${submitError.message || 'Unknown blockchain error'}`)
        }
      }

      console.log('🔍 Verifying payment with backend...')

      // Verify payment on backend with retry logic
      let verificationResponse: Response
      let retryCount = 0
      const maxRetries = 3
      
      while (retryCount < maxRetries) {
        try {
          verificationResponse = await fetch('/api/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              txHash,
              expectedAmount: priceInLovelace,
              expectedAddress: paymentAddress
            })
          })
          
          if (verificationResponse.ok) {
            break
          } else if (verificationResponse.status === 404 && retryCount < maxRetries - 1) {
            // Transaction might not be confirmed yet, wait and retry
            console.log(`🕒 Transaction not confirmed yet, retrying in ${2 ** retryCount} seconds...`)
            await new Promise(resolve => setTimeout(resolve, (2 ** retryCount) * 1000))
            retryCount++
            continue
          } else {
            const errorData = await verificationResponse.json()
            throw new Error(errorData.error || 'Payment verification failed')
          }
        } catch (verifyError: any) {
          if (retryCount === maxRetries - 1) {
            throw new Error(`Payment verification failed after ${maxRetries} attempts: ${verifyError.message}`)
          }
          retryCount++
          await new Promise(resolve => setTimeout(resolve, (2 ** retryCount) * 1000))
        }
      }

      console.log('✅ Payment verified successfully!')

      // Add credits to user account with error handling
      console.log('💎 Adding credits to user account...')
      
      try {
        const addCreditsResponse = await fetch('/api/add-credits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            txHash,
            credits: pack.credits,
            walletAddress: await wallet.getUsedAddresses(),
            expectedAmount: priceInLovelace, // Pass the exact amount we used for the transaction
            expectedAddress: paymentAddress
          })
        })

        if (!addCreditsResponse.ok) {
          const errorData = await addCreditsResponse.json()
          console.error('❌ Add credits API error:', errorData)
          
          // Handle specific error types
          if (errorData.error === 'Transaction already processed') {
            // This means the transaction was already used - possible duplicate
            console.log('⚠️ Transaction already processed - this might be a duplicate attempt')
            throw new Error('This transaction has already been processed. Please check your balance or contact support if you believe this is an error.')
          } else if (errorData.error.includes('verification failed')) {
            // Payment verification failed
            throw new Error('Payment verification failed. The transaction may not have been confirmed on the blockchain yet. Please wait a few minutes and contact support if the issue persists.')
          } else if (errorData.error.includes('Test transactions')) {
            // Test transaction rejected
            throw new Error('Test transactions are not allowed. Please make a real ADA payment to purchase credits.')
          } else if (errorData.error.includes('Invalid transaction hash')) {
            // Invalid hash format
            throw new Error('Invalid transaction detected. Please try again with a valid Cardano transaction.')
          } else {
            throw new Error(`Failed to add credits: ${errorData.error}`)
          }
        }
        
        const creditResult = await addCreditsResponse.json()
        console.log('✅ Credits added successfully!', creditResult)
      } catch (creditsError: any) {
        console.error('❌ Credits addition failed:', creditsError)
        
        // Even if credits failed to add, we should inform user the payment went through
        const errorMsg = `Payment successful (${txHash.substring(0, 8)}...) but credits may not have been added immediately. Please contact support if your balance doesn't update.`
        if (onError) {
          onError(errorMsg)
        } else {
          console.error(errorMsg)
        }
        setPurchasing(null)
        return
      }

      // Success! Get updated credits from user's account
      console.log('🎉 Purchase completed successfully!')
      
      // Get updated credits from the API
      try {
        const creditsResponse = await fetch('/api/get-credits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletAddress })
        })
        
        if (creditsResponse.ok) {
          const creditsData = await creditsResponse.json()
          console.log('💰 Updated credits:', creditsData.credits)
          onCreditsUpdated(creditsData.credits || 0)
        } else {
          console.warn('Could not fetch updated credits, using estimated amount')
          // Fallback: use the purchased amount (this might not be accurate if user had existing credits)
          onCreditsUpdated(pack.credits)
        }
      } catch (error) {
        console.warn('Error fetching updated credits:', error)
        onCreditsUpdated(pack.credits)
      }
      
      if (onPurchaseSuccess) {
        onPurchaseSuccess(pack.credits, txHash)
      }
      setPurchasing(null)

    } catch (error: any) {
      console.error('❌ Credit purchase error occurred!')
      console.error('Full error object:', error)
      console.error('Error type:', typeof error)
      console.error('Error details:', {
        message: error?.message,
        code: error?.code,
        info: error?.info,
        name: error?.name,
        stack: error?.stack?.substring(0, 300)
      })
      
      let errorMessage = 'Failed to purchase credits'
      
      if (error?.message) {
        errorMessage = error.message
      } else if (error?.info) {
        errorMessage = `Transaction error: ${error.info}`
      } else if (error?.code) {
        errorMessage = `Error code: ${error.code}`
      } else if (typeof error === 'string') {
        errorMessage = error
      }
      
      if (onError) {
        onError(errorMessage)
      } else {
        console.error('Purchase error:', errorMessage)
      }
      setPurchasing(null)
    }
  }

  if (!connected) {
    return (
      <div className="max-w-2xl mx-auto">
        <WalletSelector
          onWalletSelect={handleWalletSelect}
          onError={onError || ((error) => console.error('Wallet selector error:', error))}
          connecting={connecting}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-white mb-2">Choose Your Credit Pack</h2>
        <p className="text-gray-400">Click to purchase instantly with your connected wallet</p>
        
        {/* Debug Button for Development */}
        {process.env.NODE_ENV === 'development' && (
          <button
            onClick={debugEnvironment}
            className="mt-2 text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"
            title="Debug environment and wallet status"
          >
            🐛 Debug Purchase Issues
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {CREDIT_PACKS.map((pack, index) => {
          const discount = calculateDiscount(pack)
          const isPurchasing = purchasing === pack.id

          return (
            <motion.div
              key={pack.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`relative bg-gray-900/50 border rounded-xl p-6 space-y-4 ${
                discount > 0 
                  ? 'border-purple-500/50 bg-gradient-to-br from-purple-900/20 to-pink-900/20' 
                  : 'border-gray-700'
              }`}
            >
              {/* Best Value Badge */}
              {discount >= 30 && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                    BEST VALUE
                  </div>
                </div>
              )}

              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-1">
                  {pack.credits} Credits
                </div>
                <div className="text-gray-400 text-sm mb-2">
                  = {pack.credits / 100} Case Opening{(pack.credits / 100) > 1 ? 's' : ''}
                </div>
                
                {discount > 0 && (
                  <div className="bg-green-500/20 border border-green-500/30 rounded-lg px-2 py-1 mb-3">
                    <span className="text-green-400 text-sm font-semibold">
                      {discount}% OFF
                    </span>
                  </div>
                )}
              </div>

              <div className="text-center space-y-2">
                <div className="text-2xl font-bold text-blue-400">
                  {pack.price} ADA
                </div>
                <div className="text-xs text-gray-500">
                  {(pack.price / (pack.credits / 100)).toFixed(2)} ADA per case
                </div>
              </div>

              <Button
                onClick={() => handlePurchase(pack)}
                disabled={isPurchasing}
                className={`w-full h-12 font-semibold ${
                  discount > 0
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
                    : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700'
                } transition-all duration-300`}
              >
                {isPurchasing ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin">⚙️</div>
                    <span>Processing Payment...</span>
                  </div>
                ) : (
                  `Buy ${pack.credits} Credits - ${pack.price} ADA`
                )}
              </Button>
            </motion.div>
          )
        })}
      </div>

      <div className="text-center text-xs text-gray-500">
        <div>💡 Credits never expire and can be used anytime</div>
        <div>🔒 All payments are secured on the Cardano blockchain</div>
      </div>
    </div>
  )
} 