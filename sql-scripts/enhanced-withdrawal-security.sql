-- 🔐 Enhanced Withdrawal Security System
-- This creates fraud detection and detailed tracking

-- First, let's clean up unused minting-related columns
-- (You can review and run these one by one)

-- Remove unused NFT/minting columns from case_openings if they exist
-- ALTER TABLE case_openings DROP COLUMN IF EXISTS nft_token_id;
-- ALTER TABLE case_openings DROP COLUMN IF EXISTS nft_contract_address;
-- ALTER TABLE case_openings DROP COLUMN IF EXISTS opensea_url;

-- Remove unused user_inventory table if it exists and isn't used
-- DROP TABLE IF EXISTS user_inventory;

-- Create enhanced withdrawal_requests table with fraud detection
CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  case_opening_id UUID NOT NULL,
  
  -- Basic withdrawal info
  withdrawal_type VARCHAR(50) NOT NULL CHECK (withdrawal_type IN ('credits', 'cash')),
  payment_method VARCHAR(100) DEFAULT 'manual',
  payment_details TEXT,
  wallet_address TEXT,
  
  -- Credit tracking
  credits_requested INTEGER NOT NULL,
  credits_value_usd DECIMAL(10,2) GENERATED ALWAYS AS (credits_requested * 0.01) STORED,
  
  -- Item info
  symbol_key VARCHAR(100),
  symbol_name VARCHAR(255),
  symbol_rarity VARCHAR(50),
  
  -- Security & fraud detection
  user_lifetime_purchased_credits INTEGER DEFAULT 0,
  user_lifetime_withdrawn_credits INTEGER DEFAULT 0,
  withdrawal_ratio DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE 
      WHEN user_lifetime_purchased_credits > 0 
      THEN (user_lifetime_withdrawn_credits + credits_requested)::DECIMAL / user_lifetime_purchased_credits 
      ELSE 999.99 
    END
  ) STORED,
  
  -- Risk flags
  is_suspicious BOOLEAN DEFAULT FALSE,
  risk_score INTEGER DEFAULT 0,
  risk_reasons TEXT[],
  
  -- Status tracking
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled', 'flagged')),
  admin_notes TEXT,
  processed_by VARCHAR(255),
  processed_at TIMESTAMP WITH TIME ZONE,
  payment_tx_hash TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Foreign key constraints
  CONSTRAINT fk_withdrawal_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_withdrawal_case_opening FOREIGN KEY (case_opening_id) REFERENCES case_openings(id) ON DELETE CASCADE
);

-- Add withdrawal tracking to case_openings
ALTER TABLE case_openings 
ADD COLUMN IF NOT EXISTS withdrawal_requested BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS withdrawal_request_id UUID,
ADD CONSTRAINT fk_case_opening_withdrawal_request 
  FOREIGN KEY (withdrawal_request_id) REFERENCES withdrawal_requests(id) ON DELETE SET NULL;

-- Create credit_flow_tracking table for detailed audit trail
CREATE TABLE IF NOT EXISTS credit_flow_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  
  -- Transaction details
  transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('purchase', 'case_win', 'withdrawal_request', 'withdrawal_complete', 'withdrawal_cancel')),
  credits_change INTEGER NOT NULL, -- Positive for gains, negative for deductions
  credits_before INTEGER NOT NULL,
  credits_after INTEGER NOT NULL,
  
  -- Related records
  case_opening_id UUID,
  withdrawal_request_id UUID,
  credit_transaction_id UUID,
  
  -- Context
  description TEXT,
  metadata JSONB,
  
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Foreign keys
  CONSTRAINT fk_credit_flow_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_credit_flow_case FOREIGN KEY (case_opening_id) REFERENCES case_openings(id) ON DELETE SET NULL,
  CONSTRAINT fk_credit_flow_withdrawal FOREIGN KEY (withdrawal_request_id) REFERENCES withdrawal_requests(id) ON DELETE SET NULL,
  CONSTRAINT fk_credit_flow_transaction FOREIGN KEY (credit_transaction_id) REFERENCES credit_transactions(id) ON DELETE SET NULL
);

