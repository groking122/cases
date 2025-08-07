import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Test endpoint to verify Supabase connection
export async function GET() {
  try {
    console.log('🔍 Testing Supabase connection...')
    
    // Check if supabase client exists
    if (!supabase) {
      console.error('❌ Supabase client is null - check environment variables')
      return NextResponse.json({ 
        connected: false, 
        error: 'Supabase client not initialized - missing environment variables',
        envCheck: {
          NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY
        }
      })
    }

    // Try a simple query to test connection
    const { data, error } = await supabase
      .from('symbols')
      .select('count', { count: 'exact', head: true })

    if (error) {
      console.error('❌ Supabase query failed:', error)
      return NextResponse.json({ 
        connected: false, 
        error: error.message,
        details: error
      })
    }

    console.log('✅ Supabase connection successful')
    return NextResponse.json({ 
      connected: true, 
      symbolCount: data || 0,
      message: 'Database connection working'
    })

  } catch (error) {
    console.error('❌ Connection test failed:', error)
    return NextResponse.json({ 
      connected: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}