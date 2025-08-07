-- =====================================================
-- ADMIN DASHBOARD MIGRATION - PHASE 2
-- Create admin tables and upgrade existing tables
-- RUN THIS AFTER PHASE 1
-- =====================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- CREATE ADMIN TABLES (100% Safe - New Tables)
-- =====================================================

DO $$ BEGIN RAISE NOTICE 'Creating admin tables...'; END $$;

-- Admin users table
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'content_manager',
    permissions TEXT[] NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- MFA
    mfa_enabled BOOLEAN NOT NULL DEFAULT false,
    mfa_secret VARCHAR(255),
    
    -- Security
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    last_login TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES admin_users(id),
    
    -- Constraints
    CONSTRAINT valid_role CHECK (role IN ('super_admin', 'admin', 'content_manager')),
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Token blacklist
CREATE TABLE IF NOT EXISTS admin_token_blacklist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_hash VARCHAR(255) NOT NULL,
    admin_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Audit logs
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action VARCHAR(100) NOT NULL,
    admin_id UUID NOT NULL REFERENCES admin_users(id),
    admin_email VARCHAR(255) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    target_id VARCHAR(255) NOT NULL,
    changes JSONB NOT NULL DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    checksum VARCHAR(64) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- UPGRADE EXISTING CASES TABLE
-- =====================================================

DO $$ 
BEGIN
    RAISE NOTICE 'Upgrading cases table...';
    
    -- Add columns one by one with safety checks
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'is_active') THEN
        ALTER TABLE cases ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
        RAISE NOTICE '✅ Added is_active column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'metadata') THEN
        ALTER TABLE cases ADD COLUMN metadata JSONB DEFAULT '{}';
        RAISE NOTICE '✅ Added metadata column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'updated_at') THEN
        ALTER TABLE cases ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
        RAISE NOTICE '✅ Added updated_at column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'created_by') THEN
        ALTER TABLE cases ADD COLUMN created_by UUID REFERENCES admin_users(id);
        RAISE NOTICE '✅ Added created_by column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'updated_by') THEN
        ALTER TABLE cases ADD COLUMN updated_by UUID REFERENCES admin_users(id);
        RAISE NOTICE '✅ Added updated_by column';
    END IF;
END $$;

-- =====================================================
-- CREATE SYMBOLS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS symbols (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    image_url VARCHAR(500) DEFAULT '/symbols/default.png',
    rarity VARCHAR(50) NOT NULL DEFAULT 'common',
    value DECIMAL(10,2) NOT NULL DEFAULT 10.00 CHECK (value >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES admin_users(id),
    updated_by UUID REFERENCES admin_users(id),
    CONSTRAINT valid_rarity CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'))
);

-- =====================================================
-- CREATE CASE-SYMBOL RELATIONSHIPS
-- =====================================================

CREATE TABLE IF NOT EXISTS case_symbols (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    symbol_id UUID NOT NULL REFERENCES symbols(id) ON DELETE CASCADE,
    weight DECIMAL(5,2) NOT NULL DEFAULT 10.00 CHECK (weight >= 0 AND weight <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES admin_users(id),
    UNIQUE(case_id, symbol_id)
);

-- =====================================================
-- CREATE INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);
CREATE INDEX IF NOT EXISTS idx_admin_users_active ON admin_users(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_token_blacklist_hash ON admin_token_blacklist(token_hash);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin ON admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_cases_active ON cases(is_active);
CREATE INDEX IF NOT EXISTS idx_symbols_rarity ON symbols(rarity);
CREATE INDEX IF NOT EXISTS idx_symbols_active ON symbols(is_active);
CREATE INDEX IF NOT EXISTS idx_case_symbols_case ON case_symbols(case_id);
CREATE INDEX IF NOT EXISTS idx_case_symbols_symbol ON case_symbols(symbol_id);

DO $$ 
BEGIN 
    RAISE NOTICE '✅ Phase 2 completed - Admin tables created, cases table upgraded';
    RAISE NOTICE '👉 Now run Phase 3 for data migration';
END $$;