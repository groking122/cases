import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyAdminToken } from '@/lib/adminAuth'

export async function PATCH(request: NextRequest) {
  try {
    const auth = await verifyAdminToken(request)
    if (!auth.success || !auth.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { email, password, mfaEnabled } = body || {}

    if (!supabaseAdmin) return NextResponse.json({ success: false, error: 'DB not configured' }, { status: 500 })

    const updates: any = {}
    if (email) updates.email = String(email).toLowerCase()
    if (typeof mfaEnabled === 'boolean') updates.mfa_enabled = mfaEnabled
    if (password) updates.password_hash = await bcrypt.hash(String(password), 12)

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: false, error: 'No changes provided' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('admin_users')
      .update(updates)
      .eq('id', auth.user.userId)

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Update account error', e)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}


