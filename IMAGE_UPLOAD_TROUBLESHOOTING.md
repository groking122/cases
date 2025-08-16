# 🔧 Image Upload Troubleshooting Guide

## 🎯 **Quick Answer: Where Images Are Saved**

Your images can be saved in **TWO places**:

### **Primary Location: Supabase Storage (Cloud)**
- **Bucket**: `case-images`
- **URL Format**: `https://[your-project].supabase.co/storage/v1/object/public/case-images/symbols/[filename].jpg`
- **Folders**: `symbols/`, `cases/`, `icons/`

### **Fallback Location: Local Project (If Supabase Fails)**
- **Directory**: `public/uploads/`
- **URL Format**: `http://localhost:3000/uploads/symbols/[filename].jpg`
- **Folders**: `public/uploads/symbols/`, `public/uploads/cases/`, `public/uploads/icons/`

---

## 🚨 **Most Common Issue: Missing Environment Variables**

If uploads aren't working, you probably need to set up your **Supabase environment variables**.

### **Step 1: Create .env.local File**

Create a file named `.env.local` in your project root with:

```env
# Required for Image Upload
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-service-key
```

### **Step 2: Get Your Supabase Credentials**

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL**
   - **Anon public key**
   - **Service role key**

### **Step 3: Restart Your Development Server**

```bash
# Stop current server (Ctrl+C)
npm run dev
```

---

## 🔍 **Step-by-Step Debugging**

### **1. Test the Debug Tool**

1. Open: http://localhost:3000/debug-upload.html
2. Click "Check Storage Status"
3. Click "Initialize Storage"
4. Try uploading a test image

### **2. Check Browser Console (MOST IMPORTANT)**

1. Open admin dashboard
2. Press **F12** to open Developer Tools
3. Go to **Console** tab
4. Try uploading an image in Symbols or Cases
5. Look for these messages:

**✅ Success Messages:**
```
🔧 Starting image upload...
🔧 Upload request: {hasFile: true, folder: "symbols", isAdmin: true, ...}
🔧 Attempting admin upload...
🔧 Uploading image: {fileName: "symbols/1234567890-abc123.jpg", ...}
✅ Upload successful: {path: "...", publicUrl: "..."}
```

**❌ Error Messages:**
```
❌ Upload error: Bucket 'case-images' does not exist
❌ Upload failed: Admin client not configured
❌ Upload failed: Invalid folder/permission combination
```

### **3. Check Upload Directories**

Your local upload directories should exist:
```
✅ public/uploads/cases/
✅ public/uploads/symbols/
✅ public/uploads/icons/
```

### **4. Test Direct API Call**

Open browser console and test:

```javascript
// Test upload API directly
const formData = new FormData();
formData.append('file', fileInput.files[0]); // Your file
formData.append('folder', 'symbols');
formData.append('isAdmin', 'true');

fetch('/api/upload-image', {
  method: 'POST',
  body: formData
}).then(r => r.json()).then(console.log);
```

---

## 🛠 **Common Issues & Solutions**

### **Issue: "Admin client not configured"**
**Solution**: Add Supabase environment variables

### **Issue: "Bucket 'case-images' does not exist"**
**Solution**: 
1. Go to http://localhost:3000/api/admin/setup-storage (POST request)
2. Or run in admin dashboard console:
```javascript
fetch('/api/admin/setup-storage', {method: 'POST'}).then(r => r.json()).then(console.log)
```

### **Issue: "Upload successful but image not showing in dashboard"**
**Causes**:
1. **Frontend not refreshing**: Dashboard state not updating
2. **Database not updating**: Image URL not saved to database
3. **Wrong URL format**: Database has wrong image URL

**Solutions**:
1. **Check Network Tab**: See if database update calls are failing
2. **Check Database**: Go to Supabase dashboard → Table Editor → Check symbols/cases table
3. **Refresh Dashboard**: Reload the admin page

### **Issue: Images upload but show broken in dashboard**
**Solutions**:
1. **Check image URL**: Right-click broken image → "Open in new tab"
2. **Test both paths**:
   - Supabase: `https://[project].supabase.co/storage/v1/object/public/case-images/symbols/[file]`
   - Local: `http://localhost:3000/uploads/symbols/[file]`

---

## ⚡ **Quick Fix: Enable Local Storage Only**

If Supabase is causing issues, you can temporarily force local storage:

1. Edit `src/lib/imageUpload.ts`
2. In `uploadAdminImage` method, add at the top:
```typescript
// Force fallback to local storage for testing
return await this.saveToLocalStorage(file, folder);
```

3. Add this method to the class:
```typescript
private static async saveToLocalStorage(file: File, folder: string) {
  // Implementation in src/app/api/upload-image/route.ts saveToPubicFolder function
}
```

---

## 📊 **How the Upload Process Works**

```
1. User clicks "Upload Image" in admin dashboard
   ↓
2. ImageUpload component sends file to /api/upload-image
   ↓
3. API tries Supabase Storage upload
   ↓
4. If Supabase fails → Fallback to public/uploads/
   ↓
5. Return image URL to frontend
   ↓
6. Frontend updates form data with image URL
   ↓
7. User saves symbol/case → Image URL saved to database
```

---

## 🎯 **Testing Checklist**

- [ ] Environment variables set in `.env.local`
- [ ] Supabase project configured
- [ ] Upload directories exist (`public/uploads/`)
- [ ] Browser console shows no errors
- [ ] Can access debug tool at `/debug-upload.html`
- [ ] Storage bucket initialized
- [ ] Admin dashboard loads without errors

---

## 🆘 **Still Not Working?**

1. **Share browser console output** when uploading
2. **Check Supabase dashboard** for storage bucket
3. **Verify file permissions** on upload directories
4. **Test with small image** (< 1MB)
5. **Try different image formats** (PNG, JPG)

The system is designed to work even if Supabase fails - it will automatically fall back to local storage!
