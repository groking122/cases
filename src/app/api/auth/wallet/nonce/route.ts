import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { withRateLimit } from '@/lib/rate-limit.js'

function generateNonce(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('')
}

function assertNetworkOrThrow(addr: string) {
  const raw = process.env.CARDANO_NETWORK || 'Preprod'
  const isMainnet = /mainnet/i.test(raw)
  const isTestAddr = addr.startsWith('addr_test1')
  const isMainAddr = addr.startsWith('addr1') && !isTestAddr
  if ((isMainnet && isTestAddr) || (!isMainnet && isMainAddr)) {
    throw new Error('Wallet network mismatch')
  }
}

async function handler(request: NextRequest) {
  try {
    if (!supabaseAdmin) return NextResponse.json({ error: 'DB not configured' }, { status: 500 })
    const { walletAddress } = await request.json()
    if (!walletAddress || typeof walletAddress !== 'string' || walletAddress.length < 10) {
      return NextResponse.json({ error: 'walletAddress required' }, { status: 400 })
    }

    // Enforce network consistency
    try { assertNetworkOrThrow(walletAddress) } catch (e: any) {
      return NextResponse.json({ error: e?.message || 'Wallet network mismatch' }, { status: 400 })
    }

    const nonce = generateNonce()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    // Store/Upsert nonce (use a shared table admin_token_blacklist-style)
    const { error } = await supabaseAdmin
      .from('wallet_nonces')
      .upsert({ wallet_address: walletAddress, nonce, expires_at: expiresAt })

    if (error) return NextResponse.json({ error: 'Failed to store nonce' }, { status: 500 })
    return NextResponse.json({ nonce })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 })
  }
}

export const POST = withRateLimit({ check: async () => ({}) } as any, handler)


