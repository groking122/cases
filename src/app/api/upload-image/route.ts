import { NextRequest, NextResponse } from 'next/server'
import { ImageUploadService } from '@/lib/imageUpload'

export async function POST(request: NextRequest) {
  try {
    // Get form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const folder = formData.get('folder') as string
    const isAdmin = formData.get('isAdmin') === 'true'

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
      result = await ImageUploadService.uploadAdminImage(file, folder as 'cases' | 'symbols' | 'icons')
    } else if (!isAdmin && ['profiles', 'uploads'].includes(folder)) {
      result = await ImageUploadService.uploadUserImage(file, folder as 'profiles' | 'uploads')
    } else {
      return NextResponse.json(
        { error: 'Invalid folder/permission combination' },
        { status: 400 }
      )
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      url: result.publicUrl,
      path: result.url
    })

  } catch (error: any) {
    console.error('Image upload error:', error)
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    )
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