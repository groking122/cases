# 🧪 Wallet Connection Test Guide

## 🎯 Quick Test Checklist

### Step 1: Open Your App
- Go to **http://localhost:3000**
- You should see the enhanced wallet connection screen

### Step 2: Check Wallet Detection
Look for:
- ✅ **"Available Wallets (X/6)"** counter at the top
- ✅ **Refresh button** (🔄) and **"Show All"** button
- ✅ **Status indicators** next to wallet names

### Step 3: Install a Cardano Wallet (if needed)
**Recommended**: Install Nami wallet
1. Go to Chrome Web Store
2. Search for "Nami Wallet"
3. Click "Add to Chrome"
4. Refresh your app page

### Step 4: Test Connection
1. **Click on an available wallet** (green checkmark)
2. **Wallet popup should appear** asking for permission
3. **Click "Connect"** in the wallet popup
4. **Check browser console** (F12) for debug logs

### Step 5: Verify Success
After connecting, you should see:
- ✅ **Enhanced wallet display** with ADA balance
- ✅ **Game credits**: 1000 starting credits
- ✅ **Refresh button** for balance updates
- ✅ **Token section** (if you have tokens)
- ✅ **Unique username** like "Nami_a1b2c3d4"

## 🔍 Debug Information

### Check Browser Console (F12)
You should see logs like:
```
🔍 Checking for Cardano wallets...
window.cardano: {nami: {...}, eternl: {...}}
Nami (nami): ✅ Found
Eternl (eternl): ✅ Found
Available wallets: ['nami', 'eternl']
```

### Check Network Tab
- Look for API calls to `/api/user`
- Should return 200 status (success) or show error details

### Check Supabase Dashboard
- Go to your Supabase project
- Check **Table Editor** → **users** table
- Should see new user record with wallet address

## 🚨 Common Issues & Solutions

### "No wallets detected"
**Solution**: 
- Install Nami or Eternl wallet extension
- Click the 🔄 **Refresh** button
- Click **"Show All"** to see installation options

### "Failed to create user account"
**Solutions**:
1. **Check .env.local file**:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://your-actual-url.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-actual-service-key
   ```

2. **Run database fix** in Supabase SQL Editor:
   ```sql
   ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
   ```

3. **Restart development server**:
   ```bash
   # Stop server (Ctrl+C)
   npm run dev
   ```

### "Username already exists"
**Fixed**: Now generates unique usernames like "Nami_a1b2c3d4"

### "Balance shows 0.00"
**Normal**: If your wallet has no ADA
**Solutions**:
- Get some test ADA from Cardano testnet faucet
- Or use mainnet wallet with actual ADA
- Click refresh button to update

### "Tokens not showing"
**Optional**: Add Blockfrost API key to .env.local for enhanced token detection

## ✅ Success Indicators

### Wallet Connection Working:
- ✅ Wallet detected and shows green checkmark
- ✅ Connection popup appears when clicked
- ✅ User account created successfully
- ✅ Redirected to main game interface

### Database Working:
- ✅ No console errors about Supabase
- ✅ User appears in Supabase users table
- ✅ 1000 credits assigned
- ✅ Unique username generated

### Enhanced Features Working:
- ✅ ADA balance displayed (₳X.XX format)
- ✅ Token detection (if you have tokens)
- ✅ Refresh button updates balance
- ✅ Professional wallet display

## 🎮 Next Steps After Success

1. **Test case opening** → Spend credits, win skins
2. **Check transaction history** → View in Supabase
3. **Add Blockfrost API** → Enhanced token detection
4. **Set your policy ID** → Highlight your project tokens
5. **Add real ADA payments** → See TRANSACTION_GUIDE.md

## 🔧 Environment File Template

If you need to recreate .env.local:

```bash
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-service-key

# Optional - Enhanced Features
NEXT_PUBLIC_BLOCKFROST_API_KEY=mainnet_your_blockfrost_key
NEXT_PUBLIC_YOUR_TOKEN_POLICY_ID=your_token_policy_id
```

Your wallet connection is now enterprise-grade! 🚀 