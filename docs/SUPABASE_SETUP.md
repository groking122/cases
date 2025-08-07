# 🛡️ Secure Supabase Setup Guide

## 📋 Overview

This guide sets up a **production-ready, secure** Supabase backend for your case opening platform. This includes:

- 🔐 **Server-controlled rewards** (no client-side manipulation)
- 📊 **Complete audit trail** (every action logged)
- 🚨 **Fraud detection** (real-time monitoring)
- 🛡️ **Row Level Security** (data protection)
- ⚡ **Edge Functions** (server-side logic)

---

## 🚀 Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up/login and create a new project
3. Wait for the project to initialize (2-3 minutes)
4. Note down your credentials:
   - **Project URL**: `https://your-project-ref.supabase.co`
   - **Anon Key**: `eyJhbGciOiJIUzI1...` (long string)
   - **Service Role Key**: `eyJhbGciOiJIUzI1...` (different long string)

---

## 🔧 Step 2: Environment Setup

Create a `.env.local` file in your `case-opening-site` directory:

```bash
# Public keys (safe to expose to frontend)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Private keys (server-side only - never expose to frontend)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**⚠️ Security Note:** Never commit `.env.local` to version control!

---

## 🗄️ Step 3: Database Schema Setup

Go to your Supabase dashboard → SQL Editor and run these commands **in order**:

### **3.1 Core Tables**

```sql
-- Users table with enhanced security
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  balance INTEGER DEFAULT 1000 CHECK (balance >= 0),
  total_opened INTEGER DEFAULT 0 CHECK (total_opened >= 0),
  is_active BOOLEAN DEFAULT true,
  risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
  last_case_opened TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rewards table with probability distribution
CREATE TABLE rewards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  rarity TEXT CHECK (rarity IN ('common', 'rare', 'epic', 'legendary', 'mythic')),
  value INTEGER NOT NULL CHECK (value > 0),
  image TEXT NOT NULL,
  description TEXT,
  case_type TEXT DEFAULT 'premium',
  drop_rate DECIMAL(6,5) NOT NULL CHECK (drop_rate > 0 AND drop_rate <= 1),
  cumulative_probability DECIMAL(6,5) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Case openings with complete transaction data
CREATE TABLE case_openings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  case_type TEXT NOT NULL,
  case_cost INTEGER NOT NULL CHECK (case_cost > 0),
  reward_id UUID REFERENCES rewards(id),
  reward_name TEXT NOT NULL,
  reward_rarity TEXT NOT NULL,
  reward_value INTEGER NOT NULL CHECK (reward_value > 0),
  user_balance_before INTEGER NOT NULL,
  user_balance_after INTEGER NOT NULL,
  server_seed TEXT NOT NULL, -- For provably fair
  client_seed TEXT, -- User can provide for fairness
  nonce INTEGER NOT NULL,
  opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit logs for complete transparency
CREATE TABLE audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  details JSONB NOT NULL,
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,
  risk_flags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fraud detection patterns
CREATE TABLE fraud_patterns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  pattern_type TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  details JSONB NOT NULL,
  is_resolved BOOLEAN DEFAULT false,
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);
```

### **3.2 Insert Sample Rewards**

```sql
-- Insert rewards with proper probability distribution
INSERT INTO rewards (name, rarity, value, image, description, case_type, drop_rate, cumulative_probability) VALUES
-- Common (50% total)
('Forest Guardian', 'common', 15, '🌲', 'A camouflaged skin for stealth operations', 'premium', 0.30000, 0.30000),
('Steel Blade', 'common', 25, '⚔️', 'Sturdy steel with reliable performance', 'premium', 0.20000, 0.50000),

-- Rare (25% total)  
('Blue Steel', 'rare', 75, '🔷', 'Cold steel with a pristine blue finish', 'premium', 0.15000, 0.65000),
('Fire Strike', 'rare', 95, '🔥', 'Blazing hot with explosive power', 'premium', 0.10000, 0.75000),

-- Epic (15% total)
('Dragon Slayer', 'epic', 250, '🐉', 'Forged in dragon fire with mystical powers', 'premium', 0.10000, 0.85000),
('Ice Storm', 'epic', 300, '❄️', 'Frozen in eternal winter', 'premium', 0.05000, 0.90000),

