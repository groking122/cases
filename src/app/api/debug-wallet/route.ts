import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, action } = await request.json()

    console.log('🔧 Debug wallet request:', { walletAddress, action })

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 400 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 })
    }

    const results: any = {
      walletAddress,
      timestamp: new Date().toISOString()
    }

    // Get user info
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single()

    results.user = user ? {
      id: user.id,
      username: user.username,
      credits: user.credits,
      total_spent: user.total_spent,
      total_won: user.total_won,
      cases_opened: user.cases_opened,
      wallet_connected_at: user.wallet_connected_at,
      is_active: user.is_active
    } : null
    results.userError = userError?.message || null

    if (action === 'full_debug') {
      // Get credit transactions
      if (user) {
        const { data: creditTransactions, error: creditError } = await supabaseAdmin
          .from('credit_transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10)

        results.creditTransactions = creditTransactions || []
        results.creditTransactionsError = creditError?.message || null

        // Get case openings
        const { data: caseOpenings, error: openingsError } = await supabaseAdmin
          .from('case_openings')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10)

        results.caseOpenings = caseOpenings || []
        results.caseOpeningsError = openingsError?.message || null

        // Get available cases
        const { data: cases, error: casesError } = await supabaseAdmin
          .from('cases')
          .select('*')
          .eq('active', true)

        results.availableCases = cases || []
        results.casesError = casesError?.message || null
      }
    }

    // Database health check
    const { data: healthCheck, error: healthError } = await supabaseAdmin
      .from('users')
      .select('id')
      .limit(1)

    results.databaseHealthy = !healthError
    results.healthError = healthError?.message || null

    // Environment check
    results.environment = {
      paymentAddress: process.env.NEXT_PUBLIC_PAYMENT_ADDRESS ? 'SET' : 'MISSING',
      paymentAddressLength: process.env.NEXT_PUBLIC_PAYMENT_ADDRESS?.length || 0,
      blockfrostKey: process.env.BLOCKFROST_API_KEY ? 'SET' : 'MISSING',
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING',
      supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING'
    }

    console.log('🔧 Debug results:', results)

    return NextResponse.json({
      success: true,
      debug: results
    })

  } catch (error: any) {
    console.error('❌ Debug wallet error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Debug failed',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
} 