-- =====================================================
-- ADMIN DASHBOARD MIGRATION SCRIPT (FIXED)
-- Safely upgrades existing database to support admin dashboard
-- Handles missing columns and different table structures
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 1. CREATE NEW ADMIN TABLES
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
-- 2. INSPECT AND UPGRADE EXISTING CASES TABLE
-- =====================================================

DO $$ 
BEGIN
    RAISE NOTICE 'Inspecting existing cases table structure...';
    
    -- Add is_active column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'cases' AND column_name = 'is_active') THEN
        ALTER TABLE cases ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
        RAISE NOTICE 'Added is_active column to cases table';
    ELSE
        RAISE NOTICE 'is_active column already exists in cases table';
    END IF;
    
    -- Add metadata column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'cases' AND column_name = 'metadata') THEN
        ALTER TABLE cases ADD COLUMN metadata JSONB DEFAULT '{}';
        RAISE NOTICE 'Added metadata column to cases table';
    ELSE
        RAISE NOTICE 'metadata column already exists in cases table';
    END IF;
    
    -- Add updated_at column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'cases' AND column_name = 'updated_at') THEN
        ALTER TABLE cases ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
        RAISE NOTICE 'Added updated_at column to cases table';
    ELSE
        RAISE NOTICE 'updated_at column already exists in cases table';
    END IF;
    
    -- Add created_by column (references admin_users, can be null for existing cases)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'cases' AND column_name = 'created_by') THEN
        ALTER TABLE cases ADD COLUMN created_by UUID REFERENCES admin_users(id);
        RAISE NOTICE 'Added created_by column to cases table';
    ELSE
        RAISE NOTICE 'created_by column already exists in cases table';
    END IF;
    
    -- Add updated_by column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'cases' AND column_name = 'updated_by') THEN
        ALTER TABLE cases ADD COLUMN updated_by UUID REFERENCES admin_users(id);
        RAISE NOTICE 'Added updated_by column to cases table';
    ELSE
        RAISE NOTICE 'updated_by column already exists in cases table';
    END IF;
    
END $$;

-- =====================================================
-- 3. CREATE SYMBOLS TABLE (BASED ON EXISTING STRUCTURE)
-- =====================================================

-- Create symbols table
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
    
    -- Constraints - support both old and new rarity values
    CONSTRAINT valid_rarity CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'))
);

-- =====================================================
-- 4. CREATE CASE-SYMBOL RELATIONSHIPS TABLE
-- =====================================================

-- Create new many-to-many relationship table
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
-- 5. MIGRATE DATA FROM EXISTING TABLES
-- =====================================================

DO $$
DECLARE
    skins_exists BOOLEAN := false;
    rewards_exists BOOLEAN := false;
    migrated_count INTEGER := 0;
BEGIN
    -- Check if skins table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'skins'
    ) INTO skins_exists;
    
    -- Check if rewards table exists  
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'rewards'
    ) INTO rewards_exists;
    
    RAISE NOTICE 'Migration check: skins_exists=%, rewards_exists=%', skins_exists, rewards_exists;
    
    -- Only migrate if symbols table is empty
    IF NOT EXISTS (SELECT 1 FROM symbols LIMIT 1) THEN
        
        -- Migrate from skins table if it exists
        IF skins_exists THEN
            INSERT INTO symbols (id, name, description, image_url, rarity, value, is_active, created_at, metadata)
            SELECT 
                id,
                name,
                COALESCE(description, ''),
                COALESCE(image_url, ''),
                rarity,
                value,
                true,
                COALESCE(created_at, CURRENT_TIMESTAMP),
                json_build_object(
                    'collection', COALESCE(collection, ''),
                    'migrated_from', 'skins',
                    'original_drop_rate', COALESCE(drop_rate, 0)
                )::jsonb
            FROM skins;
            
            GET DIAGNOSTICS migrated_count = ROW_COUNT;
            RAISE NOTICE 'Migrated % symbols from skins table', migrated_count;
            
            -- Create case-symbol relationships from skins
            INSERT INTO case_symbols (case_id, symbol_id, weight)
            SELECT 
                case_id,
                id,
                -- Convert drop_rate to percentage, with fallback
                CASE 
                    WHEN drop_rate IS NOT NULL AND drop_rate > 0 THEN 
                        LEAST(drop_rate * 100, 100)
                    ELSE 10.0  -- Default weight
                END
            FROM skins 
            WHERE case_id IS NOT NULL;
            
        -- Migrate from rewards table if it exists and skins doesn't
        ELSIF rewards_exists THEN
            INSERT INTO symbols (id, name, description, image_url, rarity, value, is_active, created_at, metadata)
            SELECT 
                id,
                name,
                COALESCE(description, ''),
                COALESCE(image, ''),
                rarity,
                value,
                COALESCE(is_active, true),
                COALESCE(created_at, CURRENT_TIMESTAMP),
                json_build_object(
                    'case_type', COALESCE(case_type, ''),
                    'migrated_from', 'rewards',
                    'original_drop_rate', COALESCE(drop_rate, 0),
                    'cumulative_probability', COALESCE(cumulative_probability, 0)
                )::jsonb
            FROM rewards;
            
            GET DIAGNOSTICS migrated_count = ROW_COUNT;
            RAISE NOTICE 'Migrated % symbols from rewards table', migrated_count;
        ELSE
            RAISE NOTICE 'No existing skins or rewards table found - will create sample data';
        END IF;
        
    ELSE
        RAISE NOTICE 'Symbols table already has data - skipping migration';
    END IF;