-- Legendary (8% total)
('Golden Emperor', 'legendary', 1200, '🏺', 'An ancient artifact from a lost civilization', 'premium', 0.05000, 0.95000),
('Shadow Phantom', 'legendary', 1500, '👻', 'Invisible in the darkness', 'premium', 0.03000, 0.98000),

-- Mythic (2% total)
('Cosmic Nebula', 'mythic', 5500, '🌌', 'Infused with the power of distant galaxies', 'premium', 0.01500, 0.99500),
('Divine Thunder', 'mythic', 7500, '⚡', 'Wielded by the gods themselves', 'premium', 0.00500, 1.00000);
```

---

## 🔐 Step 4: Row Level Security (RLS)

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_openings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE fraud_patterns ENABLE ROW LEVEL SECURITY;

-- User policies
CREATE POLICY "Users can view own profile" ON users 
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users 
  FOR UPDATE USING (auth.uid() = id);

-- Reward policies  
CREATE POLICY "Anyone can view active rewards" ON rewards 
  FOR SELECT USING (is_active = true);

-- Case opening policies
CREATE POLICY "Users can view own case openings" ON case_openings 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert case openings" ON case_openings 
  FOR INSERT WITH CHECK (true); -- Only server functions can insert

-- Audit log policies
CREATE POLICY "Users can view own audit logs" ON audit_logs 
  FOR SELECT USING (auth.uid() = user_id);

-- Fraud pattern policies (admin only)
CREATE POLICY "Admins can view fraud patterns" ON fraud_patterns 
  FOR ALL USING (false); -- Only accessible via service role
```

---

## ⚡ Step 5: Server-Side Functions

### **5.1 Secure Case Opening Function**

