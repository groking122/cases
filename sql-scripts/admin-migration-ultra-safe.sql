-- =====================================================
-- ADMIN DASHBOARD MIGRATION SCRIPT (ULTRA-SAFE)
-- Inspects your existing database structure and adapts accordingly
-- Handles any column name variations and missing columns
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 1. INSPECT EXISTING DATABASE STRUCTURE
-- =====================================================

DO $$
DECLARE
    rec RECORD;
BEGIN
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'INSPECTING EXISTING DATABASE STRUCTURE';
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
        RAISE NOTICE '  - %', rec.table_name;
    END LOOP;
    
    -- Show cases table structure if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cases') THEN
        RAISE NOTICE '';
        RAISE NOTICE 'Cases table columns:';
        FOR rec IN 
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'cases' 
            ORDER BY ordinal_position
        LOOP
            RAISE NOTICE '  - % (%)', rec.column_name, rec.data_type;
        END LOOP;
    END IF;
    
    -- Show skins table structure if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'skins') THEN
        RAISE NOTICE '';
        RAISE NOTICE 'Skins table columns:';
        FOR rec IN 
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'skins' 
            ORDER BY ordinal_position
        LOOP
            RAISE NOTICE '  - % (%)', rec.column_name, rec.data_type;
        END LOOP;
    END IF;
    
    -- Show rewards table structure if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rewards') THEN
        RAISE NOTICE '';
        RAISE NOTICE 'Rewards table columns:';
        FOR rec IN 
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'rewards' 
            ORDER BY ordinal_position
        LOOP
            RAISE NOTICE '  - % (%)', rec.column_name, rec.data_type;
        END LOOP;
    END IF;
    
    RAISE NOTICE '===========================================';
END $$;

-- =====================================================
-- 2. CREATE NEW ADMIN TABLES (ALWAYS SAFE)
-- =====================================================

-- Admin users table (completely new)
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'content_manager',
    permissions TEXT[] NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- Multi-factor authentication
    mfa_enabled BOOLEAN NOT NULL DEFAULT false,
    mfa_secret VARCHAR(255),
    
    -- Security tracking
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    last_login TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES admin_users(id),
    
    -- Constraints
    CONSTRAINT valid_role CHECK (role IN ('super_admin', 'admin', 'content_manager')),
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Admin token blacklist (completely new)
CREATE TABLE IF NOT EXISTS admin_token_blacklist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_hash VARCHAR(255) NOT NULL,
    admin_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Admin audit logs (completely new)
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action VARCHAR(100) NOT NULL,
    admin_id UUID NOT NULL REFERENCES admin_users(id),
    admin_email VARCHAR(255) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    target_id VARCHAR(255) NOT NULL,
    changes JSONB NOT NULL DEFAULT '{}',
    
    -- Security
    ip_address INET,
    user_agent TEXT,
    checksum VARCHAR(64) NOT NULL,
    
    -- Timestamp
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 3. SAFELY UPGRADE EXISTING CASES TABLE
-- =====================================================

DO $$ 
BEGIN
    RAISE NOTICE 'Upgrading cases table...';
    
    -- Add is_active column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'cases' AND column_name = 'is_active') THEN
        ALTER TABLE cases ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
        RAISE NOTICE '✅ Added is_active column to cases table';
    ELSE
        RAISE NOTICE '✅ is_active column already exists in cases table';
    END IF;
    
    -- Add metadata column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'cases' AND column_name = 'metadata') THEN
        ALTER TABLE cases ADD COLUMN metadata JSONB DEFAULT '{}';
        RAISE NOTICE '✅ Added metadata column to cases table';
    ELSE
        RAISE NOTICE '✅ metadata column already exists in cases table';
    END IF;
    
    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'cases' AND column_name = 'updated_at') THEN
        ALTER TABLE cases ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
        RAISE NOTICE '✅ Added updated_at column to cases table';
    ELSE
        RAISE NOTICE '✅ updated_at column already exists in cases table';
    END IF;
    
    -- Add admin tracking columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'cases' AND column_name = 'created_by') THEN
        ALTER TABLE cases ADD COLUMN created_by UUID REFERENCES admin_users(id);
        RAISE NOTICE '✅ Added created_by column to cases table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'cases' AND column_name = 'updated_by') THEN
        ALTER TABLE cases ADD COLUMN updated_by UUID REFERENCES admin_users(id);
        RAISE NOTICE '✅ Added updated_by column to cases table';
    END IF;
    
