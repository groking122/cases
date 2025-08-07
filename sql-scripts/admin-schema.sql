-- =====================================================
-- ADMIN DASHBOARD DATABASE SCHEMA
-- Professional admin system for case opening management
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- ADMIN USERS TABLE
-- =====================================================
CREATE TABLE admin_users (
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

-- Create indexes for admin_users
CREATE INDEX idx_admin_users_email ON admin_users(email);
CREATE INDEX idx_admin_users_role ON admin_users(role);
CREATE INDEX idx_admin_users_active ON admin_users(is_active);

-- =====================================================
-- ADMIN TOKEN BLACKLIST
-- =====================================================
CREATE TABLE admin_token_blacklist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_hash VARCHAR(255) NOT NULL,
    admin_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for token blacklist
CREATE INDEX idx_admin_token_blacklist_hash ON admin_token_blacklist(token_hash);
CREATE INDEX idx_admin_token_blacklist_expires ON admin_token_blacklist(expires_at);

-- =====================================================
-- ENHANCED CASES TABLE
-- =====================================================
CREATE TABLE cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL CHECK (price > 0),
    image_url VARCHAR(500) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- Admin metadata
    metadata JSONB DEFAULT '{}',
    
    -- Tracking
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES admin_users(id),
    updated_by UUID REFERENCES admin_users(id)
);

-- Create indexes for cases
CREATE INDEX idx_cases_active ON cases(is_active);
CREATE INDEX idx_cases_price ON cases(price);
CREATE INDEX idx_cases_name ON cases USING gin(to_tsvector('english', name));
CREATE INDEX idx_cases_metadata ON cases USING gin(metadata);

-- =====================================================
-- ENHANCED SYMBOLS TABLE
-- =====================================================
CREATE TABLE symbols (
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
    CONSTRAINT valid_rarity CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary'))
);

-- Create indexes for symbols
CREATE INDEX idx_symbols_rarity ON symbols(rarity);
CREATE INDEX idx_symbols_value ON symbols(value);
CREATE INDEX idx_symbols_active ON symbols(is_active);
CREATE INDEX idx_symbols_name ON symbols USING gin(to_tsvector('english', name));

