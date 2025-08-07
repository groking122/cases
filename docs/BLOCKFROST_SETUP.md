# 🌐 Blockfrost API Setup Guide

## Why Use Blockfrost for Balance?

### **Wallet API Issues:**
- ❌ **Inconsistent formats**: Different wallets return balance in different ways
- ❌ **Parsing complexity**: Some use hex, CBOR, objects
- ❌ **Reliability issues**: Wallet extensions can be flaky
- ❌ **Limited data**: Only basic balance, no token details

### **Blockfrost API Benefits:**
- ✅ **Always consistent**: Standard JSON format
- ✅ **More reliable**: Direct blockchain query
- ✅ **Rich data**: Balance + all tokens + metadata
- ✅ **Free tier**: 100,000 requests/day
- ✅ **Production ready**: Used by major DApps

## 🚀 Quick Setup (5 minutes)

### Step 1: Get Free API Key

1. **Go to Blockfrost.io**: https://blockfrost.io/
2. **Sign up** for free account
3. **Create new project**:
   - **Name**: YourProject
   - **Network**: Cardano Mainnet
4. **Copy your API key** (starts with `mainnet_...`)

### Step 2: Add to Environment

In your `.env.local` file, add:

```bash
# Existing Supabase config
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Add this line with your actual API key
NEXT_PUBLIC_BLOCKFROST_API_KEY=mainnet_your_actual_api_key_here
```

### Step 3: Restart Server

```bash
# Stop current server (Ctrl+C in terminal)
# Then restart:
npm run dev
```

### Step 4: Test

1. **Connect your wallet**
2. **Check console logs** - should say "Using Blockfrost API for balance"
3. **Balance should be accurate**

## 🔍 Debug Without Blockfrost First

Before setting up Blockfrost, let's debug what your wallet is returning:

### Test Steps:
1. **Open browser console** (F12)
2. **Connect your wallet**
3. **Click the 🧪 debug button**
4. **Check the console output**

### Expected Console Output:
```
💳 Attempting multiple balance methods...
Method 1 - getBalance(): "1500000" string
Network ID: 1 (Mainnet)
🔍 String balance converted: "1500000" -> 1500000
💰 Final balance calculation: {
  raw: "1500000",
  lovelace: 1500000,
  ada: 1.5,
  formatted: "1.500000"
}
```

### Common Issues:

#### Issue: "Method 1 failed"
**Cause**: Wallet API not working
**Solution**: Install/reconnect wallet

#### Issue: Balance shows wrong number
**Possible causes**:
1. **Hex format**: `"0x16e360"` instead of `"1500000"`
2. **Object format**: `{coin: "1500000"}` instead of string
3. **Network mismatch**: Testnet vs Mainnet

#### Issue: Shows 0 ADA but wallet has more
**Solutions**:
1. **Check network**: Testnet vs Mainnet
2. **Refresh wallet**: Disconnect and reconnect
3. **Use Blockfrost**: More reliable than wallet API

## 🎯 Blockfrost vs Wallet API Comparison

| Feature | Wallet API | Blockfrost API |
|---------|------------|----------------|
| **Reliability** | ⚠️ Variable | ✅ Excellent |
| **Speed** | ✅ Fast | ✅ Fast |
| **Balance Format** | ❌ Inconsistent | ✅ Consistent |
| **Token Detection** | ❌ Limited | ✅ Complete |
| **Setup Required** | ✅ None | ⚠️ API Key |
| **Free Tier** | ✅ Unlimited | ✅ 100k/day |

## 🔧 Troubleshooting

### "Failed to fetch from wallet"
1. **Wallet not connected**: Reconnect wallet
2. **Network issues**: Check internet
3. **Wallet permissions**: Re-authorize if needed

### "Failed to fetch wallet balance"
1. **Check API key**: Verify in .env.local
2. **Check network**: Mainnet vs testnet
3. **Rate limits**: Unlikely with free tier

### Balance still wrong with Blockfrost
1. **Check address**: Verify correct wallet address
2. **Check network**: Ensure mainnet API key for mainnet wallet
3. **Cache issues**: Hard refresh browser (Ctrl+Shift+R)

## 📊 Expected Behavior

### Without Blockfrost:
- Uses wallet API directly
- May have format issues
- Basic balance only

### With Blockfrost:
- More reliable balance
- Token detection
- Metadata support
- Consistent formatting

## 🎮 Next Steps

Once balance is working correctly:

1. **Test token detection** (if you have Cardano tokens)
2. **Set your policy ID** for project tokens
3. **Add real ADA payments** (see TRANSACTION_GUIDE.md)
4. **Deploy to production** with same setup

Your Blockfrost setup is production-ready and used by major Cardano DApps! 🚀 