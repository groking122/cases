import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { withUserAuth } from '@/lib/mw/withUserAuth'

async function handler(request: any) {
  try {
    const userId = (request as any)?.user?.id
    const { sessionId, firstPick } = await request.json()
    if (!sessionId || typeof firstPick !== 'number') {
      return NextResponse.json({ error: 'bad_request' }, { status: 400 })
    }

    if (!supabaseAdmin) return NextResponse.json({ error: 'Database configuration error' }, { status: 500 })
    const { data: s, error } = await supabaseAdmin
      .from('monty_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()
    if (error || !s) return NextResponse.json({ error: 'not_found' }, { status: 404 })
    if (s.user_id !== userId) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    if (s.is_settled) return NextResponse.json({ error: 'session_settled' }, { status: 400 })
    if (firstPick < 0 || firstPick > 2) return NextResponse.json({ error: 'bad_pick' }, { status: 400 })

    const candidates = [0, 1, 2].filter((d) => d !== firstPick && d !== s.winning_door)
    const revealDoor = candidates[Math.floor(Math.random() * candidates.length)]

    const { error: e2 } = await supabaseAdmin
      .from('monty_sessions')
      .update({ first_pick: firstPick, reveal_door: revealDoor })
      .eq('id', sessionId)
    if (e2) return NextResponse.json({ error: e2.message }, { status: 500 })

    return NextResponse.json({ revealDoor })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'pick_failed' }, { status: 500 })
  }
}

export const POST = withUserAuth(handler as any)


