# 🔐 Security Setup Guide

## ✅ **What You Need to Do:**

### **Option 1: Quick Setup (Recommended)**
```sql
-- Run this in your Supabase SQL editor:
-- 1. First check what you have:
sql-scripts/pre-security-check.sql

-- 2. Then install minimal security:  
sql-scripts/minimal-security-system.sql
```

### **Option 2: Full Setup**
```sql
-- Run this for complete system:
sql-scripts/enhanced-withdrawal-security.sql
```

## ⚠️ **Error Fixed**
The error you got:
```
ERROR: 42703: column co.credits_won does not exist
```

**Fixed!** ✅ We changed it to use `co.reward_value` which is the correct column name in your `case_openings` table.

## 🧹 **Cleanup (Optional)**

Based on your request about unused files, here are tables you can likely remove:

```sql
-- Check if these exist and are empty:
SELECT table_name, 
       (SELECT COUNT(*) FROM information_schema.tables t2 
        WHERE t2.table_name = t1.table_name) as exists,
       'DROP TABLE IF EXISTS ' || table_name || ';' as drop_command
FROM (VALUES 
  ('user_inventory'),
  ('nft_metadata'), 
  ('minting_requests'),
  ('withdrawable_mint')
) t1(table_name);

-- Remove unused NFT columns from case_openings:
ALTER TABLE case_openings 
  DROP COLUMN IF EXISTS nft_token_id,
  DROP COLUMN IF EXISTS nft_contract_address, 
  DROP COLUMN IF EXISTS opensea_url;
```

## 🎯 **What This Gives You:**

### **Immediate Benefits:**
- ✅ **Credits deducted instantly** when withdrawal requested
- ✅ **Fraud detection** - auto-flags suspicious patterns
- ✅ **Complete audit trail** - every credit movement tracked
- ✅ **Admin dashboard** - see all withdrawal requests with risk scores

### **Security Features:**
```
🚨 Auto-blocks: Users withdrawing >150% of what they purchased
⚠️ Flags for review: High withdrawal ratios, new accounts, rapid requests
📊 Tracks: Purchase history vs withdrawal patterns
🔍 Detects: Credit farming, ratio abuse, suspicious timing
```

### **Admin Dashboard (`/admin/withdrawals`):**
```
🚨 SUSPICIOUS - Risk Score: 85/100
👤 User: addr1wx9l... (2 days old)
💰 Request: 500 credits ($5.00)  
📊 Purchased: 200 credits | Withdrawn: 300 credits
⚠️ Risk: Withdrawal ratio exceeds 150% of purchases
```

## 🚀 **Ready to Test:**

1. **Install the SQL** (use minimal-security-system.sql)
2. **Open a case and win something**
3. **Request withdrawal** - see credits deducted immediately  
4. **Check `/admin/withdrawals`** - see fraud detection in action
5. **Try suspicious patterns** - see auto-flagging work

## 📋 **Summary:**

✅ **Fixed the SQL error** (`credits_won` → `reward_value`)  
✅ **Created minimal setup** that works with your existing schema  
✅ **Added comprehensive fraud detection**  
✅ **All code compiles successfully**  
✅ **Ready to deploy**  

The **minimal-security-system.sql** is all you need - it adds the security features without requiring massive schema changes!
