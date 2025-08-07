# Debug Information for Admin Dashboard Issues

## 🔍 Current Issues and Fixes Applied:

### Issue 1: Case Update Error
**Problem**: `PGRST116` error when updating cases  
**Root Cause**: Overly strict validation requiring probability weights even when no symbols provided  
**Fix Applied**: 
- Made probability validation conditional (only when symbols are provided)
- Made symbol insertion conditional
- Removed duplicate error handling

### Issue 2: Symbol Image Updates Not Reflecting
**Potential Causes**:
1. **Frontend State Issue**: Component not re-rendering after API success
2. **API Response Mapping**: Database field mapping not working correctly
3. **Cache Issue**: Browser/component cache not updating

**To Debug Symbol Images**:
1. Check browser Network tab for successful upload (should return 200)
2. Check if `loadDashboardData()` is called after symbol update
3. Verify API response includes updated image URL
4. Check if symbol list component re-renders

### Testing Steps:

#### For Case Updates:
```javascript
// In browser console after case update attempt:
console.log('Last API call result:', performance.getEntriesByType('navigation'))
```

#### For Symbol Images:
```javascript
// Check if symbol data is updated:
console.log('Current symbols state:', symbols)
// After image upload, verify API response:
fetch('/api/admin/symbols/SYMBOL_ID', {
  headers: { 'Authorization': 'Bearer ' + localStorage.getItem('adminToken') }
}).then(r => r.json()).then(console.log)
```

## 🚀 Quick Fixes to Try:

### 1. Hard Refresh
- Press `Ctrl+F5` to clear cache and reload

### 2. Check Console Errors
- Open DevTools (F12) → Console tab
- Look for any red error messages during case/symbol updates

### 3. Verify API Responses
- Open DevTools → Network tab
- Attempt case update
- Check if PATCH request to `/api/admin/cases/[id]` returns 200 status

### 4. Symbol Image Debug
- Upload symbol image
- Check if `/api/upload-image` returns success
- Check if symbol update PATCH returns 200
- Verify `loadDashboardData()` is called

## 🔧 Server Restart
If issues persist, restart dev server:
```bash
# Kill existing processes
taskkill /F /IM node.exe
# Start fresh
npm run dev
```