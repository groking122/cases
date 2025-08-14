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
  selectedWallet?: unknown
  onPurchaseSuccess?: (credits: number, txHash: string) => void
  onError?: (error: string) => void
}

export default function CreditPacks({ 
  walletAddress, 
  onCreditsUpdated, 

  onPurchaseSuccess, 
  onError 
}: CreditPacksProps) {
  const { connected, wallet, connect, connecting } = useWallet()
  const [purchasing, setPurchasing] = useState<number | null>(null)
  const [inlineError, setInlineError] = useState<string | null>(null)
  const [canHover, setCanHover] = useState<boolean>(true)

  // Debug wallet connection state
  useEffect(() => {
    console.log('CreditPacks - Wallet State:', { connected, wallet: !!wallet, connecting })
  }, [connected, wallet, connecting])

  // Detect hover capability to avoid hover animations on touch devices
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      setCanHover(true)
      return
    }
    const mq = window.matchMedia('(hover: hover)')
    const update = () => setCanHover(!!mq.matches)
    update()
    mq.addEventListener?.('change', update)
    return () => mq.removeEventListener?.('change', update)
  }, [])



  // Handle wallet connection using the wallet selector
  const handleWalletSelect = async (walletKey: string) => {
    try {
      await connect(walletKey)
    } catch (error: unknown) {
      if (onError) {
        onError(`Wallet connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
    setInlineError(null)
    
    if (!connected || !wallet) {
      const errorMsg = 'Please connect your wallet first'
      if (onError) {
        onError(errorMsg)
      } else {
        console.error(errorMsg)
      }
      setInlineError(errorMsg)
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
      } catch (balanceError: unknown) {
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
      } catch (buildError: unknown) {
        console.error('❌ Transaction build failed:', buildError)
        throw new Error(`Transaction build failed: ${buildError instanceof Error ? buildError.message : String(buildError)}`)
      }
      
      console.log('✍️ Requesting wallet signature...')
      let signedTx: string
      
      try {
        signedTx = await wallet.signTx(unsignedTx)
        console.log('✅ Transaction signed successfully')
      } catch (signError: unknown) {
        console.error('❌ Transaction signing failed:', signError)
        if (signError && typeof signError === 'object' && 'code' in signError && signError.code === 2) {
          throw new Error('Transaction was cancelled by user')
        }
        throw new Error(`Transaction signing failed: ${signError instanceof Error ? signError.message : String(signError)}`)
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
        
      } catch (submitError: unknown) {
        console.error('❌ Transaction submission failed:', submitError)
        
        // Provide specific error messages for common issues
        const errorMessage = submitError instanceof Error ? submitError.message : String(submitError)
        if (errorMessage.includes('insufficient')) {
          throw new Error('Insufficient ADA to cover transaction and fees')
        } else if (errorMessage.includes('network')) {
          throw new Error('Network connection issue. Please check your internet and try again.')
        } else if (submitError && typeof submitError === 'object' && 'code' in submitError && submitError.code === 1) {
          throw new Error('Transaction was rejected by the network. Please try again.')
        } else {
          throw new Error(`Transaction submission failed: ${errorMessage || 'Unknown blockchain error'}`)
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
        } catch (verifyError: unknown) {
          if (retryCount === maxRetries - 1) {
            throw new Error(`Payment verification failed after ${maxRetries} attempts: ${verifyError instanceof Error ? verifyError.message : String(verifyError)}`)
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
      } catch (creditsError: unknown) {
        console.error('❌ Credits addition failed:', creditsError)
        
        // Even if credits failed to add, we should inform user the payment went through
        const errorMsg = `Payment successful (${txHash.substring(0, 8)}...) but credits may not have been added immediately. Please contact support if your balance doesn't update.`
        if (onError) {
          onError(errorMsg)
        } else {
          console.error(errorMsg)
        }
        setInlineError(errorMsg)
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
      setInlineError(null)

    } catch (error: unknown) {
      console.error('❌ Credit purchase error occurred!')
      console.error('Full error object:', error)
      console.error('Error type:', typeof error)
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown',
        type: typeof error,
        value: String(error)
      })
      
      let errorMessage = 'Failed to purchase credits'
      
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === 'string') {
        errorMessage = error
      } else if (error && typeof error === 'object') {
        if ('info' in error && typeof error.info === 'string') {
          errorMessage = `Transaction error: ${error.info}`
        } else if ('code' in error) {
          errorMessage = `Error code: ${String(error.code)}`
        }
      }
      
      if (onError) {
        onError(errorMessage)
      } else {
        console.error('Purchase error:', errorMessage)
      }
      setInlineError(errorMessage)
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
        

      </div>

      <div className="flex flex-col md:flex-row gap-4 justify-center items-stretch">
        {CREDIT_PACKS.map((pack, index) => {
          const discount = calculateDiscount(pack)
          const isPurchasing = purchasing === pack.id

          return (
            <motion.div
              key={pack.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={canHover ? { scale: 1.02, y: -5 } : undefined}
              className={`relative bg-gray-800/40 border border-orange-600/30 rounded-xl p-6 flex-1 max-w-sm flex flex-col min-h-[320px] cursor-pointer transition-all duration-300 ${
                discount > 0 
                  ? 'border-orange-600/60 bg-gradient-to-br from-orange-900/20 to-gray-900/40 shadow-lg shadow-orange-600/10' 
                  : 'bg-gradient-to-br from-gray-800/40 to-gray-900/60 hover:border-orange-600/50'
              } ${isPurchasing ? 'opacity-75 cursor-not-allowed' : ''}`}
            >
              {/* Discount badge - top-right */}
              <div className="absolute top-2 right-2">
                <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-md px-2 py-1">
                  <span className="text-emerald-400 text-xs font-semibold">
                    {discount > 0 ? `${discount}% OFF` : 'STANDARD'}
                  </span>
                </div>
              </div>
              {/* Best Value Badge */}
              {discount >= 30 && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <div className="bg-gradient-to-r from-orange-600 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                    BEST VALUE
                  </div>
                </div>
              )}

              <div className="text-center flex-grow flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="text-3xl font-bold text-white">
                    {pack.credits.toLocaleString()} Credits
                  </div>
                  <div className="text-gray-400 text-sm">
                    = {pack.credits / 100} Case Opening{(pack.credits / 100) > 1 ? 's' : ''}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-3xl font-bold text-orange-400">
                    {pack.price} ADA
                  </div>
                  <div className="text-xs text-gray-500">
                    {(pack.price / (pack.credits / 100)).toFixed(2)} ADA per case
                  </div>
                </div>
              </div>

              <Button
                onClick={() => handlePurchase(pack)}
                disabled={isPurchasing}
                className={`w-full h-12 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                  discount > 0
                    ? 'bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600'
                    : 'bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600'
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

              {/* Processing overlay */}
              {isPurchasing && (
                <div className="absolute inset-0 rounded-xl bg-black/50 flex items-center justify-center">
                  <div className="text-white text-sm">Authorizing...</div>
                </div>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* Inline error message */}
      {inlineError && (
        <div className="text-center text-red-400 text-sm">{inlineError}</div>
      )}

      <div className="flex items-center justify-center gap-6 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <span className="text-orange-400">💡</span>
          <span>Credits never expire</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-orange-400">🔒</span>
          <span>Blockchain secured</span>
        </div>
      </div>
    </div>
  )
} 