import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { verifyAdminToken } from '@/lib/adminAuth'
import type { AdminApiResponse } from '@/types/admin'

// GET /api/admin/symbols/[id] - Get single symbol
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAdminToken(request)
    if (!authResult.success) {
      return NextResponse.json<AdminApiResponse>({
        success: false,
        error: authResult.error,
        timestamp: new Date().toISOString()
      }, { status: 401 })
    }

    const { id } = await params
    if (!supabase) {
      return NextResponse.json<AdminApiResponse>({
        success: false,
        error: 'Database configuration error',
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }
    const { data: symbol, error } = await supabase
      .from('symbols')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      throw error
    }

    if (!symbol) {
      return NextResponse.json<AdminApiResponse>({
        success: false,
        error: 'Symbol not found',
        timestamp: new Date().toISOString()
      }, { status: 404 })
    }

    // Map database fields to frontend interface
    const mappedSymbol = {
      id: symbol.id,
      name: symbol.name,
      description: symbol.description || '',
      imageUrl: symbol.image_url || '',
      rarity: symbol.rarity,
      value: symbol.value || 0,
      isActive: symbol.is_active,
      createdAt: symbol.created_at,
      updatedAt: symbol.updated_at,
      metadata: symbol.metadata || {}
    }

    return NextResponse.json<AdminApiResponse>({
      success: true,
      data: mappedSymbol,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Admin symbol GET error:', error)
    return NextResponse.json<AdminApiResponse>({
      success: false,
      error: 'Failed to fetch symbol',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// PATCH /api/admin/symbols/[id] - Update symbol
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAdminToken(request, ['manage_symbols'])
    if (!authResult.success) {
      return NextResponse.json<AdminApiResponse>({
        success: false,
        error: authResult.error,
        timestamp: new Date().toISOString()
      }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const updates: any = {}

    // Map frontend fields to database fields
    if (body.name !== undefined) updates.name = body.name
    if (body.description !== undefined) updates.description = body.description
    if (body.imageUrl !== undefined) updates.image_url = body.imageUrl  // Frontend sends imageUrl
    if (body.rarity !== undefined) updates.rarity = body.rarity
    if (body.value !== undefined) updates.value = body.value
    if (body.isActive !== undefined) updates.is_active = body.isActive  // Frontend sends isActive
    
    console.log('🔧 Symbol update - Received data:', body)
    console.log('🔧 Symbol update - Mapped updates:', updates)

    // Add tracking fields (only if columns exist)
    updates.updated_at = new Date().toISOString()

    if (!supabase) {
      return NextResponse.json<AdminApiResponse>({
        success: false,
        error: 'Database configuration error',
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }
    const { data: updatedSymbol, error } = await supabase
      .from('symbols')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw error
    }

    // Map database fields to frontend interface
    const mappedSymbol = {
      id: updatedSymbol.id,
      name: updatedSymbol.name,
      description: updatedSymbol.description || '',
      imageUrl: updatedSymbol.image_url || '',
      rarity: updatedSymbol.rarity,
      value: updatedSymbol.value || 0,
      isActive: updatedSymbol.is_active,
      createdAt: updatedSymbol.created_at,
      updatedAt: updatedSymbol.updated_at,
      metadata: updatedSymbol.metadata || {}
    }

    // Log admin action
    await logAdminAction({
      action: 'UPDATE_SYMBOL',
      adminId: authResult.user?.userId || 'unknown',
      adminEmail: authResult.user?.email || 'unknown',
      targetType: 'symbol',
      targetId: id,
      changes: { updates },
      request
    })

    return NextResponse.json<AdminApiResponse>({
      success: true,
      data: mappedSymbol,
      message: 'Symbol updated successfully',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Admin symbol PATCH error:', error)
    return NextResponse.json<AdminApiResponse>({
      success: false,
      error: 'Failed to update symbol',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// DELETE /api/admin/symbols/[id] - Delete symbol
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAdminToken(request, ['manage_symbols'])
    if (!authResult.success) {
      return NextResponse.json<AdminApiResponse>({
        success: false,
        error: authResult.error,
        timestamp: new Date().toISOString()
      }, { status: 401 })
    }

    const { id } = await params
    
    if (!supabase) {
      return NextResponse.json<AdminApiResponse>({
        success: false,
        error: 'Database configuration error',
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }

    // Check if symbol is being used in any cases
    const { data: caseSymbols, error: checkError } = await supabase
      .from('case_symbols')
      .select('case_id')
      .eq('symbol_id', id)

    if (checkError) {
      throw checkError
    }

    if (caseSymbols && caseSymbols.length > 0) {
      return NextResponse.json<AdminApiResponse>({
        success: false,
        error: `Cannot delete symbol - it's being used in ${caseSymbols.length} case(s)`,
        timestamp: new Date().toISOString()
      }, { status: 400 })
    }

    // Get symbol data before deletion for logging
    const { data: symbolData } = await supabase
      .from('symbols')
      .select('*')
      .eq('id', id)
      .single()

    // Delete the symbol
    const { error: deleteError } = await supabase
      .from('symbols')
      .delete()
      .eq('id', id)

    if (deleteError) {
      throw deleteError
    }

    // Log admin action
    await logAdminAction({
      action: 'DELETE_SYMBOL',
      adminId: authResult.user?.userId || 'unknown',
      adminEmail: authResult.user?.email || 'unknown',
      targetType: 'symbol',
      targetId: id,
      changes: { deletedSymbol: symbolData },
      request
    })

    return NextResponse.json<AdminApiResponse>({
      success: true,
      message: 'Symbol deleted successfully',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Admin symbol DELETE error:', error)
    return NextResponse.json<AdminApiResponse>({
      success: false,
      error: 'Failed to delete symbol',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// Helper function to log admin actions
async function logAdminAction(params: {
  action: string
  adminId: string
  adminEmail: string
  targetType: string
  targetId: string
  changes: Record<string, any>
  request: NextRequest
}) {
  try {
    const checksum = await generateChecksum(params)
    
    if (!supabase) {
      return
    }
    await supabase.from('admin_audit_logs').insert({
      action: params.action,
      admin_id: params.adminId,
      admin_email: params.adminEmail,
      target_type: params.targetType,
      target_id: params.targetId,
      changes: params.changes,
      ip_address: getClientIp(params.request),
      user_agent: params.request.headers.get('user-agent') || 'unknown',
      checksum,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Failed to log admin action:', error)
  }
}

async function generateChecksum(data: any): Promise<string> {
  const dataString = JSON.stringify(data, Object.keys(data).sort())
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(dataString)
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  if (realIp) {
    return realIp
  }
  
  return 'unknown'
}