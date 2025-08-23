import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { verifyAdminToken } from '@/lib/adminAuth'
import type { Symbol, AdminApiResponse, AdminListResponse } from '@/types/admin'

// GET /api/admin/symbols - List all symbols
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAdminToken(request)
    if (!authResult.success) {
      return NextResponse.json<AdminApiResponse>({
        success: false,
        error: authResult.error,
        timestamp: new Date().toISOString()
      }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search') || ''
    const rarity = searchParams.get('rarity')
    const status = searchParams.get('status') // 'active', 'inactive', or null

    if (!supabase) {
      return NextResponse.json<AdminApiResponse>({
        success: false,
        error: 'Database configuration error',
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }

    let query = supabase
      .from('symbols')
      .select('*')

    // Apply filters
    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    if (rarity) {
      query = query.eq('rarity', rarity)
    }

    if (status) {
      query = query.eq('is_active', status === 'active')
    }

    // Get total count
    const { count } = await supabase
      .from('symbols')
      .select('*', { count: 'exact', head: true })

    // Apply pagination and ordering
    const from = (page - 1) * limit
    const to = from + limit - 1
    
    const { data: symbols, error } = await query
      .range(from, to)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    // Map database fields to frontend interface
    const mappedSymbols = (symbols || []).map(symbol => ({
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
    }))

    return NextResponse.json<AdminListResponse<Symbol>>({
      success: true,
      data: {
        items: mappedSymbols,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Admin symbols GET error:', error)
    return NextResponse.json<AdminApiResponse>({
      success: false,
      error: 'Failed to fetch symbols',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// POST /api/admin/symbols - Create new symbol
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAdminToken(request, ['manage_symbols'])
    if (!authResult.success) {
      return NextResponse.json<AdminApiResponse>({
        success: false,
        error: authResult.error,
        timestamp: new Date().toISOString()
      }, { status: 401 })
    }

    // Allow symbol creation only on localhost unless explicitly enabled via env
    try {
      const host = (request as any)?.nextUrl?.hostname || (request.headers.get('host') || '').split(':')[0]
      const isLocal = host === 'localhost' || host === '127.0.0.1'
      const allowEnv = process.env.ALLOW_SYMBOL_CREATION === 'true'
      if (!isLocal && !allowEnv) {
        return NextResponse.json<AdminApiResponse>({
          success: false,
          error: 'Symbol creation disabled outside localhost. Set ALLOW_SYMBOL_CREATION=true to enable.',
          timestamp: new Date().toISOString()
        }, { status: 403 })
      }
    } catch {}

    const body = await request.json()
    const { name, description, imageUrl, rarity, value, isActive } = body

    // Validate required fields
    if (!name || !imageUrl || !rarity || value === undefined) {
      return NextResponse.json<AdminApiResponse>({
        success: false,
        error: 'Missing required fields: name, imageUrl, rarity, value',
        timestamp: new Date().toISOString()
      }, { status: 400 })
    }

    // Normalize and validate rarity (DB has a check constraint)
    const validRarities = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'] as const
    const rarityAliases: Record<string, typeof validRarities[number]> = {
      mythical: 'mythic',
      legend: 'legendary',
      legendary: 'legendary',
      common: 'common',
      uncommon: 'uncommon',
      rare: 'rare',
      epic: 'epic',
      mythic: 'mythic'
    }
    const normalizedRarity = rarityAliases[String(rarity || '').toLowerCase().trim()]
    if (!normalizedRarity) {
      return NextResponse.json<AdminApiResponse>({
        success: false,
        error: `Invalid rarity. Must be one of: ${validRarities.join(', ')}`,
        timestamp: new Date().toISOString()
      }, { status: 400 })
    }

    if (!supabase) {
      return NextResponse.json<AdminApiResponse>({
        success: false,
        error: 'Database configuration error',
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }

    // Create symbol
    console.log('🔧 Creating symbol with data:', {
      name,
      description: description || '',
      image_url: imageUrl,
      rarity,
      value: parseFloat(value),
      is_active: isActive !== false,
      authUser: authResult.user
    })

    const safeKey = String(name).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
    const symbolData: any = {
      name,
      symbol: safeKey, // DB requires non-null symbol column
      description: description || '',
      image_url: imageUrl,
      rarity: normalizedRarity,
      value: parseFloat(value),
      is_active: isActive !== false,
      metadata: {
        key: safeKey,
        createdVia: 'admin_dashboard',
        createdBy: authResult.user?.email || 'unknown'
      }
    }

    // Note: We no longer set created_by because the symbols table doesn't have this column

    const { data: newSymbol, error } = await supabase
      .from('symbols')
      .insert(symbolData)
      .select()
      .single()

    if (error) {
      return NextResponse.json<AdminApiResponse>({
        success: false,
        error: `Insert failed: ${error.message}`,
        timestamp: new Date().toISOString()
      }, { status: 400 })
    }

    // Log admin action
    await logAdminAction({
      action: 'CREATE_SYMBOL',
      adminId: authResult.user?.userId || 'unknown',
      adminEmail: authResult.user?.email || 'unknown',
      targetType: 'symbol',
      targetId: newSymbol.id,
      changes: { symbol: body },
      request
    })

    return NextResponse.json<AdminApiResponse>({
      success: true,
      data: { symbolId: newSymbol.id },
      message: 'Symbol created successfully',
      timestamp: new Date().toISOString()
    }, { status: 201 })

  } catch (error: any) {
    console.error('Admin symbols POST error:', error)
    return NextResponse.json<AdminApiResponse>({
      success: false,
      error: error?.message || 'Failed to create symbol',
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