END $$;

-- =====================================================
-- 4. CREATE SYMBOLS TABLE (ALWAYS SAFE)
-- =====================================================

CREATE TABLE IF NOT EXISTS symbols (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image_url VARCHAR(500),
    rarity VARCHAR(50) NOT NULL,
    value DECIMAL(10,2) NOT NULL CHECK (value >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- Admin metadata
    metadata JSONB DEFAULT '{}',
    
    -- Tracking
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES admin_users(id),
    updated_by UUID REFERENCES admin_users(id),
    
    -- Constraints - support all rarity values
    CONSTRAINT valid_rarity CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'))
);

-- =====================================================
-- 5. CREATE CASE-SYMBOL RELATIONSHIPS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS case_symbols (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    symbol_id UUID NOT NULL REFERENCES symbols(id) ON DELETE CASCADE,
    weight DECIMAL(5,2) NOT NULL CHECK (weight >= 0 AND weight <= 100),
    
    -- Tracking
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES admin_users(id),
    
    -- Unique constraint
    UNIQUE(case_id, symbol_id)
);

-- =====================================================
-- 6. SMART DATA MIGRATION (COLUMN-AWARE)
-- =====================================================

DO $$
DECLARE
    skins_exists BOOLEAN := false;
    rewards_exists BOOLEAN := false;
    migrated_count INTEGER := 0;
    migration_sql TEXT;
BEGIN
    -- Check which tables exist
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'skins') INTO skins_exists;
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rewards') INTO rewards_exists;
    
    RAISE NOTICE 'Migration analysis: skins_exists=%, rewards_exists=%', skins_exists, rewards_exists;
    
    -- Only migrate if symbols table is empty
    IF NOT EXISTS (SELECT 1 FROM symbols LIMIT 1) THEN
        
        -- MIGRATE FROM SKINS TABLE (if it exists)
        IF skins_exists THEN
            RAISE NOTICE 'Attempting to migrate from skins table...';
            
            -- Build dynamic SQL based on available columns
            migration_sql := 'INSERT INTO symbols (';
            
            -- Always include these core columns
            migration_sql := migration_sql || 'id, name, rarity, is_active, created_at';
            
            -- Add optional columns if they exist
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skins' AND column_name = 'description') THEN
                migration_sql := migration_sql || ', description';
            END IF;
            
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skins' AND column_name = 'image_url') THEN
                migration_sql := migration_sql || ', image_url';
            END IF;
            
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skins' AND column_name = 'value') THEN
                migration_sql := migration_sql || ', value';
            ELSE
                migration_sql := migration_sql || ', value';  -- We'll provide default
            END IF;
            
            migration_sql := migration_sql || ', metadata) SELECT ';
            
            -- Core columns
            migration_sql := migration_sql || 'id, name, rarity, true, COALESCE(created_at, CURRENT_TIMESTAMP)';
            
            -- Optional columns with defaults
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skins' AND column_name = 'description') THEN
                migration_sql := migration_sql || ', COALESCE(description, '''')';
            ELSE
                migration_sql := migration_sql || ', ''''';
            END IF;
            
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skins' AND column_name = 'image_url') THEN
                migration_sql := migration_sql || ', COALESCE(image_url, '''')';
            ELSE
                migration_sql := migration_sql || ', ''/symbols/default.png''';
            END IF;
            
            -- Handle value column variations
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skins' AND column_name = 'value') THEN
                migration_sql := migration_sql || ', value';
            ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skins' AND column_name = 'price') THEN
                migration_sql := migration_sql || ', price';
            ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skins' AND column_name = 'credits') THEN
                migration_sql := migration_sql || ', credits';
            ELSE
                migration_sql := migration_sql || ', 10.00';  -- Default value
            END IF;
            
            -- Metadata with available fields
            migration_sql := migration_sql || ', json_build_object(';
            migration_sql := migration_sql || '''migrated_from'', ''skins''';
            
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skins' AND column_name = 'collection') THEN
                migration_sql := migration_sql || ', ''collection'', COALESCE(collection, '''')';
            END IF;
            
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skins' AND column_name = 'drop_rate') THEN
                migration_sql := migration_sql || ', ''original_drop_rate'', COALESCE(drop_rate, 0)';
            END IF;
            
            migration_sql := migration_sql || ')::jsonb FROM skins';
            
            -- Execute the dynamic migration
            EXECUTE migration_sql;
            GET DIAGNOSTICS migrated_count = ROW_COUNT;
            RAISE NOTICE '✅ Migrated % symbols from skins table', migrated_count;
            
        -- MIGRATE FROM REWARDS TABLE (if skins doesn't exist but rewards does)
        ELSIF rewards_exists THEN
            RAISE NOTICE 'Attempting to migrate from rewards table...';
            
            -- Build dynamic SQL for rewards
            migration_sql := 'INSERT INTO symbols (id, name, rarity, is_active, created_at';
            
            -- Add optional columns
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rewards' AND column_name = 'description') THEN
                migration_sql := migration_sql || ', description';
            END IF;
            
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rewards' AND column_name = 'image') THEN
                migration_sql := migration_sql || ', image_url';
            ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rewards' AND column_name = 'image_url') THEN
                migration_sql := migration_sql || ', image_url';
            END IF;
            
            migration_sql := migration_sql || ', value, metadata) SELECT id, name, rarity, COALESCE(is_active, true), COALESCE(created_at, CURRENT_TIMESTAMP)';
            
            -- Handle optional columns
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rewards' AND column_name = 'description') THEN
                migration_sql := migration_sql || ', COALESCE(description, '''')';
            ELSE
                migration_sql := migration_sql || ', ''''';
            END IF;
            
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rewards' AND column_name = 'image') THEN
                migration_sql := migration_sql || ', COALESCE(image, '''')';
            ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rewards' AND column_name = 'image_url') THEN
                migration_sql := migration_sql || ', COALESCE(image_url, '''')';
            ELSE
                migration_sql := migration_sql || ', ''/symbols/default.png''';
            END IF;
            
            migration_sql := migration_sql || ', value, json_build_object(''migrated_from'', ''rewards'')::jsonb FROM rewards';
            
            EXECUTE migration_sql;
            GET DIAGNOSTICS migrated_count = ROW_COUNT;
            RAISE NOTICE '✅ Migrated % symbols from rewards table', migrated_count;
            
        ELSE
            RAISE NOTICE 'No existing data tables found - will create sample data';
        END IF;
        
    ELSE
        RAISE NOTICE 'Symbols table already has data - skipping migration';
    END IF;
