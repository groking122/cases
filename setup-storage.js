#!/usr/bin/env node

/**
 * Setup script for Supabase Storage
 * Run this once to initialize your image storage bucket
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!')
  console.error('Make sure you have NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env.local file')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupStorage() {
  console.log('🚀 Setting up Supabase Storage...')

  try {
    // 1. Create the main images bucket
    console.log('📦 Creating storage bucket...')
    
    const { data: bucketData, error: bucketError } = await supabase.storage
      .createBucket('case-images', {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        fileSizeLimit: 5242880, // 5MB
      })

    if (bucketError) {
      if (bucketError.message.includes('already exists')) {
        console.log('✅ Bucket already exists, continuing...')
      } else {
        throw bucketError
      }
    } else {
      console.log('✅ Storage bucket created successfully!')
    }

    // 2. Set up folder structure by uploading placeholder files
    console.log('📁 Creating folder structure...')
    
    const folders = ['cases', 'symbols', 'icons', 'profiles', 'uploads']
    const placeholderContent = new Blob(['placeholder'], { type: 'text/plain' })

    for (const folder of folders) {
      const { error } = await supabase.storage
        .from('case-images')
        .upload(`${folder}/.placeholder`, placeholderContent, {
          upsert: true
        })

      if (error) {
        console.warn(`⚠️ Could not create ${folder} folder:`, error.message)
      } else {
        console.log(`✅ Created ${folder}/ folder`)
      }
    }

    // 3. Set up RLS policies for the storage bucket
    console.log('🔐 Setting up storage policies...')
    
    // Policy for public read access
    const publicReadPolicy = `
      CREATE POLICY "Public read access for case-images" ON storage.objects
      FOR SELECT USING (bucket_id = 'case-images');
    `

    // Policy for authenticated uploads to profiles/uploads folders
    const userUploadPolicy = `
      CREATE POLICY "Users can upload to their own profile folder" ON storage.objects
      FOR INSERT WITH CHECK (
        bucket_id = 'case-images' 
        AND (storage.foldername(name))[1] IN ('profiles', 'uploads')
        AND auth.uid()::text = (storage.foldername(name))[2]
      );
    `

    // Policy for admin uploads (service role only)
    const adminUploadPolicy = `
      CREATE POLICY "Service role can upload admin content" ON storage.objects
      FOR INSERT WITH CHECK (
        bucket_id = 'case-images'
        AND (storage.foldername(name))[1] IN ('cases', 'symbols', 'icons')
        AND auth.jwt() ->> 'role' = 'service_role'
      );
    `

    // Policy for admin delete (service role only)
    const adminDeletePolicy = `
      CREATE POLICY "Service role can delete any content" ON storage.objects
      FOR DELETE USING (
        bucket_id = 'case-images'
        AND auth.jwt() ->> 'role' = 'service_role'
      );
    `

    try {
      // Execute the policies (they might already exist)
      await supabase.rpc('exec_sql', { sql: publicReadPolicy })
      console.log('✅ Public read policy created')
    } catch (error) {
      if (error.message?.includes('already exists')) {
        console.log('✅ Public read policy already exists')
      } else {
        console.warn('⚠️ Could not create public read policy:', error.message)
      }
    }

    // 4. Test the setup
    console.log('🧪 Testing storage setup...')
    
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    
    if (listError) {
      throw listError
    }

    const caseImagesBucket = buckets.find(b => b.name === 'case-images')
    if (!caseImagesBucket) {
      throw new Error('case-images bucket not found after creation')
    }

    console.log('✅ Storage test passed!')

    // 5. Output next steps
    console.log('\n🎉 Storage setup complete!')
    console.log('\n📝 Next steps:')
    console.log('1. Use the ImageUpload component in your React components')
    console.log('2. For admin uploads, set isAdmin={true}')
    console.log('3. Images will be automatically optimized and served via CDN')
    console.log('\n🔗 Your storage URL:', `${supabaseUrl}/storage/v1/object/public/case-images/`)
    
    console.log('\n💡 Usage examples:')
    console.log('- Case images: /api/upload-image (folder: "cases", isAdmin: true)')
    console.log('- Symbol images: /api/upload-image (folder: "symbols", isAdmin: true)')
    console.log('- Profile images: /api/upload-image (folder: "profiles", isAdmin: false)')

  } catch (error) {
    console.error('❌ Setup failed:', error.message)
    console.error('\nTroubleshooting:')
    console.error('1. Check your SUPABASE_SERVICE_ROLE_KEY is correct')
    console.error('2. Ensure your Supabase project is active')
    console.error('3. Verify your environment variables are loaded correctly')
    process.exit(1)
  }
}

// Run the setup
setupStorage()