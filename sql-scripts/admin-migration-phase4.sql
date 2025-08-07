-- =====================================================
-- ADMIN DASHBOARD MIGRATION - PHASE 4 (FINAL)
-- Create your first admin user
-- CUSTOMIZE THE EMAIL AND PASSWORD BELOW BEFORE RUNNING
-- =====================================================

-- 🚨 IMPORTANT: Change these values before running! 🚨
INSERT INTO admin_users (
    email, 
    password_hash, 
    role, 
    permissions
) VALUES (
    'admin@yoursite.com',                                    -- ⚠️ CHANGE THIS EMAIL
    crypt('ChangeThisPassword123!', gen_salt('bf')),         -- ⚠️ CHANGE THIS PASSWORD
    'super_admin',
    ARRAY[
        'manage_cases', 
        'manage_symbols', 
        'edit_probabilities', 
        'view_analytics', 
        'manage_users', 
        'system_settings'
    ]
);

-- Verify the admin user was created successfully
SELECT 
    email, 
    role, 
    array_length(permissions, 1) as permission_count,
    created_at,
    '✅ Admin user created successfully!' as status
FROM admin_users 
WHERE email = 'admin@yoursite.com';  -- Update this if you changed the email above

-- Show final system status
DO $$
BEGIN
    RAISE NOTICE '===========================================';
    RAISE NOTICE '🎊 ADMIN DASHBOARD SETUP COMPLETE!';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Your admin system is ready!';
    RAISE NOTICE '';
    RAISE NOTICE 'Login credentials:';
    RAISE NOTICE '  📧 Email: admin@yoursite.com';  -- Update this
    RAISE NOTICE '  🔑 Password: ChangeThisPassword123!';  -- Update this
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Install packages: npm install jsonwebtoken bcryptjs';
    RAISE NOTICE '2. Set environment: ADMIN_JWT_SECRET=your-secret-key';
    RAISE NOTICE '3. Start dev server: npm run dev';
    RAISE NOTICE '4. Visit: http://localhost:3000/admin';
    RAISE NOTICE '';
    RAISE NOTICE '🔒 SECURITY: Change the default password after first login!';
    RAISE NOTICE '===========================================';
END $$;