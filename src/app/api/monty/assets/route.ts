import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    if (!supabaseAdmin) return NextResponse.json({ error: 'Database configuration error' }, { status: 500 })
    const { data, error } = await supabaseAdmin.from('monty_assets').select('key,url')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const assets: Record<string, string> = {}
    for (const row of data || []) {
      if (row?.key && row?.url) assets[row.key] = row.url
    }
    return NextResponse.json({ success: true, assets })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}


