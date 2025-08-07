-- =====================================================
-- ADMIN DASHBOARD MIGRATION - PHASE 3
-- Data migration and final setup
-- RUN THIS AFTER PHASE 2
-- =====================================================

-- =====================================================
-- MIGRATE EXISTING DATA TO SYMBOLS
-- =====================================================

DO $$
DECLARE
    source_table TEXT := null;
    migrated_count INTEGER := 0;
BEGIN
    -- Determine source table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'skins') THEN
        source_table := 'skins';
    ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rewards') THEN
        source_table := 'rewards';
    END IF;
    
    RAISE NOTICE 'Data migration source: %', COALESCE(source_table, 'none - will create samples');
    
    -- Only migrate if symbols table is empty
    IF NOT EXISTS (SELECT 1 FROM symbols LIMIT 1) THEN
        
        IF source_table = 'skins' THEN
            -- Migrate from skins with column detection
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skins' AND column_name = 'value') THEN
                -- Skins has 'value' column
                INSERT INTO symbols (id, name, description, image_url, rarity, value, metadata, created_at)
                SELECT 
                    id,
                    name,
                    COALESCE(description, ''),
                    COALESCE(image_url, '/symbols/default.png'),
                    rarity,
                    value,
                    json_build_object('migrated_from', 'skins', 'collection', COALESCE(collection, ''))::jsonb,
                    COALESCE(created_at, CURRENT_TIMESTAMP)
                FROM skins;
            ELSE
                -- Skins doesn't have 'value' - use default or other price column
                INSERT INTO symbols (id, name, description, image_url, rarity, value, metadata, created_at)
                SELECT 
                    id,
                    name,
                    COALESCE(description, ''),
                    COALESCE(image_url, '/symbols/default.png'),
                    rarity,
                    50.00, -- Default value since we don't have price info
                    json_build_object('migrated_from', 'skins', 'collection', COALESCE(collection, ''))::jsonb,
                    COALESCE(created_at, CURRENT_TIMESTAMP)
                FROM skins;
            END IF;
            
            GET DIAGNOSTICS migrated_count = ROW_COUNT;
            RAISE NOTICE '✅ Migrated % symbols from skins table', migrated_count;
            
        ELSIF source_table = 'rewards' THEN
            -- Migrate from rewards
            INSERT INTO symbols (id, name, description, image_url, rarity, value, metadata, created_at)
            SELECT 
                id,
                name,
                COALESCE(description, ''),
                COALESCE(image, '/symbols/default.png'),
                rarity,
                value,
                json_build_object('migrated_from', 'rewards')::jsonb,
                COALESCE(created_at, CURRENT_TIMESTAMP)
            FROM rewards;
            
            GET DIAGNOSTICS migrated_count = ROW_COUNT;
            RAISE NOTICE '✅ Migrated % symbols from rewards table', migrated_count;
            
        ELSE
            -- Create sample data
            INSERT INTO symbols (name, description, image_url, rarity, value, metadata) VALUES 
            ('Bronze Coin', 'Common currency', '/symbols/common/bronze-coin.png', 'common', 10.00, '{"sample": true}'),
            ('Silver Coin', 'Uncommon currency', '/symbols/uncommon/silver-coin.png', 'uncommon', 25.00, '{"sample": true}'),
            ('Gold Coin', 'Rare currency', '/symbols/rare/gold-coin.png', 'rare', 50.00, '{"sample": true}'),
            ('Diamond', 'Epic gem', '/symbols/epic/diamond.png', 'epic', 100.00, '{"sample": true}'),
            ('Crown', 'Legendary treasure', '/symbols/legendary/crown.png', 'legendary', 500.00, '{"sample": true}');
            
            RAISE NOTICE '✅ Created 5 sample symbols';
        END IF;
        
        -- Create case-symbol relationships if we have both cases and symbols
        IF EXISTS (SELECT 1 FROM cases LIMIT 1) AND EXISTS (SELECT 1 FROM symbols LIMIT 1) THEN
            -- Link first case with all symbols using default weights
            INSERT INTO case_symbols (case_id, symbol_id, weight)
            SELECT 
                (SELECT id FROM cases LIMIT 1),
                s.id,
                CASE s.rarity
                    WHEN 'common' THEN 50.0
                    WHEN 'uncommon' THEN 25.0  
                    WHEN 'rare' THEN 15.0
                    WHEN 'epic' THEN 8.0
                    WHEN 'legendary' THEN 2.0
                    ELSE 10.0
                END
            FROM symbols s;
            
            RAISE NOTICE '✅ Created case-symbol relationships';
        END IF;
        
    ELSE
        RAISE NOTICE 'Symbols table has data - skipping migration';
    END IF;
