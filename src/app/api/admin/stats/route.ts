import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { verifyAdminToken } from '@/lib/adminAuth'
import type { AdminDashboardStats, AdminApiResponse } from '@/types/admin'

// GET /api/admin/stats - Get admin dashboard statistics
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAdminToken(request, ['view_analytics'])
    if (!authResult.success) {
      return NextResponse.json<AdminApiResponse>({
        success: false,
        error: authResult.error,
        timestamp: new Date().toISOString()
      }, { status: 401 })
    }

    // Get basic counts from tables
    const { count: totalCases } = await supabase
      .from('cases')
      .select('*', { count: 'exact', head: true })

    const { count: activeCases } = await supabase
      .from('cases')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)

    const { count: totalSymbols } = await supabase
      .from('symbols')
      .select('*', { count: 'exact', head: true })

    // Get today's date for filtering
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayISO = today.toISOString()

    // Try to get case openings data (if table exists)
    let todayOpenings = 0
    let totalRevenue = 0
    
    try {
      const { count: todayCount } = await supabase
        .from('case_openings')
        .select('*', { count: 'exact', head: true })
        .gte('opened_at', todayISO)

      todayOpenings = todayCount || 0
    } catch (error) {
      console.log('case_openings table not available, using default values')
    }

    // Get top performing case
    let topPerformingCase = {
      id: null,
      name: 'No data',
      openings: 0
    }

    try {
      const { data: topCase } = await supabase
        .from('cases')
        .select('id, name')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (topCase) {
        topPerformingCase = {
          id: topCase.id,
          name: topCase.name,
          openings: 0 // We don't have opening counts yet
        }
      }
    } catch (error) {
      console.log('Could not get top performing case')
    }

    const stats: AdminDashboardStats = {
      totalCases: totalCases || 0,
      activeCases: activeCases || 0,
      totalSymbols: totalSymbols || 0,
      todayOpenings: todayOpenings,
      totalRevenue: totalRevenue,
      averageSessionTime: 0, // Not implemented yet
      topPerformingCase: topPerformingCase,
      recentActivity: [] // Not implemented yet
    }

    return NextResponse.json<AdminApiResponse<AdminDashboardStats>>({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Admin stats error:', error)
    return NextResponse.json<AdminApiResponse>({
      success: false,
      error: 'Failed to fetch statistics',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}