import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, caseId, paymentTxHash, clientSeed } = await request.json()

    // Validate input
    if (!walletAddress || !caseId || !paymentTxHash || !clientSeed) {
      return NextResponse.json({ 
        error: 'Missing required fields: walletAddress, caseId, paymentTxHash, clientSeed' 
      }, { status: 400 })
    }

    // First, verify the payment transaction
    const verificationResponse = await fetch(`${process.env.NEXT_PUBLIC_VERCEL_URL || 'http://localhost:3000'}/api/verify-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        txHash: paymentTxHash,
        expectedAmount: '5000000', // 5 ADA in lovelace
        expectedAddress: process.env.NEXT_PUBLIC_PAYMENT_ADDRESS
      })
    })

    if (!verificationResponse.ok) {
      const verificationError = await verificationResponse.json()
      return NextResponse.json({ 
        error: `Payment verification failed: ${verificationError.error}` 
      }, { status: 400 })
    }

    // Get or create wallet user record
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 })
    }

    let { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single()

    if (userError && userError.code === 'PGRST116') {
      // User doesn't exist, create new one
      const { data: newUser, error: createError } = await supabaseAdmin
        .from('users')
        .insert({
          wallet_address: walletAddress,
          wallet_type: 'mesh_connected',
          username: `Player_${walletAddress.slice(-8)}`,
          credits: 1000, // Starting credits for platform features
          total_spent: 0,
          total_won: 0,
          cases_opened: 0
        })
        .select()
        .single()

      if (createError) {
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
      }
      user = newUser
    } else if (userError) {
      return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 })
    }

    // Check if this transaction has already been used
    const { data: existingOpening } = await supabaseAdmin
      .from('case_openings')
      .select('id')
      .eq('payment_tx_hash', paymentTxHash)
      .single()

    if (existingOpening) {
      return NextResponse.json({ 
        error: 'This payment transaction has already been used' 
      }, { status: 400 })
    }

    // Get case and symbols data
    const { data: case_, error: caseError } = await supabaseAdmin
      .from('cases')
      .select('*')
      .eq('id', caseId)
      .single()

    if (caseError) {
      return NextResponse.json({ error: 'Failed to fetch case data' }, { status: 500 })
    }

    // Get symbols for this case through case_symbols relationship
    const { data: caseSymbols, error: symbolsError } = await supabaseAdmin
      .from('case_symbols')
      .select(`
        weight,
        symbol_id,
        symbols (
          id,
          name,
          description,
          image_url,
          rarity,
          value,
          is_active,
          metadata
        )
      `)
      .eq('case_id', caseId)

    if (symbolsError) {
      return NextResponse.json({ error: 'Failed to fetch case symbols' }, { status: 500 })
    }

    if (!caseSymbols || caseSymbols.length === 0) {
      return NextResponse.json({ error: 'No symbols available for this case' }, { status: 400 })
    }

    // Transform case_symbols into the format expected by the rest of the code
    const symbols = caseSymbols.map(cs => ({
      id: cs.symbols.id,
      name: cs.symbols.name,
      description: cs.symbols.description,
      image_url: cs.symbols.image_url,
      rarity: cs.symbols.rarity,
      value: cs.symbols.value,
      drop_rate: cs.weight / 100, // Convert weight to drop rate
      is_active: cs.symbols.is_active,
      metadata: cs.symbols.metadata
    }))

    // Generate provably fair result
    const serverSeed = crypto.randomBytes(32).toString('hex')
    const nonce = user.cases_opened + 1
    
    // Create hash for random generation (include payment tx hash for additional randomness)
    const hash = crypto
      .createHmac('sha256', serverSeed)
      .update(`${clientSeed}-${nonce}-${paymentTxHash}`)
      .digest('hex')
    
    // Convert first 8 characters of hash to decimal
    const randomValue = parseInt(hash.substring(0, 8), 16) / 0xFFFFFFFF
    
    // Determine winning symbol based on drop rates
    let cumulativeRate = 0
    let selectedSymbol = symbols[0] // fallback to first symbol
    
    for (const symbol of symbols) {
      cumulativeRate += symbol.drop_rate
      if (randomValue <= cumulativeRate) {
        selectedSymbol = symbol
        break
      }
    }

    // Create case opening record
    const { data: caseOpening, error: openingError } = await supabaseAdmin
      .from('case_openings')
      .insert({
        user_id: user.id,
        case_id: caseId,
        symbol_id: selectedSymbol.id,
        symbol_key: selectedSymbol.metadata?.key || selectedSymbol.name.toLowerCase().replace(/\s+/g, '_'),
        symbol_name: selectedSymbol.name,
        symbol_rarity: selectedSymbol.rarity,
        payment_tx_hash: paymentTxHash,
        ada_spent: 5, // 5 ADA payment
        reward_value: selectedSymbol.value,
        server_seed: serverSeed,
        client_seed: clientSeed,
        nonce: nonce,
        random_value: randomValue
      })
      .select()
      .single()

    if (openingError) {
      console.error('Case opening insert error:', openingError)
      return NextResponse.json({ error: 'Failed to record case opening' }, { status: 500 })
    }

    // Update user stats (no credit deduction since payment was in ADA)
    await supabaseAdmin
      .from('users')
      .update({
        total_spent: user.total_spent + 5, // Track ADA spent
        total_won: user.total_won + selectedSymbol.value,
        cases_opened: user.cases_opened + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    // Return result with all the data needed for frontend
    return NextResponse.json({
      skin: selectedSkin,
      caseOpening: caseOpening,
      serverSeed: serverSeed,
      clientSeed: clientSeed,
      nonce: nonce,
      randomValue: randomValue,
      paymentTxHash: paymentTxHash
    })

  } catch (error) {
    console.error('Case opening error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 