END $$;

-- =====================================================
-- 7. CREATE SAMPLE DATA IF NEEDED
-- =====================================================

DO $$
BEGIN
    -- Create sample symbols if none exist
    IF NOT EXISTS (SELECT 1 FROM symbols LIMIT 1) THEN
        RAISE NOTICE 'Creating sample symbols since no data was migrated...';
        
        INSERT INTO symbols (name, description, image_url, rarity, value, metadata) VALUES 
        ('Bronze Coin', 'Common currency symbol', '/symbols/common/bronze-coin.png', 'common', 10.00, '{"collection": "Currency", "sample_data": true}'),
        ('Silver Coin', 'Uncommon currency symbol', '/symbols/uncommon/silver-coin.png', 'uncommon', 25.00, '{"collection": "Currency", "sample_data": true}'),
        ('Gold Coin', 'Rare currency symbol', '/symbols/rare/gold-coin.png', 'rare', 50.00, '{"collection": "Currency", "sample_data": true}'),
        ('Diamond', 'Epic precious stone', '/symbols/epic/diamond.png', 'epic', 100.00, '{"collection": "Gems", "sample_data": true}'),
        ('Crown', 'Legendary royal symbol', '/symbols/legendary/crown.png', 'legendary', 500.00, '{"collection": "Royal", "sample_data": true}');
        
        RAISE NOTICE '✅ Created 5 sample symbols';
        
        -- If we have cases but no case-symbol relationships, create some
        IF EXISTS (SELECT 1 FROM cases LIMIT 1) AND NOT EXISTS (SELECT 1 FROM case_symbols LIMIT 1) THEN
            INSERT INTO case_symbols (case_id, symbol_id, weight)
            SELECT 
                c.id,
                s.id,
                CASE s.rarity
                    WHEN 'common' THEN 50.0
                    WHEN 'uncommon' THEN 30.0
                    WHEN 'rare' THEN 15.0
                    WHEN 'epic' THEN 4.0
                    WHEN 'legendary' THEN 1.0
                    ELSE 10.0
                END
            FROM cases c
            CROSS JOIN symbols s
            WHERE c.id = (SELECT id FROM cases LIMIT 1);  -- Just first case
            
            RAISE NOTICE '✅ Created sample case-symbol relationships';
        END IF;
    END IF;
    
    -- Update cases metadata if empty
    UPDATE cases 
    SET metadata = json_build_object(
        'totalOpenings', 0,
        'averageValue', 0,
        'lastModified', COALESCE(updated_at, created_at),
        'modifiedBy', 'system'
    )::jsonb
    WHERE metadata = '{}' OR metadata IS NULL;
    
