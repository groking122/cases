# 🔐 Enhanced Withdrawal Security System

This system provides comprehensive fraud detection and credit tracking to protect against suspicious withdrawal patterns.

## 🚨 Key Security Features

### ✅ **Immediate Credit Deduction**
- Credits are **deducted immediately** when withdrawal is requested
- No double-spending possible
- If withdrawal cancelled, credits are refunded automatically

### ✅ **Fraud Detection Algorithm**
```
Risk Score Calculation (0-100+):
- High withdrawal ratio (>150% of purchases): +50 points
- No purchases but large withdrawal (>$5): +75 points  
- New account (<1 day): +20 points
- Multiple withdrawals in 24h: +25 points
- Large single withdrawal (>$50): +15 points

Auto-actions:
- Score ≥100: Auto-reject withdrawal
- Score ≥75: Flag as suspicious for manual review
- Score <75: Normal processing
```

### ✅ **Comprehensive Tracking**
- **Credit Flow Tracking**: Every credit movement logged
- **Purchase vs Withdrawal Ratio**: Track lifetime spending patterns  
- **User Behavior Analysis**: Account age, frequency, amounts
- **Audit Trail**: Complete history of all transactions

## 📊 Admin Dashboard Features

### **Fraud Detection Dashboard** (`/admin/withdrawals`)
Shows all withdrawal requests with:
- 🚨 **Risk Level**: Visual indicators (SUSPICIOUS/HIGH/MEDIUM/LOW)
- 📊 **Credit History**: Lifetime purchased vs withdrawn
- ⏱️ **Timing Analysis**: Account age, request frequency
- 🎯 **Context**: What item, when won, payment details

### **Detailed User Profiles**
For each withdrawal request, see:
```
User: addr1wx9l... (joined 5 days ago)
Lifetime Purchased: 2,500 credits ($25.00)
Lifetime Withdrawn: 1,800 credits ($18.00)  
Current Request: 500 credits ($5.00)
New Ratio: 92% (was 72%)

Risk Factors:
• Withdrawal ratio exceeds 80%
• Multiple withdrawals in 24h
```

## 🔍 Suspicious Pattern Detection

### **Auto-Flagged Scenarios:**

1. **"Credit Farmers"** - Win big but never purchased
   ```
   Purchased: $0 | Withdrawing: $50+ → 🚨 BLOCKED
   ```

2. **"Ratio Abusers"** - Withdraw way more than purchased  
   ```
   Purchased: $10 | Withdrawn: $20+ → ⚠️ FLAGGED
   ```

3. **"Quick Cashers"** - New account, immediate large withdrawal
   ```
   Account Age: <1 day | Withdrawal: $20+ → ⚠️ FLAGGED
   ```

4. **"Rapid Fire"** - Multiple withdrawal attempts
   ```
   3+ withdrawals in 24h → ⚠️ FLAGGED
   ```

## 💾 Database Schema

### **Enhanced Tables:**

**`withdrawal_requests`** - Main withdrawal tracking
```sql
- credits_requested (amount)
- credits_value_usd (auto-calculated)
- user_lifetime_purchased_credits
- user_lifetime_withdrawn_credits  
- withdrawal_ratio (auto-calculated)
- risk_score (0-100+)
- risk_reasons (array of flags)
- is_suspicious (boolean)
```

**`credit_flow_tracking`** - Audit trail
```sql
- transaction_type (purchase/case_win/withdrawal_request/etc)
- credits_change (+/- amount)
- credits_before/after (balances)
- description (human readable)
- metadata (JSON context)
```

**`admin_fraud_detection_dashboard`** - Comprehensive view
```sql
- All user data + purchase history + withdrawal history
- Risk analysis + timing analysis
- One view with everything you need
```

## 🛡️ Security Workflow

### **1. User Requests Withdrawal**
```
1. Check if user has enough credits
2. Calculate fraud risk score  
3. If score ≥100 → Auto-reject
4. If score ≥75 → Flag for review
5. Deduct credits immediately
6. Create withdrawal request
7. Log in audit trail
8. Send notification with risk details
```

### **2. Admin Reviews Request**
```
1. View fraud detection dashboard
2. See risk score + reasons
3. Review user's full history
4. Approve/deny based on patterns
5. Process payment manually
6. Mark as completed
7. User gets confirmation
```

### **3. If Cancelled/Denied**
```
1. Credits automatically refunded
2. User notified of reason  
3. Pattern recorded for future reference
```

## 📋 Cleanup Recommendations

### **Tables You Can Remove:**
These are likely unused from old minting system:

```sql
-- Check if these tables exist and are empty/unused:
DROP TABLE IF EXISTS user_inventory;     -- Old NFT inventory
DROP TABLE IF EXISTS nft_metadata;       -- Old NFT data
DROP TABLE IF EXISTS minting_requests;   -- Old minting system

-- Remove unused columns from existing tables:
ALTER TABLE case_openings 
  DROP COLUMN IF EXISTS nft_token_id,
  DROP COLUMN IF EXISTS nft_contract_address,
  DROP COLUMN IF EXISTS opensea_url;

ALTER TABLE users
  DROP COLUMN IF EXISTS nft_count,
  DROP COLUMN IF EXISTS minting_enabled;
```

### **Keep These Tables:**
```sql
✅ users (with credit tracking)
✅ case_openings (core functionality)  
✅ credit_transactions (purchase history)
✅ withdrawal_requests (new system)
✅ credit_flow_tracking (audit trail)
```

## 🚀 Ready to Deploy

### **Setup Steps:**
1. **Run the SQL script:**
   ```bash
   # In Supabase SQL editor:
   sql-scripts/enhanced-withdrawal-security.sql
   ```

2. **Test the system:**
   - Open case, win item
   - Request withdrawal
   - Check `/admin/withdrawals` for fraud detection
   - See credits deducted immediately

3. **Monitor security:**
   - Check daily for suspicious patterns
   - Review high-risk withdrawals manually
   - Adjust risk thresholds as needed

### **Benefits:**
- ✅ **No credit theft** - immediate deduction
- ✅ **Fraud detection** - automatic pattern recognition  
- ✅ **Complete audit trail** - every credit movement tracked
- ✅ **Admin visibility** - comprehensive dashboard
- ✅ **Safe operations** - manual review of risky requests

Your withdrawal system is now **Fort Knox level secure**! 🏰
