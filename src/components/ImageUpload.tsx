'use client'

import React, { useState, useRef } from 'react'
import { motion } from 'framer-motion'

interface ImageUploadProps {
  onUpload: (url: string) => void
  folder: 'cases' | 'symbols' | 'icons' | 'profiles' | 'uploads'
  isAdmin?: boolean
  currentImage?: string
  className?: string
  accept?: string
  maxSize?: number
  buttonText?: string
  showPreview?: boolean
}

export function ImageUpload({
  onUpload,
  folder,
  isAdmin = false,
  currentImage,
  className = '',
  accept = 'image/*',
  maxSize = 5 * 1024 * 1024, // 5MB
  buttonText = 'Upload Image',
  showPreview = true
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [preview, setPreview] = useState<string | null>(currentImage || null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file size
    if (file.size > maxSize) {
      setError(`File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`)
      return
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file')
      return
    }

    setError(null)
    setUploading(true)
    setProgress(0)

    try {
      // Create preview
      const previewUrl = URL.createObjectURL(file)
      setPreview(previewUrl)

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + 10
        })
      }, 100)

      // Create form data
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', folder)
      formData.append('isAdmin', isAdmin.toString())

      // Upload file
      console.log('🔧 Uploading to API...')
      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()
      console.log('🔧 API response:', result)

      clearInterval(progressInterval)
      setProgress(100)

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Upload failed')
      }

      if (result.fallback) {
        console.log('⚠️ Using fallback upload method')
      }

      // Clean up preview URL if it was a blob
      if (previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl)
      }

      // Set the final image URL
      setPreview(result.url)
      onUpload(result.url)

      // Reset progress after a delay
      setTimeout(() => {
        setProgress(0)
      }, 2000)

    } catch (err: any) {
      console.error('Upload error:', err)
      setError(err.message || 'Upload failed')
      setPreview(currentImage || null) // Revert to original
    } finally {
      setUploading(false)
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const handleRemove = () => {
    setPreview(null)
    setError(null)
    onUpload('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Button */}
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="relative"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading}
        />
        
        <button
          onClick={handleClick}
          disabled={uploading}
          className={`w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg cursor-pointer text-center transition-colors flex items-center justify-center space-x-2 ${
            uploading ? 'cursor-not-allowed' : ''
          }`}
        >
          {uploading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Uploading... {progress}%</span>
            </>
          ) : (
            <>
              <span>📤</span>
              <span>{buttonText}</span>
            </>
          )}
        </button>

        {/* Progress Bar */}
        {uploading && (
          <div className="absolute bottom-0 left-0 h-1 bg-blue-500 rounded-b-lg transition-all duration-300"
               style={{ width: `${progress}%` }}></div>
        )}
      </motion.div>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-3 rounded-lg text-sm"
        >
          <div className="flex items-start gap-2">
            <span className="text-red-500 font-bold">⚠️</span>
            <div>
              <div className="font-medium">Upload Failed</div>
              <div className="text-xs text-red-300 mt-1">{error}</div>
              <div className="text-xs text-red-200 mt-2">
                Try: Check file size (max {Math.round(maxSize / 1024 / 1024)}MB), format (JPEG, PNG, WebP, GIF), and network connection.
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Image Preview */}
      {showPreview && preview && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative"
        >
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <div className="flex items-start space-x-4">
              <img
                src={preview}
                alt="Preview"
                className="w-16 h-16 object-cover rounded-lg border border-gray-600"
                onError={(e) => {
                  console.error('Image failed to load:', preview)
                  setError('Failed to load image')
                }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-300 font-medium truncate">
                  Image uploaded successfully
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {folder} • Ready to use
                </p>
              </div>
              <button
                onClick={handleRemove}
                className="text-red-400 hover:text-red-300 text-sm font-medium"
              >
                Remove
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Upload Guidelines */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>• Maximum file size: {Math.round(maxSize / 1024 / 1024)}MB</p>
        <p>• Supported formats: JPEG, PNG, WebP, GIF</p>
        <p>• Images will be optimized automatically</p>
      </div>
    </div>
  )
}

// Simple hook for programmatic uploads
export const useImageUpload = () => {
  const [uploading, setUploading] = useState(false)

  const uploadImage = async (
    file: File,
    folder: 'cases' | 'symbols' | 'icons' | 'profiles' | 'uploads',
    isAdmin = false
  ): Promise<{ success: boolean; url?: string; error?: string }> => {
    setUploading(true)
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', folder)
      formData.append('isAdmin', isAdmin.toString())

      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        return { success: false, error: result.error || 'Upload failed' }
      }

      return { success: true, url: result.url }
    } catch (error: any) {
      return { success: false, error: error.message || 'Upload failed' }
    } finally {
      setUploading(false)
    }
  }

  return { uploadImage, uploading }
}