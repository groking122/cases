import { NextResponse } from 'next/server'
import { withUserAuth } from '@/lib/mw/withUserAuth'
import { supabaseAdmin } from '@/lib/supabase'

async function handler(request: any) {
  try {
    const userId = (request as any)?.user?.id
    if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    if (!supabaseAdmin) return NextResponse.json({ error: 'Database configuration error' }, { status: 500 })

    const { data: s, error } = await supabaseAdmin
      .from('monty_sessions')
      .select('id, first_pick, reveal_door, is_settled, winning_door, server_seed, server_seed_hash, payout')
      .eq('user_id', userId)
      .eq('is_settled', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!s) return NextResponse.json({ session: null })

    return NextResponse.json({ session: s })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'active_failed' }, { status: 500 })
  }
}

export const GET = withUserAuth(handler as any)


