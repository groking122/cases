-- 🔍 PRE-SECURITY SYSTEM CHECK
-- Run this first to see what tables/columns exist and what we need to add

-- Check if main tables exist
SELECT 'Table exists:' as check_type, table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('users', 'case_openings', 'credit_transactions', 'withdrawal_requests')
ORDER BY table_name;

-- Check case_openings structure
SELECT 'case_openings columns:' as check_type, column_name, data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'case_openings'
ORDER BY ordinal_position;

-- Check users structure  
SELECT 'users columns:' as check_type, column_name, data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'users'
ORDER BY ordinal_position;

-- Check credit_transactions structure
SELECT 'credit_transactions columns:' as check_type, column_name, data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'credit_transactions'
ORDER BY ordinal_position;

-- Check if withdrawal_requests already exists
SELECT 'withdrawal_requests exists:' as check_type, 
       CASE WHEN EXISTS (
         SELECT 1 FROM information_schema.tables 
         WHERE table_schema = 'public' AND table_name = 'withdrawal_requests'
       ) THEN 'YES' ELSE 'NO' END as result;

-- Check if we have any minting-related tables that can be cleaned up
SELECT 'Potential cleanup tables:' as check_type, table_name
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND (table_name LIKE '%nft%' 
    OR table_name LIKE '%mint%' 
    OR table_name = 'user_inventory'
    OR table_name LIKE '%inventory%')
ORDER BY table_name;
