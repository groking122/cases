import { NextResponse } from 'next/server'
import { randInt, newServerSeed, sha256 } from '@/lib/rng'
import { MONTY } from '@/config/games'
import { supabaseAdmin } from '@/lib/supabase'
import { withUserAuth } from '@/lib/mw/withUserAuth'
import { applyCredit } from '@/lib/credits/applyCredit'

async function handler(request: any) {
  try {
    const userId = (request as any)?.user?.id
    if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    // Debit cost (idempotency can be keyed by session once created)
    await applyCredit(userId, -BigInt(MONTY.cost), 'bet:monty', undefined)

    const winningDoor = randInt(0, MONTY.doors - 1)
    const serverSeed = newServerSeed()
    const serverSeedHash = sha256(serverSeed)

    const { data, error } = await supabaseAdmin
      .from('monty_sessions')
      .insert({
        user_id: userId,
        winning_door: winningDoor,
        server_seed: serverSeed,
        server_seed_hash: serverSeedHash,
      })
      .select('id')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ sessionId: data!.id, doors: MONTY.doors, serverSeedHash })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'start_failed' }, { status: 500 })
  }
}

export const POST = withUserAuth(handler as any)