END $$;

-- =====================================================
-- 6. CREATE SAMPLE DATA IF NO EXISTING DATA
-- =====================================================

DO $$
BEGIN
    -- Create sample symbols if none exist
    IF NOT EXISTS (SELECT 1 FROM symbols LIMIT 1) THEN
        RAISE NOTICE 'Creating sample symbols...';
        
        INSERT INTO symbols (name, description, image_url, rarity, value, metadata) VALUES 
        ('Bronze Coin', 'Common currency symbol', '/symbols/common/bronze-coin.png', 'common', 10.00, '{"collection": "Currency"}'),
        ('Silver Coin', 'Uncommon currency symbol', '/symbols/uncommon/silver-coin.png', 'uncommon', 25.00, '{"collection": "Currency"}'),
        ('Gold Coin', 'Rare currency symbol', '/symbols/rare/gold-coin.png', 'rare', 50.00, '{"collection": "Currency"}'),
        ('Diamond', 'Epic precious stone', '/symbols/epic/diamond.png', 'epic', 100.00, '{"collection": "Gems"}'),
        ('Crown', 'Legendary royal symbol', '/symbols/legendary/crown.png', 'legendary', 500.00, '{"collection": "Royal"}');
        
        RAISE NOTICE 'Created 5 sample symbols';
    END IF;
    
    -- Update existing cases to have proper metadata if they don't
    UPDATE cases 
    SET metadata = json_build_object(
        'totalOpenings', 0,
        'averageValue', 0,
        'lastModified', updated_at,
        'modifiedBy', 'system'
    )::jsonb
    WHERE metadata = '{}' OR metadata IS NULL;
    
END $$;

-- =====================================================
-- 7. CREATE INDEXES
-- =====================================================

-- Admin users indexes
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);
CREATE INDEX IF NOT EXISTS idx_admin_users_active ON admin_users(is_active);

-- Admin token blacklist indexes
CREATE INDEX IF NOT EXISTS idx_admin_token_blacklist_hash ON admin_token_blacklist(token_hash);
CREATE INDEX IF NOT EXISTS idx_admin_token_blacklist_expires ON admin_token_blacklist(expires_at);

-- Admin audit logs indexes
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin ON admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action ON admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_timestamp ON admin_audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target ON admin_audit_logs(target_type, target_id);

-- Enhanced cases indexes
CREATE INDEX IF NOT EXISTS idx_cases_active ON cases(is_active);
CREATE INDEX IF NOT EXISTS idx_cases_price ON cases(price);
CREATE INDEX IF NOT EXISTS idx_cases_metadata ON cases USING gin(metadata);

-- Symbols indexes
CREATE INDEX IF NOT EXISTS idx_symbols_rarity ON symbols(rarity);
CREATE INDEX IF NOT EXISTS idx_symbols_value ON symbols(value);
CREATE INDEX IF NOT EXISTS idx_symbols_active ON symbols(is_active);

-- Case symbols indexes
CREATE INDEX IF NOT EXISTS idx_case_symbols_case ON case_symbols(case_id);
CREATE INDEX IF NOT EXISTS idx_case_symbols_symbol ON case_symbols(symbol_id);
CREATE INDEX IF NOT EXISTS idx_case_symbols_weight ON case_symbols(weight);

-- =====================================================
-- 8. CREATE FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to relevant tables
DROP TRIGGER IF EXISTS update_admin_users_updated_at ON admin_users;
CREATE TRIGGER update_admin_users_updated_at 
    BEFORE UPDATE ON admin_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_cases_updated_at ON cases;
CREATE TRIGGER update_cases_updated_at 
    BEFORE UPDATE ON cases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_symbols_updated_at ON symbols;
