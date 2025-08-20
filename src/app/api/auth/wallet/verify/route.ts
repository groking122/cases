import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { signUserToken } from '@/lib/userAuth'
import { withRateLimit } from '@/lib/rate-limit.js'

// NOTE: Replace this with your real CIP-8 verification implementation
async function verifySignature(message: string, signature: string, walletAddress: string): Promise<boolean> {
  // TODO: integrate actual wallet signature verification
  return Boolean(message) && Boolean(signature) && Boolean(walletAddress)
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
    const { walletAddress, signature } = await request.json()
    if (!walletAddress || !signature) return NextResponse.json({ error: 'missing fields' }, { status: 400 })

    // Enforce network consistency
    try { assertNetworkOrThrow(walletAddress) } catch (e: any) {
      return NextResponse.json({ error: e?.message || 'Wallet network mismatch' }, { status: 400 })
    }

    // Load nonce
    const { data: rec, error: nonceErr } = await supabaseAdmin
      .from('wallet_nonces')
      .select('nonce, expires_at')
      .eq('wallet_address', walletAddress)
      .single()

    if (nonceErr || !rec) return NextResponse.json({ error: 'nonce missing' }, { status: 400 })
    if (rec.expires_at && new Date(rec.expires_at) < new Date()) {
      return NextResponse.json({ error: 'nonce expired' }, { status: 400 })
    }

    const ok = await verifySignature(rec.nonce, signature, walletAddress)
    if (!ok) return NextResponse.json({ error: 'bad signature' }, { status: 401 })

    // One-time use
    await supabaseAdmin.from('wallet_nonces').delete().eq('wallet_address', walletAddress)

    // Upsert user by wallet
    const { data: existing } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('wallet_address', walletAddress)
      .single()

    let userId: string
    if (existing?.id) {
      userId = existing.id
      await supabaseAdmin.from('users').update({ wallet_connected_at: new Date().toISOString() }).eq('id', userId)
    } else {
      const { data: created, error: createErr } = await supabaseAdmin
        .from('users')
        .insert({ wallet_address: walletAddress, username: `Gamer_${walletAddress.slice(-6)}` })
        .select('id')
        .single()
      if (createErr || !created) return NextResponse.json({ error: 'user create failed' }, { status: 500 })
      userId = created.id
    }

    const token = signUserToken({ userId, walletAddress, role: 'user' })
    return NextResponse.json({ token })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 })
  }
}

export const POST = withRateLimit({ check: async () => ({}) } as any, handler)


