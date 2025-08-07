import { NextRequest, NextResponse } from 'next/server'
import { BlockfrostProvider } from '@meshsdk/core'

export async function POST(request: NextRequest) {
  try {
    const { txHash, expectedAmount, expectedAddress } = await request.json()

    console.log('🔍 Payment verification request:', {
      txHash: txHash?.substring(0, 16) + '...',
      expectedAmount,
      expectedAddress: expectedAddress?.substring(0, 20) + '...'
    })

    if (!txHash || !expectedAmount || !expectedAddress) {
      return NextResponse.json(
        { error: 'Missing required fields: txHash, expectedAmount, expectedAddress' },
        { status: 400 }
      )
    }

    // Validate transaction hash format
    if (!txHash.match(/^[a-fA-F0-9]{64}$/) && !txHash.startsWith('test_')) {
      return NextResponse.json(
        { error: 'Invalid transaction hash format' },
        { status: 400 }
      )
    }

    // SECURITY FIX: Disable automatic test mode acceptance
    // Only allow test transactions in very specific development scenarios
    if (txHash.startsWith('test_')) {
      // Check if this is explicitly allowed for testing
      const allowTestMode = process.env.ALLOW_TEST_PAYMENTS === 'true'
      
      if (!allowTestMode) {
        console.log('🚫 TEST MODE DISABLED: Rejecting test transaction for security')
        return NextResponse.json(
          { error: 'Test transactions are not allowed in this environment' },
          { status: 400 }
        )
      }
      
      // If test mode is explicitly enabled, only allow it for specific test accounts
      const isTestEnvironment = process.env.NODE_ENV === 'development' && 
                               process.env.ENABLE_TEST_CREDITS === 'true'
      
      if (!isTestEnvironment) {
        console.log('🚫 TEST ENVIRONMENT NOT ENABLED: Rejecting test transaction')
        return NextResponse.json(
          { error: 'Test environment not properly configured' },
          { status: 400 }
        )
      }
      
      console.log('🧪 TEST MODE: Accepting test transaction with restrictions')
      return NextResponse.json({
        success: true,
        verified: true,
        testMode: true,
        txHash: txHash,
        warning: 'This is a test transaction - should not be used in production'
      })
    }

    // Get Blockfrost API key from environment
    const blockfrostApiKey = process.env.BLOCKFROST_API_KEY
    console.log('🔧 Blockfrost Configuration:', {
      hasApiKey: !!blockfrostApiKey,
      keyLength: blockfrostApiKey?.length || 0,
      keyPrefix: blockfrostApiKey?.substring(0, 10) + '...' || 'NONE'
    })
    
    if (!blockfrostApiKey) {
      console.error('❌ BLOCKFROST_API_KEY not configured')
      return NextResponse.json(
        { 
          error: 'Payment verification service not configured',
          details: 'Missing Blockfrost API key in environment variables'
        },
        { status: 500 }
      )
    }

    // Validate API key format
    if (!blockfrostApiKey.startsWith('preprod') && !blockfrostApiKey.startsWith('mainnet')) {
      console.error('❌ Invalid Blockfrost API key format')
      return NextResponse.json(
        { 
          error: 'Payment verification service misconfigured',
          details: 'Invalid Blockfrost API key format'
        },
        { status: 500 }
      )
    }

    // Declare transaction variable outside try-catch for scope access
    let transaction
    
    try {
      // Initialize Blockfrost provider for testnet
      // The API key contains the network info (preprod for testnet)
      console.log('🌐 Blockfrost key network:', blockfrostApiKey.startsWith('preprod') ? 'preprod (testnet)' : 'mainnet')
      
      const blockfrost = new BlockfrostProvider(blockfrostApiKey)
      console.log('✅ Blockfrost provider initialized successfully')
      
      console.log('🔍 Attempting to verify transaction:', txHash)
      
      // Fetch transaction details from Cardano blockchain with retry logic
      let attempts = 0
      const maxAttempts = 3
      
      while (attempts < maxAttempts) {
        try {
          console.log(`🔄 Fetching transaction info (attempt ${attempts + 1}/${maxAttempts})...`)
          transaction = await blockfrost.fetchTxInfo(txHash)
          console.log('✅ Transaction found on blockchain')
          break
        } catch (error: any) {
          attempts++
          
          // Enhanced error logging to understand the actual error
          console.error(`❌ Blockfrost API error (attempt ${attempts}/${maxAttempts}):`)
          console.error('Full error object:', error)
          console.error('Error type:', typeof error)
          console.error('Error constructor:', error?.constructor?.name)
          
          // Try to extract meaningful error information
          let errorInfo = {
            message: error?.message || error?.msg || error?.error || 'Unknown error',
            status: error?.status || error?.response?.status || error?.statusCode,
            statusText: error?.statusText || error?.response?.statusText,
            code: error?.code || error?.error_code,
            name: error?.name || 'UnknownError',
            response: error?.response?.data || error?.data || null
          }
          
          console.error('Extracted error info:', errorInfo)
          
          // For 404 errors, this likely means transaction not found or not confirmed yet
          if (errorInfo.status === 404 || error?.message?.includes('404')) {
            console.log('📋 Transaction appears to be 404 - likely not confirmed yet')
          }
          
          // If it's the last attempt, handle the error appropriately
          if (attempts === maxAttempts) {
            // Handle specific Blockfrost errors
            if (error.status === 404) {
              console.log('📋 Transaction not found - might be unconfirmed')
              return NextResponse.json(
                { 
                  error: 'Transaction not found on blockchain',
                  txHash: txHash,
                  note: 'Transaction may not be confirmed yet. Please wait a few minutes and try again.',
                  retryAfter: 60
                },
                { status: 404 }
              )
            }
            
            if (error.status === 400) {
              console.log('📋 Invalid transaction hash format')
              return NextResponse.json(
                { error: 'Invalid transaction hash format' },
                { status: 400 }
              )
            }

            // For API key issues or network problems
            if (error.status === 403 || error.status === 401) {
              console.error('❌ Blockfrost API authentication failed')
              return NextResponse.json(
                { 
                  error: 'Payment verification service authentication failed',
                  details: 'Please check Blockfrost API key configuration'
                },
                { status: 500 }
              )
            }

            // Generic error fallback
            console.error('❌ Blockfrost API failed after all retries')
            return NextResponse.json(
              { 
                error: 'Payment verification temporarily unavailable',
                details: 'Blockchain verification service is experiencing issues. Please try again in a few minutes.',
                txHash: txHash,
                canRetry: true
              },
              { status: 503 }
            )
          }
          
          // Wait before retrying (exponential backoff)
          const waitTime = Math.pow(2, attempts - 1) * 1000 // 1s, 2s, 4s
          console.log(`⏳ Waiting ${waitTime}ms before retry...`)
          await new Promise(resolve => setTimeout(resolve, waitTime))
        }
      }
    } catch (initError: any) {
      console.error('❌ Failed to initialize Blockfrost provider:', {
        message: initError.message,
        name: initError.name,
        stack: initError.stack?.substring(0, 200)
      })
      
      return NextResponse.json(
        { 
          error: 'Payment verification service initialization failed',
          details: 'Could not connect to blockchain verification service'
        },
        { status: 500 }
      )
    }

    if (!transaction) {
      console.log('❌ Transaction not found on blockchain:', txHash)
      return NextResponse.json(
        { 
          error: 'Transaction not found on blockchain',
          txHash: txHash,
          note: 'Transaction may not be confirmed yet or may not exist'
        },
        { status: 404 }
      )
    }

    console.log('📋 Transaction details:', {
      hash: transaction.hash,
      block: transaction.block,
      outputCount: transaction.outputs?.length || 0,
      fees: transaction.fees
    })

    // Verify payment details with better validation
    let paymentValid = false
    let foundOutput = null

    for (const output of transaction.outputs || []) {
      // UTxO objects have nested structure - access via output property
      const outputData = (output as any).output || output
      const addressMatch = outputData.address === expectedAddress
      let amountMatch = false

      // Check if output has the expected amount in lovelace
      if (outputData.amount && Array.isArray(outputData.amount)) {
        const lovelaceAsset = outputData.amount.find((asset: any) => asset.unit === 'lovelace')
        if (lovelaceAsset) {
          const actualAmount = parseInt(lovelaceAsset.quantity)
          const expectedAmountInt = parseInt(expectedAmount)
          
          // Allow for reasonable variations due to wallet behavior and rounding (within 50000 lovelace = 0.05 ADA)
          // This accounts for different wallet implementations and fee handling
          const tolerance = 50000
          amountMatch = Math.abs(actualAmount - expectedAmountInt) <= tolerance
          
          console.log('💰 Amount comparison:', {
            expected: expectedAmountInt,
            actual: actualAmount,
            difference: actualAmount - expectedAmountInt,
            withinTolerance: amountMatch
          })
        }
      }

      if (addressMatch && amountMatch) {
        paymentValid = true
        foundOutput = output
        console.log('✅ Payment validation successful')
        break
      }
    }

    if (!paymentValid) {
      console.log('❌ Payment validation failed:', {
        txHash,
        expectedAmount,
        expectedAddress: expectedAddress.substring(0, 20) + '...',
        actualOutputs: transaction.outputs?.map((output: any) => ({
          address: output.address?.substring(0, 20) + '...',
          amount: output.amount?.find((a: any) => a.unit === 'lovelace')?.quantity
        }))
      })
      
      return NextResponse.json(
        { 
          error: 'Payment validation failed - amount or address mismatch',
          details: {
            expectedAddress: expectedAddress.substring(0, 20) + '...',
            expectedAmount: expectedAmount,
            actualOutputs: transaction.outputs?.length || 0
          }
        },
        { status: 400 }
      )
    }

    // Payment is valid - log success
    console.log('✅ Payment verified successfully:', {
      txHash: txHash.substring(0, 16) + '...',
      amount: expectedAmount,
      address: expectedAddress.substring(0, 20) + '...',
      block: transaction.block
    })

    return NextResponse.json({ 
      success: true,
      verified: true,
      txHash,
      verifiedAt: new Date().toISOString(),
      blockHeight: (transaction as any).blockHeight || (transaction as any).block_height || 0,
      confirmations: (transaction as any).confirmations || 0
    })

  } catch (error: any) {
    console.error('❌ Payment verification error:', error)
    
    return NextResponse.json(
      { error: 'Payment verification failed - please try again' },
      { status: 500 }
    )
  }
} 