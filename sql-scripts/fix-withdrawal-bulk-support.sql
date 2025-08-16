-- 🔧 Fix Withdrawal System for Bulk Credit Withdrawals
-- This script removes the NOT NULL constraint on case_opening_id to support bulk withdrawals

-- Step 1: Remove the foreign key constraint temporarily
ALTER TABLE withdrawal_requests 
DROP CONSTRAINT IF EXISTS fk_withdrawal_case_opening;

-- Step 2: Make case_opening_id nullable
ALTER TABLE withdrawal_requests 
ALTER COLUMN case_opening_id DROP NOT NULL;

-- Step 3: Re-add the foreign key constraint but allow NULL values
ALTER TABLE withdrawal_requests 
ADD CONSTRAINT fk_withdrawal_case_opening 
FOREIGN KEY (case_opening_id) REFERENCES case_openings(id) ON DELETE CASCADE;

-- Step 3.5: Update withdrawal_type constraint to include 'ada' if needed
-- First, try to drop any existing withdrawal_type check constraints
DO $$
DECLARE
    constraint_name text;
BEGIN
    -- Find and drop existing withdrawal_type constraints
    FOR constraint_name IN 
        SELECT tc.constraint_name
        FROM information_schema.table_constraints tc
        WHERE tc.table_name = 'withdrawal_requests' 
        AND tc.constraint_type = 'CHECK'
        AND tc.constraint_name LIKE '%withdrawal_type%'
    LOOP
        EXECUTE 'ALTER TABLE withdrawal_requests DROP CONSTRAINT IF EXISTS ' || constraint_name;
    END LOOP;
    
    -- Add the new constraint that includes 'ada'
    ALTER TABLE withdrawal_requests 
    ADD CONSTRAINT withdrawal_requests_withdrawal_type_check 
    CHECK (withdrawal_type IN ('credits', 'nft', 'cash', 'ada'));
    
EXCEPTION
    WHEN OTHERS THEN
        -- If there's any error, just try to add the constraint anyway
        BEGIN
            ALTER TABLE withdrawal_requests 
            ADD CONSTRAINT withdrawal_requests_withdrawal_type_check 
            CHECK (withdrawal_type IN ('credits', 'nft', 'cash', 'ada'));
        EXCEPTION
            WHEN duplicate_object THEN
                -- Constraint already exists, ignore
                NULL;
            WHEN OTHERS THEN
                -- Log the error but continue
                RAISE NOTICE 'Could not update withdrawal_type constraint: %', SQLERRM;
        END;
END $$;

-- Step 4: Update the admin view to handle NULL case_opening_id
DROP VIEW IF EXISTS admin_withdrawal_requests;

-- First, let's check what columns actually exist in case_openings table
DO $$
DECLARE
    has_credits_won boolean := FALSE;
    has_reward_value boolean := FALSE;
    has_symbol_value boolean := FALSE;
BEGIN
    -- Check if credits_won column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'case_openings' AND column_name = 'credits_won'
    ) INTO has_credits_won;
    
    -- Check if reward_value column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'case_openings' AND column_name = 'reward_value'
    ) INTO has_reward_value;
    
    -- Check if symbol_value column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'case_openings' AND column_name = 'symbol_value'
    ) INTO has_symbol_value;
    
    -- Create view based on available columns
    IF has_credits_won THEN
        EXECUTE 'CREATE OR REPLACE VIEW admin_withdrawal_requests AS
        SELECT 
          wr.*,
          u.wallet_address as user_wallet,
          u.created_at as user_joined_date,
          COALESCE(co.created_at, wr.created_at) as case_opened_date,
          COALESCE(co.credits_won, wr.credits_requested) as credits_won,
          ' || CASE WHEN has_symbol_value THEN 'co.symbol_value' ELSE 'NULL::decimal as symbol_value' END || ',
          CASE 
            WHEN wr.case_opening_id IS NULL THEN ''Bulk Credit Withdrawal''
            ELSE ''Item-Specific Withdrawal''
          END as withdrawal_category
        FROM withdrawal_requests wr
        JOIN users u ON wr.user_id = u.id
        LEFT JOIN case_openings co ON wr.case_opening_id = co.id
        ORDER BY wr.created_at DESC';
    ELSIF has_reward_value THEN
        EXECUTE 'CREATE OR REPLACE VIEW admin_withdrawal_requests AS
        SELECT 
          wr.*,
          u.wallet_address as user_wallet,
          u.created_at as user_joined_date,
          COALESCE(co.created_at, wr.created_at) as case_opened_date,
          COALESCE(co.reward_value, wr.credits_requested) as credits_won,
          ' || CASE WHEN has_symbol_value THEN 'co.symbol_value' ELSE 'NULL::decimal as symbol_value' END || ',
          CASE 
            WHEN wr.case_opening_id IS NULL THEN ''Bulk Credit Withdrawal''
            ELSE ''Item-Specific Withdrawal''
          END as withdrawal_category
        FROM withdrawal_requests wr
        JOIN users u ON wr.user_id = u.id
        LEFT JOIN case_openings co ON wr.case_opening_id = co.id
        ORDER BY wr.created_at DESC';
    ELSE
        -- No credits column found, use withdrawal request amount
        EXECUTE 'CREATE OR REPLACE VIEW admin_withdrawal_requests AS
        SELECT 
          wr.*,
          u.wallet_address as user_wallet,
          u.created_at as user_joined_date,
          COALESCE(co.created_at, wr.created_at) as case_opened_date,
          wr.credits_requested as credits_won,
          NULL::decimal as symbol_value,
          CASE 
            WHEN wr.case_opening_id IS NULL THEN ''Bulk Credit Withdrawal''
            ELSE ''Item-Specific Withdrawal''
          END as withdrawal_category
        FROM withdrawal_requests wr
        JOIN users u ON wr.user_id = u.id
        LEFT JOIN case_openings co ON wr.case_opening_id = co.id
        ORDER BY wr.created_at DESC';
    END IF;
    
    RAISE NOTICE 'Admin view created successfully. Credits column found: %, Reward column found: %, Symbol value found: %', 
        has_credits_won, has_reward_value, has_symbol_value;
END $$;

-- Step 5: Update RLS policy to allow bulk withdrawals
DROP POLICY IF EXISTS "Users can create withdrawal requests" ON withdrawal_requests;

CREATE POLICY "Users can create withdrawal requests" ON withdrawal_requests
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    (
      case_opening_id IS NULL OR  -- Allow bulk withdrawals
      EXISTS (
        SELECT 1 FROM case_openings 
        WHERE id = case_opening_id AND user_id = auth.uid()
      )
    )
  );

-- Step 6: Add a helpful comment
COMMENT ON COLUMN withdrawal_requests.case_opening_id IS 'References a specific case opening. NULL for bulk credit withdrawals.';

-- Verification query (optional - run this to check the changes)
-- SELECT 
--   column_name, 
--   is_nullable, 
--   data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'withdrawal_requests' 
--   AND column_name = 'case_opening_id';
