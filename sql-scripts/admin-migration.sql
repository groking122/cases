-- =====================================================
-- ADMIN DASHBOARD MIGRATION SCRIPT
-- Safely upgrades existing database to support admin dashboard
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
-- 2. UPGRADE EXISTING CASES TABLE
-- =====================================================

-- Add new columns to existing cases table if they don't exist
DO $$ 
BEGIN
    -- Add metadata column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'cases' AND column_name = 'metadata') THEN
        ALTER TABLE cases ADD COLUMN metadata JSONB DEFAULT '{}';
    END IF;
    
    -- Add updated_at column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'cases' AND column_name = 'updated_at') THEN
        ALTER TABLE cases ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    END IF;
    
    -- Add created_by column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'cases' AND column_name = 'created_by') THEN
        ALTER TABLE cases ADD COLUMN created_by UUID REFERENCES admin_users(id);
    END IF;
    
    -- Add updated_by column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'cases' AND column_name = 'updated_by') THEN
        ALTER TABLE cases ADD COLUMN updated_by UUID REFERENCES admin_users(id);
    END IF;
END $$;

-- =====================================================
-- 3. CREATE SYMBOLS TABLE (MIGRATE FROM SKINS)
-- =====================================================

-- Create symbols table based on existing skins structure
CREATE TABLE IF NOT EXISTS symbols (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image_url VARCHAR(500) NOT NULL,
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
    
    -- Constraints
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
-- 5. MIGRATE DATA FROM SKINS TO SYMBOLS
-- =====================================================

DO $$
BEGIN
    -- Only migrate if symbols table is empty and skins table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'skins') 
       AND NOT EXISTS (SELECT 1 FROM symbols LIMIT 1) THEN
        
        -- Insert data from skins to symbols
        INSERT INTO symbols (id, name, description, image_url, rarity, value, is_active, created_at, metadata)
        SELECT 
            id,
            name,
            COALESCE(description, ''),
            COALESCE(image_url, ''),
            rarity,
            value,
            true,
            created_at,
            json_build_object(
                'collection', COALESCE(collection, ''),
                'migrated_from_skins', true
            )::jsonb
        FROM skins;
        
        -- Create case-symbol relationships from existing skins data
        INSERT INTO case_symbols (case_id, symbol_id, weight)
        SELECT 
            case_id,
            id,
            -- Convert drop_rate to percentage weight
            CASE 
                WHEN drop_rate IS NOT NULL THEN LEAST(drop_rate * 100, 100)
                ELSE 10.0  -- Default weight if no drop_rate
            END
        FROM skins 
        WHERE case_id IS NOT NULL;
        
        RAISE NOTICE 'Successfully migrated % symbols from skins table', (SELECT COUNT(*) FROM symbols);
    END IF;
END $$;

-- =====================================================
-- 6. CREATE INDEXES
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
-- 7. CREATE FUNCTIONS AND TRIGGERS
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

-- Probability validation function
CREATE OR REPLACE FUNCTION validate_case_probabilities()
RETURNS TRIGGER AS $$
DECLARE
    total_weight DECIMAL(5,2);
BEGIN
    -- Calculate total weight for the case
    SELECT COALESCE(SUM(weight), 0) INTO total_weight
    FROM case_symbols
    WHERE case_id = COALESCE(NEW.case_id, OLD.case_id);
    
    -- Only validate if there are symbols (allow empty cases during setup)
    IF total_weight > 0 AND ABS(total_weight - 100.00) > 0.01 THEN
        RAISE EXCEPTION 'Case probabilities must sum to 100%%. Current total: %', total_weight;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for probability validation
DROP TRIGGER IF EXISTS validate_probabilities_trigger ON case_symbols;
CREATE TRIGGER validate_probabilities_trigger
    AFTER INSERT OR UPDATE OR DELETE ON case_symbols
    FOR EACH ROW
    EXECUTE FUNCTION validate_case_probabilities();

-- =====================================================
-- 8. CREATE ADMIN STATISTICS VIEW
-- =====================================================

CREATE OR REPLACE VIEW admin_dashboard_stats AS
SELECT
    (SELECT COUNT(*) FROM cases) as total_cases,
    (SELECT COUNT(*) FROM cases WHERE is_active = true) as active_cases,
    (SELECT COUNT(*) FROM symbols) as total_symbols,
    (SELECT COUNT(*) FROM case_openings WHERE DATE(opened_at) = CURRENT_DATE) as today_openings,
    (SELECT COALESCE(SUM(credits_spent), 0) FROM case_openings) as total_revenue,
    (SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (NOW() - created_at))/60), 0) FROM case_openings WHERE created_at >= NOW() - INTERVAL '24 hours') as average_session_time,
    (
        SELECT json_build_object(
            'id', c.id,
            'name', c.name,
            'openings', COUNT(co.id)
        )
        FROM cases c
        LEFT JOIN case_openings co ON c.id = co.case_id
        WHERE co.opened_at >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY c.id, c.name
        ORDER BY COUNT(co.id) DESC
        LIMIT 1
    ) as top_performing_case;

-- =====================================================
-- 9. MIGRATION SUMMARY
-- =====================================================

DO $$
DECLARE
    admin_count INTEGER;
    case_count INTEGER;
    symbol_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO admin_count FROM admin_users;
    SELECT COUNT(*) INTO case_count FROM cases;
    SELECT COUNT(*) INTO symbol_count FROM symbols;
    
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'ADMIN DASHBOARD MIGRATION COMPLETED';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Admin users: %', admin_count;
    RAISE NOTICE 'Cases: %', case_count;
    RAISE NOTICE 'Symbols: %', symbol_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Create your first admin user (see commented SQL below)';
    RAISE NOTICE '2. Install npm packages: jsonwebtoken bcryptjs';
    RAISE NOTICE '3. Set ADMIN_JWT_SECRET environment variable';
    RAISE NOTICE '4. Access admin dashboard at /admin';
    RAISE NOTICE '===========================================';
END $$;

-- =====================================================
-- 10. CREATE FIRST ADMIN USER (UNCOMMENT AND CUSTOMIZE)
-- =====================================================

/*
-- UNCOMMENT AND CUSTOMIZE THIS SECTION TO CREATE YOUR FIRST ADMIN USER

INSERT INTO admin_users (
    email, 
    password_hash, 
    role, 
    permissions
) VALUES (
    'admin@yoursite.com',                                    -- Change this email
    crypt('your-secure-password-here', gen_salt('bf')),      -- Change this password
    'super_admin',
    ARRAY['manage_cases', 'manage_symbols', 'edit_probabilities', 'view_analytics', 'manage_users', 'system_settings']
);

-- Verify the admin user was created
SELECT email, role, permissions, created_at FROM admin_users;

*/