-- Create fraud detection function
CREATE OR REPLACE FUNCTION calculate_risk_score(
  p_user_id UUID,
  p_credits_requested INTEGER,
  p_user_lifetime_purchased INTEGER,
  p_user_lifetime_withdrawn INTEGER
) RETURNS TABLE(risk_score INTEGER, risk_reasons TEXT[], is_suspicious BOOLEAN) AS $$
DECLARE
  score INTEGER := 0;
  reasons TEXT[] := ARRAY[]::TEXT[];
  suspicious BOOLEAN := FALSE;
  withdrawal_ratio DECIMAL;
  recent_withdrawals INTEGER;
  account_age_days INTEGER;
BEGIN
  -- Calculate withdrawal ratio
  IF p_user_lifetime_purchased > 0 THEN
    withdrawal_ratio := (p_user_lifetime_withdrawn + p_credits_requested)::DECIMAL / p_user_lifetime_purchased;
  ELSE
    withdrawal_ratio := 999.99;
  END IF;
  
  -- Risk Factor 1: High withdrawal ratio (withdrawing more than purchased)
  IF withdrawal_ratio > 1.5 THEN
    score := score + 50;
    reasons := array_append(reasons, 'Withdrawal ratio exceeds 150% of purchases');
    suspicious := TRUE;
  ELSIF withdrawal_ratio > 1.0 THEN
    score := score + 30;
    reasons := array_append(reasons, 'Withdrawal ratio exceeds 100% of purchases');
  ELSIF withdrawal_ratio > 0.8 THEN
    score := score + 10;
    reasons := array_append(reasons, 'High withdrawal ratio (>80%)');
  END IF;
  
  -- Risk Factor 2: Never purchased credits but trying to withdraw
  IF p_user_lifetime_purchased = 0 AND p_credits_requested > 500 THEN
    score := score + 75;
    reasons := array_append(reasons, 'No credit purchases but large withdrawal request');
    suspicious := TRUE;
  END IF;
  
  -- Risk Factor 3: Account age
  SELECT DATE_PART('day', NOW() - created_at) INTO account_age_days
  FROM users WHERE id = p_user_id;
  
  IF account_age_days < 1 THEN
    score := score + 20;
    reasons := array_append(reasons, 'New account (<1 day old)');
  ELSIF account_age_days < 7 THEN
    score := score + 10;
    reasons := array_append(reasons, 'Young account (<1 week old)');
  END IF;
  
  -- Risk Factor 4: Recent withdrawal frequency
  SELECT COUNT(*) INTO recent_withdrawals
  FROM withdrawal_requests 
  WHERE user_id = p_user_id 
    AND created_at > NOW() - INTERVAL '24 hours'
    AND status IN ('pending', 'processing', 'completed');
    
  IF recent_withdrawals >= 3 THEN
    score := score + 25;
    reasons := array_append(reasons, 'Multiple withdrawals in 24h');
  ELSIF recent_withdrawals >= 2 THEN
    score := score + 10;
    reasons := array_append(reasons, 'Multiple withdrawals recently');
  END IF;
  
  -- Risk Factor 5: Large single withdrawal
  IF p_credits_requested > 5000 THEN
    score := score + 15;
    reasons := array_append(reasons, 'Large withdrawal amount (>$50)');
  ELSIF p_credits_requested > 2000 THEN
    score := score + 5;
    reasons := array_append(reasons, 'Moderate withdrawal amount (>$20)');
  END IF;
  
  -- Mark as suspicious if score is high
  IF score >= 75 THEN
    suspicious := TRUE;
  END IF;
  
  RETURN QUERY SELECT score, reasons, suspicious;
END;
$$ LANGUAGE plpgsql;

-- Create comprehensive admin view for monitoring
CREATE OR REPLACE VIEW admin_fraud_detection_dashboard AS
SELECT 
  wr.*,
  u.wallet_address as user_wallet,
  u.created_at as user_joined_date,
  u.credits as current_user_credits,
  
  -- Credit purchase history
  COALESCE(ct_summary.total_purchased, 0) as lifetime_purchased_credits,
  COALESCE(ct_summary.total_spent_ada, 0) as lifetime_spent_ada,
  COALESCE(ct_summary.purchase_count, 0) as total_purchases,
  
  -- Withdrawal history  
  COALESCE(wr_summary.total_withdrawn, 0) as lifetime_withdrawn_credits,
  COALESCE(wr_summary.withdrawal_count, 0) as total_withdrawals,
  
  -- Risk analysis
  CASE 
    WHEN wr.is_suspicious THEN '🚨 SUSPICIOUS'
    WHEN wr.risk_score >= 50 THEN '⚠️ HIGH RISK'
    WHEN wr.risk_score >= 25 THEN '⚡ MEDIUM RISK'
    ELSE '✅ LOW RISK'
  END as risk_level,
  
  -- Case opening context
  co.created_at as case_opened_date,
  co.reward_value,
  co.symbol_key,
  
  -- Timing analysis
  EXTRACT(EPOCH FROM (wr.created_at - u.created_at))/3600 as hours_since_signup,
  EXTRACT(EPOCH FROM (wr.created_at - co.created_at))/60 as minutes_since_case_win

