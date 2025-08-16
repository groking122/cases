import { NextRequest, NextResponse } from 'next/server'
import { ImageUploadService } from '@/lib/imageUpload'

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Starting image upload...')
    
    // Get form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const folder = formData.get('folder') as string
    const isAdmin = formData.get('isAdmin') === 'true'

    console.log('🔧 Upload request:', { 
      hasFile: !!file, 
      folder, 
      isAdmin, 
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type 
    })

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!folder || !['cases', 'symbols', 'icons', 'profiles', 'uploads'].includes(folder)) {
      return NextResponse.json(
        { error: 'Invalid folder specified' },
        { status: 400 }
      )
    }

    // Upload the image
    let result
    if (isAdmin && ['cases', 'symbols', 'icons'].includes(folder)) {
      console.log('🔧 Attempting admin upload...')
      result = await ImageUploadService.uploadAdminImage(file, folder as 'cases' | 'symbols' | 'icons')
    } else if (!isAdmin && ['profiles', 'uploads'].includes(folder)) {
      console.log('🔧 Attempting user upload...')
      result = await ImageUploadService.uploadUserImage(file, folder as 'profiles' | 'uploads')
    } else {
      return NextResponse.json(
        { error: 'Invalid folder/permission combination' },
        { status: 400 }
      )
    }

    console.log('🔧 Upload result:', result)

    if (!result.success) {
      console.error('❌ Upload failed:', result.error)
      
      // As a fallback, try to save to public folder
      try {
        console.log('🔧 Attempting fallback upload to public folder...')
        const fallbackResult = await saveToPubicFolder(file, folder)
        if (fallbackResult.success) {
          console.log('✅ Fallback upload successful:', fallbackResult.url)
          return NextResponse.json({
            success: true,
            url: fallbackResult.url,
            path: fallbackResult.url,
            fallback: true
          })
        }
      } catch (fallbackError) {
        console.error('❌ Fallback upload also failed:', fallbackError)
      }
      
      return NextResponse.json(
        { error: result.error || 'Upload failed' },
        { status: 400 }
      )
    }

    console.log('✅ Upload successful:', result.publicUrl)

    return NextResponse.json({
      success: true,
      url: result.publicUrl,
      path: result.url
    })

  } catch (error: any) {
    console.error('❌ Image upload error:', error)
    return NextResponse.json(
      { error: `Upload failed: ${error.message}` },
      { status: 500 }
    )
  }
}

// Fallback function to save to public folder
async function saveToPubicFolder(file: File, folder: string): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const fs = await import('fs/promises')
    const path = await import('path')
    
    // Create directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', folder)
    await fs.mkdir(uploadDir, { recursive: true })
    
    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = path.join(uploadDir, fileName)
    
    // Save file
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    await fs.writeFile(filePath, buffer)
    
    // Return public URL
    const publicUrl = `/uploads/${folder}/${fileName}`
    return { success: true, url: publicUrl }
    
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Delete image endpoint
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const filePath = searchParams.get('path')

    if (!filePath) {
      return NextResponse.json(
        { error: 'File path required' },
        { status: 400 }
      )
    }

    const result = await ImageUploadService.deleteImage(filePath)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Image delete error:', error)
    return NextResponse.json(
      { error: 'Delete failed' },
      { status: 500 }
    )
  }
}