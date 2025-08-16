import { supabase, supabaseAdmin } from './supabase'

export interface ImageUploadResult {
  success: boolean
  url?: string
  error?: string
  publicUrl?: string
}

export class ImageUploadService {
  private static readonly BUCKET_NAME = 'case-images'
  private static readonly MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
  private static readonly ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

  /**
   * Upload image for admin use (using service role)
   */
  static async uploadAdminImage(file: File, folder: 'cases' | 'symbols' | 'icons'): Promise<ImageUploadResult> {
    try {
      // Validate file
      const validation = this.validateFile(file)
      if (!validation.valid) {
        return { success: false, error: validation.error }
      }

      // Try to ensure bucket exists first
      await this.ensureBucketExists()

      const client = supabaseAdmin || supabase
      if (!client) {
        return { success: false, error: 'Supabase client not configured' }
      }

      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`

      console.log('🔧 Uploading image:', { fileName, fileSize: file.size, fileType: file.type })

      // Upload to Supabase Storage
      const { data, error } = await client.storage
        .from(this.BUCKET_NAME)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        console.error('❌ Upload error:', error)
        
        // If bucket doesn't exist, try to create it
        if (error.message.includes('not found') || error.message.includes('does not exist')) {
          console.log('🔧 Bucket not found, attempting to create...')
          const bucketResult = await this.createBucket()
          if (bucketResult.success) {
            // Retry upload after creating bucket
            const retryResult = await client.storage
              .from(this.BUCKET_NAME)
              .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false
              })
            
            if (retryResult.error) {
              return { success: false, error: retryResult.error.message }
            }
            
            const { data: publicUrlData } = client.storage
              .from(this.BUCKET_NAME)
              .getPublicUrl(fileName)

            return {
              success: true,
              url: retryResult.data.path,
              publicUrl: publicUrlData.publicUrl
            }
          }
        }
        
        return { success: false, error: error.message }
      }

      // Get public URL
      const { data: publicUrlData } = client.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(fileName)

      console.log('✅ Upload successful:', { path: data.path, publicUrl: publicUrlData.publicUrl })

      return {
        success: true,
        url: data.path,
        publicUrl: publicUrlData.publicUrl
      }

    } catch (error: any) {
      console.error('❌ Upload failed:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Upload image for authenticated users
   */
  static async uploadUserImage(file: File, folder: 'profiles' | 'uploads'): Promise<ImageUploadResult> {
    try {
      const validation = this.validateFile(file)
      if (!validation.valid) {
        return { success: false, error: validation.error }
      }

      if (!supabase) {
        return { success: false, error: 'Supabase client not configured' }
      }

      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }

      const fileExt = file.name.split('.').pop()
      const fileName = `${folder}/${user.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`

      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        return { success: false, error: error.message }
      }

      const { data: publicUrlData } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(fileName)

      return {
        success: true,
        url: data.path,
        publicUrl: publicUrlData.publicUrl
      }

    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Delete image
   */
  static async deleteImage(filePath: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!supabaseAdmin) {
        return { success: false, error: 'Admin client not configured' }
      }

      const { error } = await supabaseAdmin.storage
        .from(this.BUCKET_NAME)
        .remove([filePath])

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Get optimized image URL with transformations
   */
  static getOptimizedImageUrl(
    filePath: string, 
    options: {
      width?: number
      height?: number
      quality?: number
      format?: 'webp' | 'jpg' | 'png'
    } = {}
  ): string | null {
    if (!supabase) return null

    const { data } = supabase.storage
      .from(this.BUCKET_NAME)
      .getPublicUrl(filePath, {
        transform: {
          width: options.width,
          height: options.height,
          quality: options.quality || 80,
          format: options.format as any
        }
      })

    return data.publicUrl
  }

  /**
   * File validation
   */
  private static validateFile(file: File): { valid: boolean; error?: string } {
    if (!file) {
      return { valid: false, error: 'No file provided' }
    }

    if (file.size > this.MAX_FILE_SIZE) {
      return { valid: false, error: 'File size must be less than 5MB' }
    }

    if (!this.ALLOWED_TYPES.includes(file.type)) {
      return { valid: false, error: 'File type not supported. Use JPEG, PNG, WebP, or GIF' }
    }

    return { valid: true }
  }

  /**
   * Ensure bucket exists (create if not)
   */
  static async ensureBucketExists(): Promise<void> {
    try {
      const client = supabaseAdmin || supabase
      if (!client) return

      // Check if bucket exists by trying to list files
      const { error: listError } = await client.storage
        .from(this.BUCKET_NAME)
        .list('', { limit: 1 })

      if (listError && listError.message.includes('not found')) {
        console.log('🔧 Bucket does not exist, creating...')
        await this.createBucket()
      }
    } catch (error) {
      console.log('🔧 Could not check bucket existence:', error)
    }
  }

  /**
   * Create storage bucket (run once during setup)
   */
  static async createBucket(): Promise<{ success: boolean; error?: string }> {
    try {
      const client = supabaseAdmin || supabase
      if (!client) {
        return { success: false, error: 'Supabase client not configured' }
      }

      console.log('🔧 Creating storage bucket:', this.BUCKET_NAME)

      // Create bucket
      const { error: bucketError } = await client.storage
        .createBucket(this.BUCKET_NAME, {
          public: true,
          allowedMimeTypes: this.ALLOWED_TYPES,
          fileSizeLimit: this.MAX_FILE_SIZE
        })

      if (bucketError) {
        if (bucketError.message.includes('already exists')) {
          console.log('✅ Bucket already exists:', this.BUCKET_NAME)
          return { success: true }
        }
        console.error('❌ Failed to create bucket:', bucketError)
        return { success: false, error: bucketError.message }
      }

      console.log('✅ Bucket created successfully:', this.BUCKET_NAME)
      return { success: true }
    } catch (error: any) {
      console.error('❌ Create bucket failed:', error)
      return { success: false, error: error.message }
    }
  }
}

// Utility function for React components
export const useImageUpload = () => {
  const uploadImage = async (
    file: File, 
    folder: 'cases' | 'symbols' | 'icons' | 'profiles' | 'uploads',
    isAdmin = false
  ): Promise<ImageUploadResult> => {
    if (isAdmin && (folder === 'cases' || folder === 'symbols' || folder === 'icons')) {
      return ImageUploadService.uploadAdminImage(file, folder)
    } else if (!isAdmin && (folder === 'profiles' || folder === 'uploads')) {
      return ImageUploadService.uploadUserImage(file, folder)
    } else {
      return { success: false, error: 'Invalid folder or permission combination' }
    }
  }

  return { uploadImage }
}