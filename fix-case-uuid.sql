-- Fix the test case with proper UUID generation

-- Option 1: Update existing case with new UUID
UPDATE cases 
SET id = uuid_generate_v4() 
WHERE id = '11111111-1111-1111-1111-111111111111';

-- Option 2: Delete the test case and let admin create proper ones
-- DELETE FROM cases WHERE id = '11111111-1111-1111-1111-111111111111';

-- Show all cases after fix
SELECT id, name, price, is_active, created_at 
FROM cases 
ORDER BY created_at DESC;