END $$;

-- =====================================================
-- 8. CREATE INDEXES (ALWAYS SAFE)
-- =====================================================

-- Admin tables
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);
CREATE INDEX IF NOT EXISTS idx_admin_users_active ON admin_users(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_token_blacklist_hash ON admin_token_blacklist(token_hash);
CREATE INDEX IF NOT EXISTS idx_admin_token_blacklist_expires ON admin_token_blacklist(expires_at);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin ON admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action ON admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_timestamp ON admin_audit_logs(timestamp);

-- Enhanced tables
CREATE INDEX IF NOT EXISTS idx_cases_active ON cases(is_active);
CREATE INDEX IF NOT EXISTS idx_cases_price ON cases(price);
CREATE INDEX IF NOT EXISTS idx_symbols_rarity ON symbols(rarity);
CREATE INDEX IF NOT EXISTS idx_symbols_value ON symbols(value);
CREATE INDEX IF NOT EXISTS idx_symbols_active ON symbols(is_active);
CREATE INDEX IF NOT EXISTS idx_case_symbols_case ON case_symbols(case_id);
CREATE INDEX IF NOT EXISTS idx_case_symbols_symbol ON case_symbols(symbol_id);

-- =====================================================
-- 9. CREATE TRIGGERS AND FUNCTIONS
-- =====================================================

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DROP TRIGGER IF EXISTS update_admin_users_updated_at ON admin_users;
CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON admin_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_cases_updated_at ON cases;
CREATE TRIGGER update_cases_updated_at BEFORE UPDATE ON cases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_symbols_updated_at ON symbols;
CREATE TRIGGER update_symbols_updated_at BEFORE UPDATE ON symbols FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Lenient probability validation (warns instead of erroring during setup)
CREATE OR REPLACE FUNCTION validate_case_probabilities()
RETURNS TRIGGER AS $$
DECLARE
    total_weight DECIMAL(5,2);
BEGIN
    SELECT COALESCE(SUM(weight), 0) INTO total_weight
    FROM case_symbols
    WHERE case_id = COALESCE(NEW.case_id, OLD.case_id);
    
    IF total_weight > 0 AND ABS(total_weight - 100.00) > 0.1 THEN
        RAISE NOTICE 'Notice: Case % probabilities sum to %% (should be 100%%)', 
            COALESCE(NEW.case_id, OLD.case_id), total_weight;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_probabilities_trigger ON case_symbols;
CREATE TRIGGER validate_probabilities_trigger AFTER INSERT OR UPDATE OR DELETE ON case_symbols FOR EACH ROW EXECUTE FUNCTION validate_case_probabilities();

-- =====================================================
-- 10. CREATE ADMIN VIEW
-- =====================================================

CREATE OR REPLACE VIEW admin_dashboard_stats AS
SELECT
    (SELECT COUNT(*) FROM cases) as total_cases,
    (SELECT COUNT(*) FROM cases WHERE is_active = true) as active_cases,
    (SELECT COUNT(*) FROM symbols) as total_symbols,
    (SELECT COALESCE(COUNT(*), 0) FROM case_openings WHERE opened_at::date = CURRENT_DATE) as today_openings,
    (SELECT COALESCE(SUM(credits_spent), 0) FROM case_openings) as total_revenue,
    COALESCE((SELECT AVG(EXTRACT(EPOCH FROM (NOW() - opened_at))/60) FROM case_openings WHERE opened_at >= NOW() - INTERVAL '24 hours'), 0) as average_session_time,
    COALESCE((
        SELECT json_build_object('id', c.id, 'name', c.name, 'openings', COUNT(co.id))
        FROM cases c
        LEFT JOIN case_openings co ON c.id = co.case_id
        WHERE co.opened_at >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY c.id, c.name
        ORDER BY COUNT(co.id) DESC
        LIMIT 1
    ), json_build_object('id', null, 'name', 'No recent activity', 'openings', 0)) as top_performing_case;

-- =====================================================
-- 11. FINAL SUMMARY
-- =====================================================

DO $$
DECLARE
    admin_count INTEGER;
    case_count INTEGER;
    symbol_count INTEGER;
    case_symbol_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO admin_count FROM admin_users;
    SELECT COUNT(*) INTO case_count FROM cases;
    SELECT COUNT(*) INTO symbol_count FROM symbols;
    SELECT COUNT(*) INTO case_symbol_count FROM case_symbols;
    
    RAISE NOTICE '===========================================';
    RAISE NOTICE '🎉 ADMIN DASHBOARD MIGRATION COMPLETED!';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Tables created/upgraded:';
    RAISE NOTICE '  📦 Cases: % (with admin columns)', case_count;
    RAISE NOTICE '  💎 Symbols: % (migrated/created)', symbol_count;
    RAISE NOTICE '  🔗 Case-Symbol links: %', case_symbol_count;
    RAISE NOTICE '  👤 Admin users: % (create first one below)', admin_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. ⚠️  Create first admin user (uncomment SQL below)';
    RAISE NOTICE '2. 📦 Install: npm install jsonwebtoken bcryptjs';
    RAISE NOTICE '3. 🔑 Set: ADMIN_JWT_SECRET=your-secret-key';
    RAISE NOTICE '4. 🌐 Visit: /admin';
    RAISE NOTICE '===========================================';
END $$;

-- =====================================================
-- 12. CREATE YOUR FIRST ADMIN USER
-- =====================================================

/*
🚨 UNCOMMENT THIS SECTION TO CREATE YOUR FIRST ADMIN USER 🚨

INSERT INTO admin_users (
    email, 
    password_hash, 
    role, 
    permissions
) VALUES (
    'admin@yoursite.com',                                    -- ⚠️ CHANGE THIS EMAIL
    crypt('SecurePassword123!', gen_salt('bf')),             -- ⚠️ CHANGE THIS PASSWORD
    'super_admin',
    ARRAY['manage_cases', 'manage_symbols', 'edit_probabilities', 'view_analytics', 'manage_users', 'system_settings']
);

-- Verify admin user creation
SELECT 
    email, 
    role, 
    array_length(permissions, 1) as permission_count,
    created_at 
FROM admin_users;

*/