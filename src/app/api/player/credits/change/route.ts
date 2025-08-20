import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getBearerToken, verifyUserToken } from '@/lib/userAuth'
import { userRateLimiter } from '@/lib/rate-limit.js'

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) return NextResponse.json({ error: 'DB not configured' }, { status: 500 })

    const token = getBearerToken(request.headers.get('authorization'))
    const payload = token ? verifyUserToken(token) : null
    if (!payload) return NextResponse.json({ error: 'Missing or invalid token' }, { status: 401 })
    const userId = payload.userId

    // Rate-limit credit changes per user
    try {
      await userRateLimiter.checkUser(userId, 'credit_change')
    } catch (e: any) {
      return NextResponse.json({ error: e?.message || 'Rate limit exceeded' }, { status: 429 })
    }

    const { delta, reason, idempotencyKey } = await request.json()
    if (!Number.isFinite(delta) || !Number.isInteger(delta)) {
      return NextResponse.json({ error: 'delta must be integer' }, { status: 400 })
    }
    if (idempotencyKey && typeof idempotencyKey !== 'string') {
      return NextResponse.json({ error: 'idempotencyKey must be string' }, { status: 400 })
    }

    // Single syscall: atomic, idempotent, audited
    const { data, error } = await supabaseAdmin.rpc('credit_apply_and_log', {
      p_user_id: userId,
      p_delta: delta,
      p_reason: (reason || '').slice(0, 128),
      p_key: idempotencyKey || null
    })
    if (error) {
      if (String(error.message || '').toLowerCase().includes('insufficient')) {
        return NextResponse.json({ error: 'Insufficient funds' }, { status: 400 })
      }
      return NextResponse.json({ error: 'Failed to update balance' }, { status: 500 })
    }

    // data is BIGINT; return as number fallback
    const balance = (data as any) ?? 0
    return NextResponse.json({ balance })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 })
  }
}


