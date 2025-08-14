import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { verifyAdminToken } from '@/lib/adminAuth'
import type { 
  CaseConfig, 
  CaseFormData, 
  AdminApiResponse, 
  AdminListResponse,
  ProbabilityValidationResult 
} from '@/types/admin'

// GET /api/admin/cases - List all cases with pagination
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
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') // 'active', 'inactive', or null for all

    if (!supabase) {
      return NextResponse.json<AdminApiResponse>({
        success: false,
        error: 'Database configuration error',
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }

    let query = supabase
      .from('cases')
      .select(`
        *,
        case_symbols (
          weight,
          symbols (*)
        )
      `)

    // Apply filters
    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    if (status) {
      query = query.eq('is_active', status === 'active')
    }

    // Get total count for pagination
    const { count } = await supabase
      .from('cases')
      .select('*', { count: 'exact', head: true })

    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    
    const { data: cases, error } = await query
      .range(from, to)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    // Transform data to match CaseConfig interface
    const transformedCases: CaseConfig[] = cases?.map(caseData => ({
      id: caseData.id,
      name: caseData.name,
      description: caseData.description,
      price: caseData.price,
      imageUrl: caseData.image_url,
      isActive: caseData.is_active,
      createdAt: caseData.created_at,
      updatedAt: caseData.updated_at,
      symbols: caseData.case_symbols?.map((cs: any) => ({
        symbolId: cs.symbols.id,
        weight: cs.weight,
        symbol: {
          id: cs.symbols.id,
          name: cs.symbols.name,
          description: cs.symbols.description,
          imageUrl: cs.symbols.image_url,
          rarity: cs.symbols.rarity,
          value: cs.symbols.value,
          isActive: cs.symbols.is_active,
          createdAt: cs.symbols.created_at,
          updatedAt: cs.symbols.updated_at,
          metadata: cs.symbols.metadata
        }
      })) || [],
      metadata: caseData.metadata || {
        totalOpenings: 0,
        averageValue: 0,
        lastModified: caseData.updated_at,
        modifiedBy: 'system'
      }
    })) || []

    return NextResponse.json<AdminListResponse<CaseConfig>>({
      success: true,
      data: {
        items: transformedCases,
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
    console.error('Admin cases GET error:', error)
    return NextResponse.json<AdminApiResponse>({
      success: false,
      error: 'Failed to fetch cases',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// POST /api/admin/cases - Create new case
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAdminToken(request, ['manage_cases'])
    if (!authResult.success) {
      return NextResponse.json<AdminApiResponse>({
        success: false,
        error: authResult.error,
        timestamp: new Date().toISOString()
      }, { status: 401 })
    }

    const body: CaseFormData = await request.json()
    const { name, description, price, imageUrl, isActive, symbols } = body

    // Validate required fields
    if (!name || !description || price <= 0 || !imageUrl) {
      return NextResponse.json<AdminApiResponse>({
        success: false,
        error: 'Missing required fields or invalid price',
        timestamp: new Date().toISOString()
      }, { status: 400 })
    }

    // Validate probability weights
    const probabilityValidation = validateProbabilities(symbols)
    if (!probabilityValidation.isValid) {
      return NextResponse.json<AdminApiResponse>({
        success: false,
        error: `Probability validation failed: ${probabilityValidation.errors.join(', ')}`,
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

    // Create case in transaction
    const expectedValue = await calculateExpectedValue(symbols)

    const { data: newCase, error: caseError } = await supabase
      .from('cases')
      .insert({
        name,
        description,
        price,
        image_url: imageUrl,
        is_active: isActive,
        metadata: {
          totalOpenings: 0,
          averageValue: expectedValue,
          lastModified: new Date().toISOString(),
          modifiedBy: authResult.user?.email || 'unknown'
        }
      })
      .select()
      .single()

    if (caseError) {
      throw caseError
    }

    // Insert case-symbol relationships
    const caseSymbolData = symbols.map(symbol => ({
      case_id: newCase.id,
      symbol_id: symbol.symbolId,
      weight: symbol.weight
    }))

    const { error: symbolsError } = await supabase
      .from('case_symbols')
      .insert(caseSymbolData)

    if (symbolsError) {
      // Rollback case creation
      await supabase.from('cases').delete().eq('id', newCase.id)
      throw symbolsError
    }

    // Log admin action
    await logAdminAction({
      action: 'CREATE_CASE',
      adminId: authResult.user?.userId || 'unknown',
      adminEmail: authResult.user?.email || 'unknown',
      targetType: 'case',
      targetId: newCase.id,
      changes: { case: body },
      request
    })

    return NextResponse.json<AdminApiResponse>({
      success: true,
      data: { caseId: newCase.id },
      message: 'Case created successfully',
      timestamp: new Date().toISOString()
    }, { status: 201 })

  } catch (error) {
    console.error('Admin cases POST error:', error)
    return NextResponse.json<AdminApiResponse>({
      success: false,
      error: 'Failed to create case',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// PATCH method moved to /api/admin/cases/[id]/route.ts for proper RESTful structure

// Helper Functions
function validateProbabilities(symbols: Array<{ symbolId: string; weight: number }>): ProbabilityValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!symbols || symbols.length === 0) {
    errors.push('At least one symbol is required')
    return { isValid: false, totalWeight: 0, errors, warnings, distribution: [] }
  }

  // Calculate total weight
  const totalWeight = symbols.reduce((sum, symbol) => sum + symbol.weight, 0)

  // Check if weights sum to 100 (allow small floating point errors)
  if (Math.abs(totalWeight - 100) > 0.01) {
    errors.push(`Total probability must equal 100%, currently ${totalWeight.toFixed(2)}%`)
  }

  // Check for invalid weights
  symbols.forEach(symbol => {
    if (symbol.weight < 0) {
      errors.push(`Symbol ${symbol.symbolId} has negative weight`)
    }
    if (symbol.weight > 100) {
      errors.push(`Symbol ${symbol.symbolId} weight exceeds 100%`)
    }
    if (symbol.weight === 0) {
      warnings.push(`Symbol ${symbol.symbolId} has 0% drop rate`)
    }
  })

  // Check for duplicate symbols
  const symbolIds = symbols.map(s => s.symbolId)
  const duplicates = symbolIds.filter((id, index) => symbolIds.indexOf(id) !== index)
  if (duplicates.length > 0) {
    errors.push(`Duplicate symbols found: ${duplicates.join(', ')}`)
  }

  return {
    isValid: errors.length === 0,
    totalWeight,
    errors,
    warnings,
    distribution: [] // Could calculate rarity distribution here
  }
}

async function calculateExpectedValue(symbols: Array<{ symbolId: string; weight: number }>): Promise<number> {
  // Get symbol values from database
  const symbolIds = symbols.map(s => s.symbolId)
  if (!supabase) {
    return 0
  }
  const { data: symbolData } = await supabase
    .from('symbols')
    .select('id, value')
    .in('id', symbolIds)

  if (!symbolData) return 0

  // Calculate weighted average value
  let expectedValue = 0
  symbols.forEach(symbol => {
    const symbolInfo = symbolData.find(s => s.id === symbol.symbolId)
    if (symbolInfo) {
      expectedValue += (symbol.weight / 100) * symbolInfo.value
    }
  })

  return Math.round(expectedValue * 100) / 100 // Round to 2 decimal places
}

async function logAdminAction(params: {
  action: string
  adminId: string
  adminEmail: string
  targetType: string
  targetId: string
  changes: Record<string, any>
  request: NextRequest
}) {
  // Implementation similar to auth route
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