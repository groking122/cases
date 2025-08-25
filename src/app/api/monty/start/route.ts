import { NextResponse } from 'next/server'
import { randInt, newServerSeed, sha256 } from '@/lib/rng'
import { randomUUID } from 'crypto'
// Defaults in case DB settings are unavailable
const DEFAULT_DOORS = 3
import { supabaseAdmin } from '@/lib/supabase'
import { withUserAuth } from '@/lib/mw/withUserAuth'
import { applyCredit } from '@/lib/credits/applyCredit'

async function handler(request: any) {
  try {
    const userId = (request as any)?.user?.id
    if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    // Load settings (fallback to defaults)
    const DEFAULT_COST = 100
    let cost = DEFAULT_COST
    try {
      if (supabaseAdmin) {
        const { data } = await supabaseAdmin.from('monty_settings').select('cost').limit(1).maybeSingle()
        if (data && typeof data.cost === 'number' && data.cost > 0) cost = data.cost
      }
    } catch {}

    const idemKey = request.headers?.get?.('idempotency-key') || randomUUID()

    const winningDoor = randInt(0, DEFAULT_DOORS - 1)
    const serverSeed = newServerSeed()
    const serverSeedHash = sha256(serverSeed)

    if (!supabaseAdmin) return NextResponse.json({ error: 'Database configuration error' }, { status: 500 })
    const { data: startData, error: startErr } = await supabaseAdmin.rpc('monty_start_atomic', {
      p_user_id: userId,
      p_cost: cost,
      p_winning_door: winningDoor,
      p_server_seed: serverSeed,
      p_server_seed_hash: serverSeedHash,
      p_idem_key: idemKey,
    })
    if (startErr) return NextResponse.json({ error: startErr.message }, { status: 500 })
    const sessionId = startData as unknown as string

    return NextResponse.json({ sessionId, doors: DEFAULT_DOORS, serverSeedHash })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'start_failed' }, { status: 500 })
  }
}

export const POST = withUserAuth(handler as any)


