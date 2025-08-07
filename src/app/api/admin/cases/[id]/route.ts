import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { verifyAdminToken } from '@/lib/adminAuth'
import type { AdminApiResponse, CaseFormData } from '@/types/admin'

// Helper function to validate probabilities
function validateProbabilities(symbols: Array<{ symbolId: string; weight: number }>): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!symbols || symbols.length === 0) {
    return { isValid: true, errors: [] } // Allow empty symbols for now
  }

  const totalWeight = symbols.reduce((sum, symbol) => sum + symbol.weight, 0)
  
  if (Math.abs(totalWeight - 100) > 0.01) {
    errors.push(`Total probability weights must equal 100%, got ${totalWeight.toFixed(2)}%`)
  }

  symbols.forEach((symbol, index) => {
    if (symbol.weight < 0 || symbol.weight > 100) {
      errors.push(`Symbol ${index + 1} weight must be between 0% and 100%`)
    }
  })

  return { isValid: errors.length === 0, errors }
}

function calculateExpectedValue(symbols: Array<{ symbolId: string; weight: number }>): number {
  // This would need actual symbol values from the database
  // For now, return a placeholder
  return symbols.reduce((sum, symbol) => sum + (symbol.weight * 10), 0) / 100
}

// PATCH /api/admin/cases/[id] - Update existing case
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('🔧 PATCH /api/admin/cases/[id] called')
    
    const authResult = await verifyAdminToken(request, ['manage_cases'])
    if (!authResult.success) {
      return NextResponse.json<AdminApiResponse>({
        success: false,
        error: authResult.error,
        timestamp: new Date().toISOString()
      }, { status: 401 })
    }

    const { id: caseId } = await params
    console.log('🔧 Case ID received:', caseId)
    
    if (!caseId) {
      return NextResponse.json<AdminApiResponse>({
        success: false,
        error: 'Case ID is required',
        timestamp: new Date().toISOString()
      }, { status: 400 })
    }

    // Debug: Check if case exists before attempting update (no .single())
    const { data: existingCaseCheck, error: checkError } = await supabase
      .from('cases')
      .select('id, name')
      .eq('id', caseId)
    
    console.log('🔍 Existing case check:', { existingCaseCheck, checkError })
    
    if (checkError || !existingCaseCheck || existingCaseCheck.length === 0) {
      console.error('❌ Case not found during pre-check:', caseId)
      return NextResponse.json<AdminApiResponse>({
        success: false,
        error: `Case with ID ${caseId} not found in database`,
        timestamp: new Date().toISOString()
      }, { status: 404 })
    }

    const body: CaseFormData = await request.json()
    const { name, description, price, imageUrl, isActive, symbols } = body
    console.log('🔧 Update data:', { name, description, price, imageUrl, isActive, symbolsCount: symbols?.length || 0 })

    // Validate required fields (allow empty imageUrl for now)
    if (!name || !description || price <= 0) {
      return NextResponse.json<AdminApiResponse>({
        success: false,
        error: 'Missing required fields or invalid price',
        timestamp: new Date().toISOString()
      }, { status: 400 })
    }

    // Validate probability weights (only if symbols are provided)
    if (symbols && symbols.length > 0) {
      const probabilityValidation = validateProbabilities(symbols)
      if (!probabilityValidation.isValid) {
        return NextResponse.json<AdminApiResponse>({
          success: false,
          error: `Probability validation failed: ${probabilityValidation.errors.join(', ')}`,
          timestamp: new Date().toISOString()
        }, { status: 400 })
      }
    }

    // Build update object with only available fields
    const updateData: any = {
      name,
      description,
      price,
      image_url: imageUrl || null
    }
    
    // Only add optional fields if they exist in the database
    if (isActive !== undefined) updateData.is_active = isActive
    
    console.log('🔧 Case update - Received data:', { name, description, price, imageUrl, isActive })
    console.log('🔧 Case update - Update data:', updateData)

    // Update case
    console.log('🔧 About to update case with data:', updateData)
    const { data: updatedCase, error: caseError } = await supabase
      .from('cases')
      .update(updateData)
      .eq('id', caseId)
      .select()
    
    console.log('🔧 Update result - data:', updatedCase)
    console.log('🔧 Update result - error:', caseError)
    
    if (caseError) {
      console.error('❌ Case update error:', caseError)
      return NextResponse.json<AdminApiResponse>({
        success: false,
        error: `Database error: ${caseError.message}`,
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }

    // Handle both single object and array responses
    let finalCase;
    if (Array.isArray(updatedCase)) {
      if (updatedCase.length === 1) {
        finalCase = updatedCase[0];
        console.log('✅ Got array with single result, using first item')
      } else {
        console.error(`❌ Got array with ${updatedCase.length} results, expected 1`)
        return NextResponse.json<AdminApiResponse>({
          success: false,
          error: 'Update affected unexpected number of rows',
          timestamp: new Date().toISOString()
        }, { status: 500 })
      }
    } else {
      finalCase = updatedCase;
    }

    if (!finalCase) {
      console.error('❌ Case not found for ID:', caseId)
      return NextResponse.json<AdminApiResponse>({
        success: false,
        error: 'Case not found',
        timestamp: new Date().toISOString()
      }, { status: 404 })
    }

    // Delete existing case-symbol relationships
    const { error: deleteError } = await supabase
      .from('case_symbols')
      .delete()
      .eq('case_id', caseId)

    if (deleteError) {
      console.error('❌ Case symbols delete error:', deleteError)
      // Don't fail on this error, just log it
    }

    // Insert new case-symbol relationships (only if symbols provided)
    console.log('🔧 Processing symbols update:', { symbolsProvided: !!symbols, symbolsLength: symbols?.length || 0 })
    if (symbols && symbols.length > 0) {
      const caseSymbolData = symbols.map(symbol => ({
        case_id: caseId,
        symbol_id: symbol.symbolId,
        weight: symbol.weight
      }))
      
      console.log('🔧 Inserting case symbols:', caseSymbolData)

      const { error: symbolsError } = await supabase
        .from('case_symbols')
        .insert(caseSymbolData)

      if (symbolsError) {
        console.error('❌ Case symbols insert error:', symbolsError)
        // Don't fail the whole update for this
      } else {
        console.log('✅ Case symbols inserted successfully')
      }
    } else {
      console.log('⚠️ No symbols provided in update - case_symbols table cleared but not repopulated')
    }

    // Log admin action (placeholder - implement if needed)
    console.log('✅ Admin action: UPDATE_CASE', { caseId, user: authResult.user.email })

    // Map the response to match frontend expectations
    const mappedCase = {
      id: finalCase.id,
      name: finalCase.name,
      description: finalCase.description,
      price: finalCase.price,
      imageUrl: finalCase.image_url || '',
      isActive: finalCase.is_active,
      createdAt: finalCase.created_at,
      updatedAt: finalCase.updated_at,
      symbols: symbols || [], // Include the symbols that were passed
      metadata: finalCase.metadata || {}
    }

    console.log('✅ Case updated successfully:', mappedCase.name)

    return NextResponse.json<AdminApiResponse>({
      success: true,
      data: { case: mappedCase },
      message: 'Case updated successfully',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Admin case PATCH error:', error)
    return NextResponse.json<AdminApiResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update case',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// DELETE /api/admin/cases/[id] - Delete case
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAdminToken(request, ['manage_cases'])
    if (!authResult.success) {
      return NextResponse.json<AdminApiResponse>({
        success: false,
        error: authResult.error,
        timestamp: new Date().toISOString()
      }, { status: 401 })
    }

    const { id: caseId } = await params

    // Delete case (cascade will handle case_symbols)
    const { error } = await supabase
      .from('cases')
      .delete()
      .eq('id', caseId)

    if (error) {
      throw error
    }

    // Log admin action (placeholder - implement if needed)
    console.log('Admin action: DELETE_CASE', { caseId, user: authResult.user.email })

    return NextResponse.json<AdminApiResponse>({
      success: true,
      message: 'Case deleted successfully',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Admin case DELETE error:', error)
    return NextResponse.json<AdminApiResponse>({
      success: false,
      error: 'Failed to delete case',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}