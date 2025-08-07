# 📸 Image Upload System Guide

## 🚀 Quick Start

Your case opening site now has a **production-ready image upload system** using Supabase Storage. Here's how to get started:

### 1️⃣ **Initial Setup** (Run Once)

```bash
# Install dependencies (if not already installed)
npm install

# Run the storage setup script
node setup-storage.js
```

This creates your Supabase storage bucket and folder structure.

---

## 🛠️ **Usage Examples**

### **Admin Components** (Symbol & Case Images)

```tsx
import { ImageUpload } from '@/components/ImageUpload'

function AdminPanel() {
  return (
    <ImageUpload
      onUpload={(url) => console.log('Image uploaded:', url)}
      folder="symbols"        // or "cases", "icons"
      isAdmin={true}          // Required for admin uploads
      buttonText="Upload Symbol"
      showPreview={true}
    />
  )
}
```

### **User Components** (Profile Images)

```tsx
function UserProfile() {
  return (
    <ImageUpload
      onUpload={(url) => updateUserProfile({ avatar: url })}
      folder="profiles"       // or "uploads"
      isAdmin={false}
      currentImage={user.avatar}
      buttonText="Upload Avatar"
    />
  )
}
```

### **Programmatic Uploads**

```tsx
import { useImageUpload } from '@/components/ImageUpload'

function MyComponent() {
  const { uploadImage, uploading } = useImageUpload()

  const handleFileSelect = async (file: File) => {
    const result = await uploadImage(file, 'symbols', true)
    
    if (result.success) {
      console.log('Upload successful:', result.url)
    } else {
      console.error('Upload failed:', result.error)
    }
  }

  return <input type="file" onChange={e => handleFileSelect(e.target.files[0])} />
}
```

---

## 📁 **Folder Structure**

Your images are organized into these folders:

- **`cases/`** - Case box images (admin only)
- **`symbols/`** - Symbol/reward images (admin only)  
- **`icons/`** - UI icons and graphics (admin only)
- **`profiles/`** - User profile pictures (user specific)
- **`uploads/`** - General user uploads (user specific)

---

## ⚡ **Features**

### **✨ Automatic Optimizations**
- **CDN delivery** for fast loading
- **Image transformations** (resize, format conversion)
- **Compression** to reduce file sizes
- **WebP format** support for better performance

### **🔒 Security**
- **File type validation** (JPEG, PNG, WebP, GIF only)
- **File size limits** (max 5MB)
- **Access control** (admin vs user folders)
- **Supabase RLS policies** for data protection

### **📱 User Experience**
- **Drag & drop** support
- **Upload progress** indicators
- **Image previews** before and after upload
- **Error handling** with user-friendly messages

---

## 🎨 **Image Optimization**

Get optimized versions of your images:

```tsx
import { ImageUploadService } from '@/lib/imageUpload'

// Get a resized, optimized image
const optimizedUrl = ImageUploadService.getOptimizedImageUrl(
  'symbols/my-image.png',
  {
    width: 256,
    height: 256,
    quality: 80,
    format: 'webp'
  }
)
```

---

## 🔧 **API Endpoints**

### Upload Image
```
POST /api/upload-image
Content-Type: multipart/form-data

file: [File]
folder: "symbols" | "cases" | "icons" | "profiles" | "uploads"
isAdmin: "true" | "false"
```

### Delete Image
```
DELETE /api/upload-image?path=symbols/image.png
```

---

## 🏗️ **Integration with Existing Components**

Your **admin components** have been automatically updated to use the new system:

- ✅ **AssetAdminPanel** - Now uploads to Supabase Storage
- ✅ **SymbolCreator** - Uses ImageUpload component  
- ✅ **SymbolEditor** - Shows current + new image preview

---

## 🚨 **Troubleshooting**

### **Setup Issues**

**Problem**: "Missing environment variables"
```bash
# Solution: Check your .env.local file
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
```

**Problem**: "Storage bucket not found"
```bash
# Solution: Run the setup script
node setup-storage.js
```

### **Upload Issues**

**Problem**: "Upload failed"
- ✅ Check file size (max 5MB)
- ✅ Check file type (JPEG, PNG, WebP, GIF)
- ✅ Verify Supabase credentials
- ✅ Check browser console for errors

**Problem**: "Permission denied"
- ✅ Ensure `isAdmin={true}` for admin folders
- ✅ Check user authentication for user folders

---

## 📊 **Storage Management**

### **View Storage Usage**
Go to your Supabase dashboard → Storage → case-images bucket

### **Cost Monitoring**
- **Free tier**: 1GB storage + generous bandwidth
- **Paid plans**: Start at $25/month for unlimited
- **Optimization**: Use WebP format to reduce costs

### **Backup Strategy**
- Supabase handles **automatic backups**
- Consider **periodic exports** for critical images
- Use **image optimization** to reduce storage costs

---

## 🎯 **Alternative Solutions**

If you need different upload solutions, here are other options:

### **Option 2: Cloudinary** (Full-featured)
- ✅ Advanced image transformations
- ✅ Video support
- ✅ AI-powered features
- ❌ More expensive
- ❌ Additional service to manage

### **Option 3: AWS S3** (Enterprise)
- ✅ Unlimited scalability  
- ✅ Global CDN (CloudFront)
- ✅ Advanced security features
- ❌ Complex setup
- ❌ Higher cost for small apps

### **Option 4: Next.js + Vercel Blob** (Simple)
- ✅ Zero-config setup
- ✅ Integrated with Vercel
- ❌ Limited free tier
- ❌ Vendor lock-in

---

## ✅ **Best Practices**

1. **Always validate files** on both client and server
2. **Use optimized images** for better performance  
3. **Implement proper error handling** for failed uploads
4. **Monitor storage usage** to avoid surprise costs
5. **Use appropriate folders** for different image types
6. **Test uploads** in both development and production

---

Your image upload system is now **production-ready**! 🎉

For questions or issues, check the Supabase documentation or the troubleshooting section above.