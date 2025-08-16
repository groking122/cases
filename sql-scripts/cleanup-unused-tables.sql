-- 🧹 DATABASE CLEANUP SCRIPT
-- This script removes unused/redundant tables from your schema
-- WARNING: This will permanently delete data. Make a backup first!

-- Step 1: Check if tables exist and show their row counts
DO $$
DECLARE
    rec RECORD;
    table_count INTEGER;
BEGIN
    RAISE NOTICE '📊 CHECKING UNUSED TABLES:';
    RAISE NOTICE '================================';
    
    -- Check each potentially unused table
    FOR rec IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('outcomes', 'security_logs', 'config_audit_log')
    LOOP
        EXECUTE format('SELECT COUNT(*) FROM %I', rec.table_name) INTO table_count;
        RAISE NOTICE '📋 Table: % - Rows: %', rec.table_name, table_count;
    END LOOP;
    
    RAISE NOTICE '================================';
END $$;

-- Step 2: Drop unused tables (uncomment to execute)
/*
-- ❌ Drop outcomes table (not used anywhere)
DROP TABLE IF EXISTS outcomes CASCADE;

-- ❌ Drop security_logs table (not used anywhere) 
DROP TABLE IF EXISTS security_logs CASCADE;

-- ❌ Drop config_audit_log table (not used anywhere)
DROP TABLE IF EXISTS config_audit_log CASCADE;
*/

-- Step 3: OPTIONAL - Legacy table cleanup
-- These tables are still referenced but could be phased out:

/*
-- 🤔 OPTIONAL: Drop reward_config (legacy - replaced by symbols table)
-- WARNING: This will break configLoader.js until you update it
-- DROP TABLE IF EXISTS reward_config CASCADE;

-- 🤔 OPTIONAL: Drop skins table (mostly unused - only in withdraw API)
-- WARNING: Check withdraw API route first
-- DROP TABLE IF EXISTS skins CASCADE;
*/

-- Step 4: Verify cleanup
DO $$
DECLARE
    rec RECORD;
BEGIN
    RAISE NOTICE '✅ REMAINING TABLES:';
    RAISE NOTICE '================================';
    
    FOR rec IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
    LOOP
        RAISE NOTICE '📋 %', rec.table_name;
    END LOOP;
    
    RAISE NOTICE '================================';
    RAISE NOTICE '🎉 Cleanup complete!';
END $$;

-- Comments for documentation
COMMENT ON SCRIPT IS 'Removes unused tables: outcomes, security_logs, config_audit_log';
