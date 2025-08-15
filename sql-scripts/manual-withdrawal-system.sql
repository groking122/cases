-- Manual Withdrawal System Database Setup
-- Run this SQL script in your Supabase database

-- Create withdrawal_requests table
CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  case_opening_id UUID NOT NULL,
  withdrawal_type VARCHAR(50) NOT NULL CHECK (withdrawal_type IN ('credits', 'nft', 'cash')),
  payment_method VARCHAR(100) DEFAULT 'manual',
  payment_details TEXT,
  wallet_address TEXT,
  amount INTEGER NOT NULL,
  symbol_key VARCHAR(100),
  symbol_name VARCHAR(255),
  symbol_rarity VARCHAR(50),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
  admin_notes TEXT,
  processed_by VARCHAR(255),
  processed_at TIMESTAMP WITH TIME ZONE,
  payment_tx_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Foreign key constraints
  CONSTRAINT fk_withdrawal_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_withdrawal_case_opening FOREIGN KEY (case_opening_id) REFERENCES case_openings(id) ON DELETE CASCADE
);

-- Add withdrawal tracking columns to case_openings table
ALTER TABLE case_openings 
ADD COLUMN IF NOT EXISTS withdrawal_requested BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS withdrawal_request_id UUID,
ADD CONSTRAINT fk_case_opening_withdrawal_request 
  FOREIGN KEY (withdrawal_request_id) REFERENCES withdrawal_requests(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user_id ON withdrawal_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests(status);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_created_at ON withdrawal_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_case_openings_withdrawal_requested ON case_openings(withdrawal_requested);

-- Create RLS policies for security
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;

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

-- Admin can view and update all withdrawal requests
CREATE POLICY "Admin can manage all withdrawal requests" ON withdrawal_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Create a view for admin dashboard
CREATE OR REPLACE VIEW admin_withdrawal_requests AS
SELECT 
  wr.*,
  u.wallet_address as user_wallet,
  u.created_at as user_joined_date,
  co.created_at as case_opened_date,
  co.credits_won,
  co.symbol_value
FROM withdrawal_requests wr
JOIN users u ON wr.user_id = u.id
JOIN case_openings co ON wr.case_opening_id = co.id
ORDER BY wr.created_at DESC;

-- Grant access to admin view
GRANT SELECT ON admin_withdrawal_requests TO authenticated;

COMMENT ON TABLE withdrawal_requests IS 'Manual withdrawal requests for credits and NFTs';
COMMENT ON COLUMN withdrawal_requests.payment_method IS 'PayPal, Bank Transfer, Crypto, etc.';
COMMENT ON COLUMN withdrawal_requests.payment_details IS 'PayPal email, bank account, crypto address, etc.';
COMMENT ON COLUMN withdrawal_requests.status IS 'pending, processing, completed, cancelled';
