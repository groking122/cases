import { NextRequest, NextResponse } from 'next/server'
import { BlockfrostProvider } from '@meshsdk/core'

export async function GET(request: NextRequest) {
  try {
    // Get Blockfrost API key from environment
    const blockfrostApiKey = process.env.BLOCKFROST_API_KEY
    
    console.log('🔧 Testing Blockfrost Configuration:')
    console.log('Has API key:', !!blockfrostApiKey)
    console.log('Key length:', blockfrostApiKey?.length || 0)
    console.log('Key prefix:', blockfrostApiKey?.substring(0, 10) + '...' || 'NONE')
    console.log('Network type:', blockfrostApiKey?.startsWith('preprod') ? 'preprod (testnet)' : 'mainnet')
    
    if (!blockfrostApiKey) {
      return NextResponse.json({
        success: false,
        error: 'BLOCKFROST_API_KEY not configured',
        details: 'Missing environment variable'
      })
    }

    // Validate API key format
    if (!blockfrostApiKey.startsWith('preprod') && !blockfrostApiKey.startsWith('mainnet')) {
      return NextResponse.json({
        success: false,
        error: 'Invalid Blockfrost API key format',
        details: 'API key must start with "preprod" or "mainnet"'
      })
    }

    try {
      // Initialize Blockfrost provider
      const blockfrost = new BlockfrostProvider(blockfrostApiKey)
      console.log('✅ Blockfrost provider initialized successfully')
      
      // Test with a known testnet transaction hash (replace with a real one for testing)
      const testTxHash = '4a3f86762383f1d228e42e4f4e0d7d5c2d1c8e9f6a5b4c3d2e1f0987654321ab'
      
      console.log('🧪 Testing with sample transaction hash:', testTxHash)
      
      try {
        // Try to fetch transaction info
        const txInfo = await blockfrost.fetchTxInfo(testTxHash)
        console.log('✅ Blockfrost API call successful')
        
        return NextResponse.json({
          success: true,
          message: 'Blockfrost testnet connection successful',
          network: blockfrostApiKey.startsWith('preprod') ? 'preprod (testnet)' : 'mainnet',
          testTransaction: {
            hash: testTxHash,
            found: true,
            block: txInfo.block
          }
        })
        
      } catch (txError: any) {
        console.log('📋 Transaction test result:', txError.message || 'No error message')
        
        // Even if the test transaction fails, if we get a proper error response,
        // it means Blockfrost is working correctly
        if (txError.status === 404 || txError.message?.includes('404')) {
          return NextResponse.json({
            success: true,
            message: 'Blockfrost testnet connection working (test transaction not found, which is expected)',
            network: blockfrostApiKey.startsWith('preprod') ? 'preprod (testnet)' : 'mainnet',
            testTransaction: {
              hash: testTxHash,
              found: false,
              reason: 'Transaction not found (expected for test hash)'
            }
          })
        }
        
        // Log full error for debugging
        console.error('🔍 Full transaction error details:')
        console.error('Error object:', txError)
        console.error('Error type:', typeof txError)
        console.error('Error properties:', Object.keys(txError))
        
        return NextResponse.json({
          success: false,
          error: 'Blockfrost API test failed',
          details: {
            message: txError.message || 'Unknown error',
            status: txError.status || 'No status',
            type: typeof txError,
            keys: Object.keys(txError)
          }
        })
      }
      
    } catch (initError: any) {
      console.error('❌ Failed to initialize Blockfrost provider:', initError)
      
      return NextResponse.json({
        success: false,
        error: 'Failed to initialize Blockfrost provider',
        details: {
          message: initError.message || 'Unknown initialization error',
          name: initError.name || 'UnknownError'
        }
      })
    }

  } catch (error: any) {
    console.error('❌ Blockfrost test error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Blockfrost test failed',
      details: error.message || 'Unknown error'
    })
  }
} 