-- =====================================================
-- CASE-SYMBOL RELATIONSHIPS WITH PROBABILITIES
-- =====================================================
CREATE TABLE case_symbols (
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

-- Create indexes for case_symbols
CREATE INDEX idx_case_symbols_case ON case_symbols(case_id);
CREATE INDEX idx_case_symbols_symbol ON case_symbols(symbol_id);
CREATE INDEX idx_case_symbols_weight ON case_symbols(weight);

-- =====================================================
-- ADMIN AUDIT LOGS
-- =====================================================
CREATE TABLE admin_audit_logs (
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

-- Create indexes for audit logs
CREATE INDEX idx_admin_audit_logs_admin ON admin_audit_logs(admin_id);
CREATE INDEX idx_admin_audit_logs_action ON admin_audit_logs(action);
CREATE INDEX idx_admin_audit_logs_timestamp ON admin_audit_logs(timestamp);
CREATE INDEX idx_admin_audit_logs_target ON admin_audit_logs(target_type, target_id);

-- =====================================================
-- CASE OPENING STATISTICS (Enhanced)
-- =====================================================
CREATE TABLE case_openings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    case_id UUID NOT NULL REFERENCES cases(id),
    symbol_id UUID NOT NULL REFERENCES symbols(id),
    credits_spent DECIMAL(10,2) NOT NULL,
    credits_won DECIMAL(10,2) NOT NULL,
    
    -- Analytics metadata
    session_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    
    -- Timestamp
    opened_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for case openings
CREATE INDEX idx_case_openings_user ON case_openings(user_id);
CREATE INDEX idx_case_openings_case ON case_openings(case_id);
CREATE INDEX idx_case_openings_symbol ON case_openings(symbol_id);
CREATE INDEX idx_case_openings_timestamp ON case_openings(opened_at);
CREATE INDEX idx_case_openings_session ON case_openings(session_id);

-- =====================================================
-- PROBABILITY VALIDATION FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION validate_case_probabilities()
RETURNS TRIGGER AS $$
DECLARE
    total_weight DECIMAL(5,2);
BEGIN
    -- Calculate total weight for the case
    SELECT SUM(weight) INTO total_weight
    FROM case_symbols
    WHERE case_id = COALESCE(NEW.case_id, OLD.case_id);
    
    -- Check if total weight is approximately 100%
    IF ABS(total_weight - 100.00) > 0.01 THEN
        RAISE EXCEPTION 'Case probabilities must sum to 100%%. Current total: %', total_weight;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for probability validation
CREATE TRIGGER validate_probabilities_trigger
    AFTER INSERT OR UPDATE OR DELETE ON case_symbols
    FOR EACH ROW
    EXECUTE FUNCTION validate_case_probabilities();

-- =====================================================
-- ADMIN STATISTICS VIEW
-- =====================================================
CREATE OR REPLACE VIEW admin_dashboard_stats AS
SELECT
    (SELECT COUNT(*) FROM cases) as total_cases,
    (SELECT COUNT(*) FROM cases WHERE is_active = true) as active_cases,
    (SELECT COUNT(*) FROM symbols) as total_symbols,
    (SELECT COUNT(*) FROM case_openings WHERE DATE(opened_at) = CURRENT_DATE) as today_openings,
    (SELECT COALESCE(SUM(credits_spent), 0) FROM case_openings) as total_revenue,
    (SELECT COALESCE(AVG(credits_won - credits_spent), 0) FROM case_openings) as average_profit_per_opening,
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
-- UPDATED TRIGGERS FOR METADATA
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON admin_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cases_updated_at BEFORE UPDATE ON cases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_symbols_updated_at BEFORE UPDATE ON symbols
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_case_symbols_updated_at BEFORE UPDATE ON case_symbols
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- INITIAL ADMIN USER (RUN MANUALLY)
-- =====================================================
-- INSERT INTO admin_users (
--     email, 
--     password_hash, 
--     role, 
--     permissions
-- ) VALUES (
--     'admin@yoursite.com',
--     crypt('your-secure-password', gen_salt('bf')),
--     'super_admin',
--     ARRAY['manage_cases', 'manage_symbols', 'edit_probabilities', 'view_analytics', 'manage_users', 'system_settings']
-- );

-- =====================================================
-- SAMPLE DATA FOR TESTING (OPTIONAL)
-- =====================================================
-- Sample symbols
-- INSERT INTO symbols (name, description, image_url, rarity, value) VALUES
-- ('Bronze Coin', 'Common currency symbol', '/symbols/bronze-coin.png', 'common', 10.00),
-- ('Silver Coin', 'Uncommon currency symbol', '/symbols/silver-coin.png', 'uncommon', 25.00),
-- ('Gold Coin', 'Rare currency symbol', '/symbols/gold-coin.png', 'rare', 50.00),
-- ('Diamond', 'Epic precious stone', '/symbols/diamond.png', 'epic', 100.00),
-- ('Crown', 'Legendary royal symbol', '/symbols/crown.png', 'legendary', 500.00);

-- Sample case
-- INSERT INTO cases (name, description, price, image_url) VALUES
-- ('Starter Pack', 'Basic case for new players', 50.00, '/cases/starter-pack.png');

-- Sample case-symbol relationships (must sum to 100%)
-- INSERT INTO case_symbols (case_id, symbol_id, weight) VALUES
-- ((SELECT id FROM cases WHERE name = 'Starter Pack'), (SELECT id FROM symbols WHERE name = 'Bronze Coin'), 50.00),
-- ((SELECT id FROM cases WHERE name = 'Starter Pack'), (SELECT id FROM symbols WHERE name = 'Silver Coin'), 30.00),
-- ((SELECT id FROM cases WHERE name = 'Starter Pack'), (SELECT id FROM symbols WHERE name = 'Gold Coin'), 15.00),
-- ((SELECT id FROM cases WHERE name = 'Starter Pack'), (SELECT id FROM symbols WHERE name = 'Diamond'), 4.00),
-- ((SELECT id FROM cases WHERE name = 'Starter Pack'), (SELECT id FROM symbols WHERE name = 'Crown'), 1.00);