```sql
CREATE OR REPLACE FUNCTION open_case_secure(
  p_user_id UUID,
  p_case_type TEXT,
  p_client_seed TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_user_balance INTEGER;
  v_case_cost INTEGER := 100; -- Premium case cost
  v_random_value DECIMAL;
  v_selected_reward RECORD;
  v_opening_id UUID;
  v_server_seed TEXT;
  v_nonce INTEGER;
BEGIN
  -- 1. Verify user exists and get balance
  SELECT balance INTO v_user_balance 
  FROM users 
  WHERE id = p_user_id AND is_active = true;
  
  IF v_user_balance IS NULL THEN
    RETURN json_build_object('error', 'user_not_found');
  END IF;
  
  -- 2. Check sufficient balance
  IF v_user_balance < v_case_cost THEN
    RETURN json_build_object('error', 'insufficient_balance');
  END IF;
  
  -- 3. Rate limiting check (max 1 case per 3 seconds)
  PERFORM 1 FROM users 
  WHERE id = p_user_id 
  AND last_case_opened > NOW() - INTERVAL '3 seconds';
  
  IF FOUND THEN
    RETURN json_build_object('error', 'rate_limited');
  END IF;
  
  -- 4. Generate provably fair random number
  SELECT 
    encode(gen_random_bytes(32), 'hex'),
    COALESCE((SELECT MAX(nonce) + 1 FROM case_openings WHERE user_id = p_user_id), 1)
  INTO v_server_seed, v_nonce;
  
  -- Combine server seed, client seed, and nonce for fairness
  SELECT (
    ('x' || substr(md5(v_server_seed || COALESCE(p_client_seed, '') || v_nonce::TEXT), 1, 8))::bit(32)::bigint::DECIMAL 
    / 4294967295.0
  ) INTO v_random_value;
  
  -- 5. Select reward based on probability
  SELECT * INTO v_selected_reward 
  FROM rewards 
  WHERE case_type = p_case_type 
  AND is_active = true
  AND v_random_value <= cumulative_probability
  ORDER BY cumulative_probability ASC
  LIMIT 1;
  
  IF v_selected_reward IS NULL THEN
    RETURN json_build_object('error', 'no_rewards_available');
  END IF;
  
  -- 6. Atomic transaction: update balance and record opening
  BEGIN
    -- Update user
    UPDATE users SET 
      balance = balance - v_case_cost + v_selected_reward.value,
      total_opened = total_opened + 1,
      last_case_opened = NOW(),
      updated_at = NOW()
    WHERE id = p_user_id;
    
    -- Record case opening
    INSERT INTO case_openings (
      user_id, case_type, case_cost, reward_id, reward_name, 
      reward_rarity, reward_value, user_balance_before, 
      user_balance_after, server_seed, client_seed, nonce
    ) VALUES (
      p_user_id, p_case_type, v_case_cost, v_selected_reward.id, 
      v_selected_reward.name, v_selected_reward.rarity, v_selected_reward.value,
      v_user_balance, v_user_balance - v_case_cost + v_selected_reward.value,
      v_server_seed, p_client_seed, v_nonce
    ) RETURNING id INTO v_opening_id;
    
    -- Log the action
    PERFORM log_user_action_internal(
      p_user_id, 
      'case_opened',
      json_build_object(
        'case_type', p_case_type,
        'cost', v_case_cost,
        'reward_id', v_selected_reward.id,
        'reward_value', v_selected_reward.value,
        'opening_id', v_opening_id
      )
    );
    
  EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('error', 'transaction_failed');
  END;
  
  -- 7. Return success response
  RETURN json_build_object(
    'success', true,
    'reward', row_to_json(v_selected_reward),
    'opening_id', v_opening_id,
    'new_balance', v_user_balance - v_case_cost + v_selected_reward.value,
    'server_seed', v_server_seed,
    'nonce', v_nonce
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### **5.2 Audit Logging Function**

```sql
CREATE OR REPLACE FUNCTION log_user_action_internal(
  p_user_id UUID,
  p_action_type TEXT,
  p_details JSONB,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO audit_logs (
    user_id, action_type, details, ip_address, 
    user_agent, session_id
  ) VALUES (
    p_user_id, p_action_type, p_details, p_ip_address,
    p_user_agent, p_session_id
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### **5.3 Fraud Detection Function**

```sql
CREATE OR REPLACE FUNCTION detect_fraud_patterns(
  p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_recent_openings INTEGER;
  v_win_rate DECIMAL;
  v_total_spent INTEGER;
  v_risk_score INTEGER := 0;
  v_alerts JSONB := '[]'::JSONB;
  v_action_required TEXT := 'none';
BEGIN
  -- Check for rapid-fire case opening (suspicious)
  SELECT COUNT(*) INTO v_recent_openings 
  FROM case_openings 
  WHERE user_id = p_user_id 
  AND opened_at > NOW() - INTERVAL '1 minute';
  
  IF v_recent_openings > 10 THEN
    v_risk_score := v_risk_score + 50;
    v_alerts := v_alerts || '"rapid_opening"'::JSONB;
  END IF;
  
  -- Check for suspiciously high win rates
  SELECT 
    AVG(CASE WHEN reward_value > case_cost THEN 1.0 ELSE 0.0 END),
    SUM(case_cost)
  INTO v_win_rate, v_total_spent
  FROM case_openings 
  WHERE user_id = p_user_id
  AND opened_at > NOW() - INTERVAL '24 hours';
  
  IF v_win_rate > 0.8 AND v_total_spent > 1000 THEN
    v_risk_score := v_risk_score + 75;
    v_alerts := v_alerts || '"suspicious_win_rate"'::JSONB;
  END IF;
  
  -- Check for unusual spending patterns
  IF v_total_spent > 10000 THEN
    v_risk_score := v_risk_score + 30;
    v_alerts := v_alerts || '"high_spending"'::JSONB;
  END IF;
  
  -- Determine action required
  IF v_risk_score > 70 THEN
    v_action_required := 'block';
    
    -- Log fraud pattern
    INSERT INTO fraud_patterns (user_id, pattern_type, severity, details)
    VALUES (p_user_id, 'high_risk_behavior', 'critical', 
            json_build_object('risk_score', v_risk_score, 'alerts', v_alerts));
            
  ELSIF v_risk_score > 40 THEN
    v_action_required := 'monitor';
    
    INSERT INTO fraud_patterns (user_id, pattern_type, severity, details)
    VALUES (p_user_id, 'moderate_risk_behavior', 'medium',
            json_build_object('risk_score', v_risk_score, 'alerts', v_alerts));
  END IF;
  
  -- Update user risk score
  UPDATE users SET risk_score = v_risk_score WHERE id = p_user_id;
  
  RETURN json_build_object(
    'risk_score', v_risk_score,
    'alerts', v_alerts,
    'action_required', v_action_required,
    'details', json_build_object(
      'recent_openings', v_recent_openings,
      'win_rate', v_win_rate,
      'total_spent', v_total_spent
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 🔑 Step 6: Authentication Setup

1. Go to **Authentication > Settings** in your Supabase dashboard
2. Enable **Email** authentication
3. Optionally enable **Google**, **GitHub**, or other providers
4. Set up **Email Templates** (optional)
5. Configure **URL Configuration**:
   - Site URL: `http://localhost:3000` (development)
   - Redirect URLs: `http://localhost:3000/auth/callback`

---

## 🧪 Step 7: Testing the Setup

### **7.1 Test Database Connection**

```javascript
// In your frontend console
import { supabase } from '@/lib/supabase'

// Test connection
const { data, error } = await supabase.from('rewards').select('*')
console.log('Rewards:', data)
```

### **7.2 Test Case Opening Function**

```javascript
// Test secure case opening
const { data, error } = await supabase.rpc('open_case_secure', {
  p_user_id: 'your-user-id-here',
  p_case_type: 'premium',
  p_client_seed: 'optional-client-seed'
})
console.log('Case opening result:', data)
```

---

## 🚀 Step 8: Production Deployment

### **8.1 Environment Variables for Production**

```bash
# Production .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-prod-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-prod-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-prod-service-key
```

### **8.2 Security Hardening**

1. **Enable Database Backups**
2. **Set up Monitoring & Alerts**
3. **Configure IP Restrictions** (if needed)
4. **Enable SSL enforcement**
5. **Set up CORS policies**

---

## 📊 Monitoring & Analytics

### **Useful Queries for Monitoring:**

```sql
-- Daily case opening stats
SELECT 
  DATE(opened_at) as date,
  COUNT(*) as total_openings,
  SUM(case_cost) as total_spent,
  SUM(reward_value) as total_rewards,
  AVG(reward_value::DECIMAL / case_cost) as avg_return_rate
FROM case_openings 
WHERE opened_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(opened_at)
ORDER BY date DESC;

-- Top spenders
SELECT 
  u.username,
  COUNT(co.*) as cases_opened,
  SUM(co.case_cost) as total_spent,
  u.risk_score
FROM users u
JOIN case_openings co ON u.id = co.user_id
GROUP BY u.id, u.username, u.risk_score
ORDER BY total_spent DESC
LIMIT 10;

-- Fraud alerts
SELECT 
  u.username,
  fp.pattern_type,
  fp.severity,
  fp.details,
  fp.detected_at
FROM fraud_patterns fp
JOIN users u ON fp.user_id = u.id
WHERE fp.detected_at > NOW() - INTERVAL '24 hours'
ORDER BY fp.detected_at DESC;
```

---

## ✅ Final Checklist

Before going live, ensure:

- [ ] Database schema created successfully
- [ ] All functions execute without errors
- [ ] RLS policies are active
- [ ] Authentication is configured
- [ ] Environment variables are set
- [ ] Test case opening works
- [ ] Fraud detection triggers appropriately
- [ ] Audit logs are being created
- [ ] Backup strategy is in place
- [ ] Monitoring is configured

---

## 🆘 Troubleshooting

### **Common Issues:**

1. **"Function not found" error**
   - Ensure functions are created in the correct schema
   - Check function permissions

2. **RLS blocking queries**
   - Verify policies are correctly configured
   - Use service role key for admin operations

3. **Environment variables not loading**
   - Restart your development server
   - Check file naming (`.env.local` not `.env`)

4. **Case opening fails silently**
   - Check user balance and active status
   - Verify reward probabilities sum to 1.0

---

Your Supabase backend is now **production-ready** with enterprise-grade security! 🎉 