CREATE TRIGGER update_symbols_updated_at 
    BEFORE UPDATE ON symbols
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_case_symbols_updated_at ON case_symbols;
CREATE TRIGGER update_case_symbols_updated_at 
    BEFORE UPDATE ON case_symbols
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Probability validation function (more lenient for migration)
CREATE OR REPLACE FUNCTION validate_case_probabilities()
RETURNS TRIGGER AS $$
DECLARE
    total_weight DECIMAL(5,2);
    case_has_symbols BOOLEAN;
BEGIN
    -- Check if case has any symbols
    SELECT EXISTS(SELECT 1 FROM case_symbols WHERE case_id = COALESCE(NEW.case_id, OLD.case_id)) 
    INTO case_has_symbols;
    
    -- Only validate if case has symbols
    IF case_has_symbols THEN
        SELECT COALESCE(SUM(weight), 0) INTO total_weight
        FROM case_symbols
        WHERE case_id = COALESCE(NEW.case_id, OLD.case_id);
        
        -- Allow some tolerance for floating point errors and partial setup
        IF total_weight > 0 AND ABS(total_weight - 100.00) > 0.1 THEN
            RAISE NOTICE 'Warning: Case probabilities should sum to 100%%. Current total: %', total_weight;
            -- Don't raise exception during migration, just warn
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for probability validation (lenient during migration)
DROP TRIGGER IF EXISTS validate_probabilities_trigger ON case_symbols;
CREATE TRIGGER validate_probabilities_trigger
    AFTER INSERT OR UPDATE OR DELETE ON case_symbols
    FOR EACH ROW
    EXECUTE FUNCTION validate_case_probabilities();

-- =====================================================
-- 9. CREATE ADMIN STATISTICS VIEW
-- =====================================================

CREATE OR REPLACE VIEW admin_dashboard_stats AS
SELECT
    (SELECT COUNT(*) FROM cases) as total_cases,
    (SELECT COUNT(*) FROM cases WHERE is_active = true) as active_cases,
    (SELECT COUNT(*) FROM symbols) as total_symbols,
    (SELECT COALESCE(COUNT(*), 0) FROM case_openings WHERE DATE(opened_at) = CURRENT_DATE) as today_openings,
    (SELECT COALESCE(SUM(credits_spent), 0) FROM case_openings) as total_revenue,
    (SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (NOW() - opened_at))/60), 0) FROM case_openings WHERE opened_at >= NOW() - INTERVAL '24 hours') as average_session_time,
    (
        SELECT COALESCE(
            json_build_object(
                'id', c.id,
                'name', c.name,
                'openings', COUNT(co.id)
            ),
            json_build_object('id', null, 'name', 'No data', 'openings', 0)
        )
        FROM cases c
        LEFT JOIN case_openings co ON c.id = co.case_id
        WHERE co.opened_at >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY c.id, c.name
        ORDER BY COUNT(co.id) DESC
        LIMIT 1
    ) as top_performing_case;

-- =====================================================
-- 10. MIGRATION COMPLETE - SUMMARY
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
    RAISE NOTICE 'ADMIN DASHBOARD MIGRATION COMPLETED ✅';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Admin users: %', admin_count;
    RAISE NOTICE 'Cases: %', case_count;
    RAISE NOTICE 'Symbols: %', symbol_count;
    RAISE NOTICE 'Case-Symbol relationships: %', case_symbol_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Create your first admin user (uncomment section below)';
    RAISE NOTICE '2. Install npm packages: npm install jsonwebtoken bcryptjs';
    RAISE NOTICE '3. Set ADMIN_JWT_SECRET environment variable';
    RAISE NOTICE '4. Access admin dashboard at /admin';
    RAISE NOTICE '===========================================';
END $$;

-- =====================================================
-- 11. CREATE FIRST ADMIN USER (UNCOMMENT TO USE)
-- =====================================================

/*
-- UNCOMMENT THIS SECTION TO CREATE YOUR FIRST ADMIN USER

INSERT INTO admin_users (
    email, 
    password_hash, 
    role, 
    permissions
) VALUES (
    'admin@yoursite.com',                                    -- ⚠️ Change this email
    crypt('change-this-password', gen_salt('bf')),           -- ⚠️ Change this password  
    'super_admin',
    ARRAY['manage_cases', 'manage_symbols', 'edit_probabilities', 'view_analytics', 'manage_users', 'system_settings']
);

-- Verify the admin user was created
SELECT email, role, permissions, created_at FROM admin_users;

RAISE NOTICE 'Admin user created successfully! 🎉';

*/