import { NextRequest, NextResponse } from 'next/server'
import { ImageUploadService } from '@/lib/imageUpload'

export async function POST(request: NextRequest) {
  try {
    // This endpoint helps initialize the storage bucket
    console.log('🔧 Setting up storage bucket...')
    
    const result = await ImageUploadService.createBucket()
    
    if (result.success) {
      console.log('✅ Storage bucket setup successful')
      return NextResponse.json({
        success: true,
        message: 'Storage bucket created successfully'
      })
    } else {
      console.error('❌ Storage bucket setup failed:', result.error)
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 400 })
    }
  } catch (error: any) {
    console.error('❌ Storage setup error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check storage bucket status
    console.log('🔧 Checking storage bucket status...')
    
    const { supabase, supabaseAdmin } = await import('@/lib/supabase')
    const client = supabaseAdmin || supabase
    
    if (!client) {
      return NextResponse.json({
        success: false,
        error: 'Supabase client not configured'
      }, { status: 500 })
    }
    
    // Try to list files to check if bucket exists
    const { data, error } = await client.storage
      .from('case-images')
      .list('', { limit: 1 })
    
    if (error) {
      return NextResponse.json({
        success: false,
        bucketExists: false,
        error: error.message
      })
    }
    
    return NextResponse.json({
      success: true,
      bucketExists: true,
      message: 'Storage bucket is working correctly'
    })
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
