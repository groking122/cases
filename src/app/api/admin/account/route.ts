import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyAdminToken } from '@/lib/adminAuth'

export async function PATCH(request: NextRequest) {
  try {
    // Identity updates are disabled from the dashboard for security.
    return NextResponse.json({ success: false, error: 'Admin identity updates are disabled in the dashboard' }, { status: 403 })
  } catch (e) {
    console.error('Update account error', e)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}


