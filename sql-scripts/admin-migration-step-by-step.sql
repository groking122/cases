-- =====================================================
-- ADMIN DASHBOARD MIGRATION - STEP BY STEP
-- Run this in multiple phases to avoid column reference errors
-- =====================================================

-- =====================================================
-- PHASE 1: INSPECT DATABASE (RUN THIS FIRST)
-- =====================================================

DO $$
DECLARE
    rec RECORD;
BEGIN
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'DATABASE INSPECTION REPORT';
    RAISE NOTICE '===========================================';
    
    -- Show all existing tables
    RAISE NOTICE 'Existing tables:';
    FOR rec IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
    LOOP
        RAISE NOTICE '  📋 %', rec.table_name;
    END LOOP;
    
    RAISE NOTICE '';
    
    -- Show cases table structure if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cases') THEN
        RAISE NOTICE 'CASES TABLE STRUCTURE:';
        FOR rec IN 
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'cases' 
            ORDER BY ordinal_position
        LOOP
            RAISE NOTICE '  • % (%)', rec.column_name, rec.data_type;
        END LOOP;
    ELSE
        RAISE NOTICE 'CASES TABLE: Does not exist';
    END IF;
    
    RAISE NOTICE '';
    
    -- Show skins/rewards table structure
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'skins') THEN
        RAISE NOTICE 'SKINS TABLE STRUCTURE:';
        FOR rec IN 
            SELECT column_name, data_type
            FROM information_schema.columns 
            WHERE table_name = 'skins' 
            ORDER BY ordinal_position
        LOOP
            RAISE NOTICE '  • % (%)', rec.column_name, rec.data_type;
        END LOOP;
    ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rewards') THEN
        RAISE NOTICE 'REWARDS TABLE STRUCTURE:';
        FOR rec IN 
            SELECT column_name, data_type
            FROM information_schema.columns 
            WHERE table_name = 'rewards' 
            ORDER BY ordinal_position
        LOOP
            RAISE NOTICE '  • % (%)', rec.column_name, rec.data_type;
        END LOOP;
    ELSE
        RAISE NOTICE 'SKINS/REWARDS TABLES: None found';
    END IF;
    
    RAISE NOTICE '===========================================';
    RAISE NOTICE '👆 REVIEW THE ABOVE, THEN RUN PHASE 2';
    RAISE NOTICE '===========================================';
END $$;