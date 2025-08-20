import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getBearerToken, verifyUserToken } from '@/lib/userAuth'

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) return NextResponse.json({ error: 'DB not configured' }, { status: 500 })

    const token = getBearerToken(request.headers.get('authorization'))
    const payload = token ? verifyUserToken(token) : null
    if (!payload) return NextResponse.json({ error: 'Missing or invalid token' }, { status: 401 })
    const userId = payload.userId

    const { delta, reason, idempotencyKey } = await request.json()
    if (!Number.isFinite(delta) || !Number.isInteger(delta)) {
      return NextResponse.json({ error: 'delta must be integer' }, { status: 400 })
    }
    if (idempotencyKey && typeof idempotencyKey !== 'string') {
      return NextResponse.json({ error: 'idempotencyKey must be string' }, { status: 400 })
    }

    // Create balance row if missing
    const { error: upsertErr } = await supabaseAdmin
      .from('balances')
      .upsert({ user_id: userId, amount: 0 })
    if (upsertErr && upsertErr.code !== '23505') { // ignore unique violation
      return NextResponse.json({ error: 'Failed to init balance' }, { status: 500 })
    }

    // Optional idempotency enforcement
    if (idempotencyKey) {
      const { error: idemErr } = await supabaseAdmin
        .from('credit_events')
        .insert({ user_id: userId, delta, reason: (reason || '').slice(0, 128), key: idempotencyKey })
      if (idemErr) {
        // If duplicate key, treat as success and return current balance
        if ((idemErr as any).code === '23505') {
          const { data: bal } = await supabaseAdmin.from('balances').select('amount').eq('user_id', userId).single()
          return NextResponse.json({ balance: bal?.amount ?? 0 })
        }
        return NextResponse.json({ error: 'Failed to record event' }, { status: 500 })
      }
    }

    // Atomic guarded update to prevent negatives
    const { data: result, error: updateErr } = await supabaseAdmin.rpc('apply_credit_delta_guarded', {
      p_user_id: userId,
      p_delta: delta
    })
    if (updateErr) {
      if (String(updateErr.message || '').toLowerCase().includes('insufficient')) {
        return NextResponse.json({ error: 'Insufficient funds' }, { status: 400 })
      }
      return NextResponse.json({ error: 'Failed to update balance' }, { status: 500 })
    }

    return NextResponse.json({ balance: result?.new_amount ?? result?.amount ?? 0 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 })
  }
}


