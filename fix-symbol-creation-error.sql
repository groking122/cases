-- Fix Symbol Creation Error
-- This addresses the 500 error when creating symbols

-- =====================================================
-- 1. CHECK AND FIX ADMIN_USERS TABLE
-- =====================================================

-- Create admin_users table if it doesn't exist
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(50) DEFAULT 'admin',
    permissions JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE
);

-- Insert default admin user if none exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM admin_users WHERE email = 'admin@yoursite.com') THEN
        INSERT INTO admin_users (email, password_hash, first_name, role, permissions)
        VALUES (
            'admin@yoursite.com',
            '$2b$10$8K.mdXpCz9pKJ1QzGKJ5FOwhIpx5JUqzW5JZ9yK8fJ9G8ZVdoK9p2', -- ChangeThisPassword123!
            'Admin',
            'super_admin',
            '["manage_symbols", "manage_cases", "manage_users", "view_analytics"]'::jsonb
        );
        RAISE NOTICE '✅ Created default admin user';
    ELSE
        RAISE NOTICE '✅ Admin user already exists';
    END IF;
END $$;

-- =====================================================
-- 2. FIX SYMBOLS TABLE CONSTRAINTS
-- =====================================================

-- Make created_by and updated_by nullable (optional)
DO $$
BEGIN
    -- Check if symbols table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'symbols') THEN
        
        -- Remove NOT NULL constraint from created_by if it exists
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'symbols' AND column_name = 'created_by' AND is_nullable = 'NO'
        ) THEN
            ALTER TABLE symbols ALTER COLUMN created_by DROP NOT NULL;
            RAISE NOTICE '✅ Made created_by nullable in symbols table';
        END IF;
        
        -- Remove NOT NULL constraint from updated_by if it exists
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'symbols' AND column_name = 'updated_by' AND is_nullable = 'NO'
        ) THEN
            ALTER TABLE symbols ALTER COLUMN updated_by DROP NOT NULL;
            RAISE NOTICE '✅ Made updated_by nullable in symbols table';
        END IF;
        
    ELSE
        RAISE NOTICE 'ℹ️ Symbols table does not exist yet';
    END IF;
END $$;

-- =====================================================
-- 3. RECREATE SYMBOLS TABLE WITH CORRECT STRUCTURE
-- =====================================================

CREATE TABLE IF NOT EXISTS symbols (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    image_url VARCHAR(500),
    rarity VARCHAR(50) NOT NULL DEFAULT 'common',
    value DECIMAL(10,2) NOT NULL DEFAULT 10.00 CHECK (value >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- Admin metadata
    metadata JSONB DEFAULT '{}',
    
    -- Tracking (made nullable to avoid reference issues)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES admin_users(id),  -- Nullable
    updated_by UUID REFERENCES admin_users(id),  -- Nullable
    
    -- Support all rarity values including mythic
    CONSTRAINT valid_rarity CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'))
);

-- =====================================================
-- 4. CREATE INDEXES IF THEY DON'T EXIST
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_symbols_rarity ON symbols(rarity);
CREATE INDEX IF NOT EXISTS idx_symbols_value ON symbols(value);
CREATE INDEX IF NOT EXISTS idx_symbols_active ON symbols(is_active);
CREATE INDEX IF NOT EXISTS idx_symbols_name ON symbols USING gin(to_tsvector('english', name));

-- =====================================================
-- 5. ENABLE ROW LEVEL SECURITY AND CREATE POLICIES
-- =====================================================

ALTER TABLE symbols ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow admin read access" ON symbols;
DROP POLICY IF EXISTS "Allow admin write access" ON symbols;

-- Create admin policies
CREATE POLICY "Allow admin read access" ON symbols
    FOR SELECT TO public
    USING (true);  -- Allow all reads for now

CREATE POLICY "Allow admin write access" ON symbols
    FOR ALL TO public
    USING (true)   -- Allow all writes for now
    WITH CHECK (true);

-- =====================================================
-- 6. CREATE ADMIN AUDIT LOGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action VARCHAR(100) NOT NULL,
    admin_id UUID REFERENCES admin_users(id),
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
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin ON admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action ON admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_timestamp ON admin_audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target ON admin_audit_logs(target_type, target_id);

-- =====================================================
-- 7. SHOW CURRENT STRUCTURE
-- =====================================================

-- Show admin users
SELECT 'admin_users' as table_name, email, role, is_active, created_at 
FROM admin_users 
ORDER BY created_at 
LIMIT 5;

-- Show symbols table structure
SELECT 
    'symbols_structure' as info,
    column_name, 
    data_type, 
    is_nullable, 
    column_default 
FROM information_schema.columns 
WHERE table_name = 'symbols' 
ORDER BY ordinal_position;

-- Test symbol creation (optional)
/*
INSERT INTO symbols (name, description, image_url, rarity, value) 
VALUES ('Test Symbol', 'Test description', '/test.jpg', 'common', 100.00)
RETURNING id, name, created_at;
*/
