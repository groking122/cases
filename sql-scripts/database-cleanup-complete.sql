-- 🧹 COMPLETE DATABASE CLEANUP SCRIPT
-- This removes ALL unnecessary tables and columns from your database
-- ⚠️ WARNING: This will permanently delete data. Make a backup first!

-- Step 1: Show what will be removed
DO $$
DECLARE
    rec RECORD;
    table_count INTEGER;
BEGIN
    RAISE NOTICE '🗑️  TABLES TO BE REMOVED:';
    RAISE NOTICE '================================';
    
    -- Check unused tables
    FOR rec IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('outcomes', 'security_logs', 'config_audit_log', 'reward_config', 'skins')
    LOOP
        BEGIN
            EXECUTE format('SELECT COUNT(*) FROM %I', rec.table_name) INTO table_count;
            RAISE NOTICE '📋 % - Rows: %', rec.table_name, table_count;
        EXCEPTION
            WHEN undefined_table THEN
                RAISE NOTICE '📋 % - Does not exist', rec.table_name;
        END;
    END LOOP;
    
    RAISE NOTICE '================================';
END $$;

-- Step 2: Remove unused tables and cleanup
DO $$
BEGIN
    RAISE NOTICE '🗑️  REMOVING UNUSED TABLES...';
    
    -- Drop outcomes table (completely unused)
    DROP TABLE IF EXISTS outcomes CASCADE;
    RAISE NOTICE '✅ Removed: outcomes';
    
    -- Drop security_logs table (completely unused)
    DROP TABLE IF EXISTS security_logs CASCADE;
    RAISE NOTICE '✅ Removed: security_logs';
    
    -- Drop config_audit_log table (completely unused)
    DROP TABLE IF EXISTS config_audit_log CASCADE;
    RAISE NOTICE '✅ Removed: config_audit_log';
    
    -- Drop reward_config table (legacy - replaced by symbols)
    DROP TABLE IF EXISTS reward_config CASCADE;
    RAISE NOTICE '✅ Removed: reward_config (legacy)';
    
    -- Drop skins table (minimal usage - replaced by symbols)
    DROP TABLE IF EXISTS skins CASCADE;
    RAISE NOTICE '✅ Removed: skins (replaced by symbols)';
    
    RAISE NOTICE '🧹 CLEANING UP COLUMNS...';
    
    -- Clean up case_openings table - remove NFT columns if they exist
    ALTER TABLE case_openings 
      DROP COLUMN IF EXISTS nft_token_id,
      DROP COLUMN IF EXISTS nft_contract_address,
      DROP COLUMN IF EXISTS opensea_url,
      DROP COLUMN IF EXISTS skin_id;
    
    RAISE NOTICE '✅ Cleaned: case_openings (removed NFT columns)';
    
    -- Clean up users table - remove unused columns
    ALTER TABLE users 
      DROP COLUMN IF EXISTS balance,
      DROP COLUMN IF EXISTS last_case_opened,
      DROP COLUMN IF EXISTS skin_count;
    
    RAISE NOTICE '✅ Cleaned: users (removed unused columns)';
    
    RAISE NOTICE '🗑️  REMOVING UNUSED INDEXES...';
    
    -- Remove unused indexes
    DROP INDEX IF EXISTS idx_outcomes_case_id;
    DROP INDEX IF EXISTS idx_security_logs_user_id;
    DROP INDEX IF EXISTS idx_security_logs_event_type;
    DROP INDEX IF EXISTS idx_skins_case_id;
    DROP INDEX IF EXISTS idx_skins_rarity;
    DROP INDEX IF EXISTS idx_reward_config_key;
    
    RAISE NOTICE '✅ Removed: unused indexes';
    
    -- Clean up sequences for deleted tables
    DROP SEQUENCE IF EXISTS config_audit_log_id_seq CASCADE;
    RAISE NOTICE '✅ Removed: unused sequences';
END $$;

-- Step 6: Verify final state
DO $$
DECLARE
    rec RECORD;
    table_count INTEGER;
BEGIN
    RAISE NOTICE '📊 FINAL DATABASE STATE:';
    RAISE NOTICE '================================';
    
    FOR rec IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
    LOOP
        EXECUTE format('SELECT COUNT(*) FROM %I', rec.table_name) INTO table_count;
        RAISE NOTICE '📋 % - Rows: %', rec.table_name, table_count;
    END LOOP;
    
    RAISE NOTICE '================================';
    RAISE NOTICE '🎉 DATABASE CLEANUP COMPLETE!';
    RAISE NOTICE '';
    RAISE NOTICE '✅ REMOVED TABLES:';
    RAISE NOTICE '  - outcomes (unused)';
    RAISE NOTICE '  - security_logs (unused)';
    RAISE NOTICE '  - config_audit_log (unused)';
    RAISE NOTICE '  - reward_config (legacy)';
    RAISE NOTICE '  - skins (replaced by symbols)';
    RAISE NOTICE '';
    RAISE NOTICE '✅ CLEANED COLUMNS:';
    RAISE NOTICE '  - case_openings: removed NFT columns';
    RAISE NOTICE '  - users: removed unused columns';
    RAISE NOTICE '';
    RAISE NOTICE '🏁 Your database is now optimized!';
END $$;