END $$;

-- =====================================================
-- CREATE TRIGGERS AND FUNCTIONS
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

-- Probability validation (lenient)
CREATE OR REPLACE FUNCTION validate_case_probabilities()
RETURNS TRIGGER AS $$
DECLARE
    total_weight DECIMAL(5,2);
BEGIN
    SELECT COALESCE(SUM(weight), 0) INTO total_weight
    FROM case_symbols
    WHERE case_id = COALESCE(NEW.case_id, OLD.case_id);
    
    IF total_weight > 0 AND ABS(total_weight - 100.00) > 1.0 THEN
        RAISE NOTICE 'Case % probability total: % (should be 100%%)', 
            COALESCE(NEW.case_id, OLD.case_id), total_weight;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_probabilities_trigger ON case_symbols;
CREATE TRIGGER validate_probabilities_trigger AFTER INSERT OR UPDATE OR DELETE ON case_symbols FOR EACH ROW EXECUTE FUNCTION validate_case_probabilities();

-- =====================================================
-- CREATE ADMIN DASHBOARD VIEW
-- =====================================================

CREATE OR REPLACE VIEW admin_dashboard_stats AS
SELECT
    (SELECT COUNT(*) FROM cases) as total_cases,
    (SELECT COUNT(*) FROM cases WHERE is_active = true) as active_cases,
    (SELECT COUNT(*) FROM symbols) as total_symbols,
    0 as today_openings, -- Safe default
    0 as total_revenue,   -- Safe default  
    0 as average_session_time, -- Safe default
    json_build_object('id', null, 'name', 'No data', 'openings', 0) as top_performing_case;

-- Update cases metadata
UPDATE cases 
SET metadata = json_build_object(
    'totalOpenings', 0,
    'averageValue', 0,
    'lastModified', updated_at,
    'modifiedBy', 'migration'
)::jsonb
WHERE metadata = '{}' OR metadata IS NULL;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

DO $$
DECLARE
    admin_count INTEGER;
    case_count INTEGER;
    symbol_count INTEGER;
    relationship_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO admin_count FROM admin_users;
    SELECT COUNT(*) INTO case_count FROM cases;
    SELECT COUNT(*) INTO symbol_count FROM symbols;
    SELECT COUNT(*) INTO relationship_count FROM case_symbols;
    
    RAISE NOTICE '===========================================';
    RAISE NOTICE '🎉 ADMIN DASHBOARD MIGRATION COMPLETE!';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Final counts:';
    RAISE NOTICE '  📦 Cases: %', case_count;
    RAISE NOTICE '  💎 Symbols: %', symbol_count;
    RAISE NOTICE '  🔗 Relationships: %', relationship_count;
    RAISE NOTICE '  👤 Admin users: %', admin_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Create first admin user (see Phase 4)';
    RAISE NOTICE '2. Install: npm install jsonwebtoken bcryptjs';
    RAISE NOTICE '3. Set: ADMIN_JWT_SECRET=your-secret';
    RAISE NOTICE '4. Visit: /admin';
    RAISE NOTICE '===========================================';
END $$;