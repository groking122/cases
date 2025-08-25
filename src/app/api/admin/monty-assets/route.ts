import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/adminAuth'
import { supabaseAdmin } from '@/lib/supabase'

export const GET = withAdminAuth(async () => {
  if (!supabaseAdmin) {
    return NextResponse.json({ success: false, error: 'Database configuration error' }, { status: 500 })
  }
  const { data, error } = await supabaseAdmin.from('monty_assets').select('*').order('key')
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
})

export const POST = withAdminAuth(async (request: NextRequest) => {
  if (!supabaseAdmin) {
    return NextResponse.json({ success: false, error: 'Database configuration error' }, { status: 500 })
  }
  const body = await request.json().catch(() => ({}))
  const items = Array.isArray(body?.items) ? body.items : []
  if (!items.length) return NextResponse.json({ success: false, error: 'no_items' }, { status: 400 })
  const upserts = items.map((it: any) => ({ key: String(it.key), url: String(it.url) }))
  const { error } = await supabaseAdmin.from('monty_assets').upsert(upserts, { onConflict: 'key' })
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
})


