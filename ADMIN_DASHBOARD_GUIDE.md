# 🎰 Admin Dashboard Guide

## ✅ What's Been Upgraded

### 1. **Enhanced Admin Dashboard**
- ✅ Added Withdrawals management tab
- ✅ Improved UI with better animations and styling
- ✅ Better error handling and loading states
- ✅ Real-time data updates

### 2. **Fixed Image Upload System**
- ✅ **Primary**: Supabase Storage integration with auto-bucket creation
- ✅ **Fallback**: Local file system storage in `public/uploads/`
- ✅ Enhanced error messages and upload feedback
- ✅ Better validation and progress indicators

### 3. **Withdrawal Management**
- ✅ Complete withdrawal request dashboard
- ✅ Risk assessment and fraud detection display
- ✅ Bulk credit withdrawal support
- ✅ Status management (pending → processing → completed)
- ✅ Detailed request information modal

### 4. **Image Upload Improvements**
- ✅ Robust error handling
- ✅ Multiple upload methods (Supabase + fallback)
- ✅ Better user feedback
- ✅ File validation and size limits

## 🚀 How to Use

### **Admin Login**
1. Go to `/admin/login`
2. Use development credentials:
   - Email: `admin@yoursite.com`
   - Password: `ChangeThisPassword123!`

### **Dashboard Tabs**

#### 📊 **Dashboard**
- Overview statistics
- Recent activity
- Top performing cases

#### 📦 **Cases**
- Create/edit/delete cases
- Configure case pricing and symbols
- Upload case images
- Set case active status

#### 💎 **Symbols**
- Create/edit/delete symbols
- Upload symbol images
- Set rarity and values
- Toggle active status

#### 💸 **Withdrawals** (NEW!)
- View all withdrawal requests
- Filter by status (pending, flagged, completed)
- Process requests step by step
- View risk assessments
- Approve/reject flagged requests

#### 📈 **Analytics**
- View detailed statistics
- Date range filtering
- Performance metrics

### **Image Upload Features**

#### **Primary Method - Supabase Storage:**
- Automatic bucket creation
- Optimized image handling
- CDN delivery
- Secure storage

#### **Fallback Method - Local Storage:**
- If Supabase fails, saves to `public/uploads/`
- Maintains functionality even with storage issues
- Images accessible via `/uploads/folder/filename`

### **Withdrawal Management Workflow**

1. **New Request** → Status: `pending`
2. **Review Request** → Click "View Details" for full information
3. **Process** → Click "Process" to mark as `processing`
4. **Complete** → Enter transaction hash and mark `completed`
5. **Cancel/Reject** → Add notes and cancel if needed

### **Risk Assessment**
- 🟢 Low Risk: Normal processing
- 🔵 Medium Risk: Review recommended
- 🟡 High Risk: Manual review required
- 🔴 Suspicious: Flagged for investigation

## 🔧 Troubleshooting

### **Image Upload Not Working?**

1. **Check Console Logs**: Open browser dev tools to see detailed upload logs
2. **Storage Setup**: Visit `/api/admin/setup-storage` to initialize Supabase bucket
3. **Fallback Mode**: If Supabase fails, images save to `public/uploads/` automatically
4. **File Validation**: Ensure files are under 5MB and supported formats (JPEG, PNG, WebP, GIF)

### **Storage Bucket Issues?**

```bash
# Check bucket status
GET /api/admin/setup-storage

# Create bucket
POST /api/admin/setup-storage
```

### **Missing Withdrawals Data?**

Make sure you've run the database migration:
```sql
-- Run this in Supabase SQL Editor
\i sql-scripts/fix-withdrawal-bulk-support.sql
```

## 🛠 Technical Details

### **File Structure**
```
src/
├── app/admin/
│   ├── page.tsx              # Main dashboard
│   ├── login/page.tsx        # Admin login
│   └── withdrawals/page.tsx  # Standalone withdrawals page
├── components/admin/
│   ├── WithdrawalRequests.tsx # Withdrawal management component
│   ├── CaseConfigurator.tsx   # Case creation/editing
│   ├── SymbolCreator.tsx      # Symbol creation
│   ├── SymbolEditor.tsx       # Symbol editing
│   └── SymbolLibrary.tsx      # Symbol management
├── lib/
│   └── imageUpload.ts         # Enhanced upload service
└── api/
    ├── upload-image/route.ts  # Upload endpoint with fallback
    └── admin/setup-storage/   # Storage initialization
```

### **Upload Directories**
```
public/uploads/
├── cases/     # Case images
├── symbols/   # Symbol images
└── icons/     # Icon images
```

### **Environment Variables Required**
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 🎯 Key Improvements

1. **Image Upload Reliability**: Dual-method approach ensures uploads always work
2. **Better Error Handling**: Detailed error messages and troubleshooting tips
3. **Withdrawal Management**: Complete workflow for processing user withdrawals
4. **Enhanced UX**: Better animations, loading states, and user feedback
5. **Robust Fallbacks**: System continues working even if services fail

## 🔐 Security Features

- JWT-based admin authentication
- File type validation and size limits
- RLS policies for database access
- Risk assessment for withdrawals
- Audit logging for admin actions

---

**Need Help?** Check the browser console for detailed logs and error messages. The system provides extensive debugging information to help troubleshoot any issues.