FROM withdrawal_requests wr
JOIN users u ON wr.user_id = u.id
JOIN case_openings co ON wr.case_opening_id = co.id

-- Purchase summary
LEFT JOIN (
  SELECT 
    user_id,
    SUM(credits_purchased) as total_purchased,
    SUM(ada_spent) as total_spent_ada,
    COUNT(*) as purchase_count
  FROM credit_transactions 
  WHERE transaction_type = 'purchase'
  GROUP BY user_id
) ct_summary ON u.id = ct_summary.user_id

-- Withdrawal summary  
LEFT JOIN (
  SELECT 
    user_id,
    SUM(credits_requested) as total_withdrawn,
    COUNT(*) as withdrawal_count
  FROM withdrawal_requests 
  WHERE status = 'completed'
  GROUP BY user_id
) wr_summary ON u.id = wr_summary.user_id

ORDER BY wr.risk_score DESC, wr.created_at DESC;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user_id ON withdrawal_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests(status);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_risk_score ON withdrawal_requests(risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_is_suspicious ON withdrawal_requests(is_suspicious);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_created_at ON withdrawal_requests(created_at);

CREATE INDEX IF NOT EXISTS idx_credit_flow_user_id ON credit_flow_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_flow_transaction_type ON credit_flow_tracking(transaction_type);
CREATE INDEX IF NOT EXISTS idx_credit_flow_created_at ON credit_flow_tracking(created_at);

-- Create trigger to update user credit totals when new purchases happen
CREATE OR REPLACE FUNCTION update_user_credit_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Update user's lifetime purchased credits
  UPDATE users SET 
    total_credits_purchased = COALESCE((
      SELECT SUM(credits_purchased) 
      FROM credit_transactions 
      WHERE user_id = NEW.user_id AND transaction_type = 'purchase'
    ), 0)
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add columns to users table for tracking
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS total_credits_purchased INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_credits_withdrawn INTEGER DEFAULT 0;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_credit_totals ON credit_transactions;
CREATE TRIGGER trigger_update_credit_totals
  AFTER INSERT ON credit_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_credit_totals();

-- Create RLS policies
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_flow_tracking ENABLE ROW LEVEL SECURITY;

-- Users can only see their own withdrawal requests
CREATE POLICY "Users can view own withdrawal requests" ON withdrawal_requests
  FOR SELECT USING (user_id = auth.uid());

-- Users can create withdrawal requests for their own case openings
CREATE POLICY "Users can create withdrawal requests" ON withdrawal_requests
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM case_openings 
      WHERE id = case_opening_id AND user_id = auth.uid()
    )
  );

-- Users can see their own credit flow
CREATE POLICY "Users can view own credit flow" ON credit_flow_tracking
  FOR SELECT USING (user_id = auth.uid());

-- Grant access to admin views
GRANT SELECT ON admin_fraud_detection_dashboard TO authenticated;
GRANT SELECT ON credit_flow_tracking TO authenticated;

-- Comments for documentation
COMMENT ON TABLE withdrawal_requests IS 'Enhanced withdrawal requests with fraud detection';
COMMENT ON COLUMN withdrawal_requests.risk_score IS 'Calculated risk score 0-100+ (higher = riskier)';
COMMENT ON COLUMN withdrawal_requests.withdrawal_ratio IS 'Ratio of total withdrawals to total purchases';
COMMENT ON COLUMN withdrawal_requests.is_suspicious IS 'Auto-flagged as suspicious for manual review';

COMMENT ON TABLE credit_flow_tracking IS 'Detailed audit trail of all credit movements';
COMMENT ON VIEW admin_fraud_detection_dashboard IS 'Comprehensive fraud detection dashboard for admins';
