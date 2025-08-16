// Test script to verify image upload paths
console.log('🔧 Testing image upload configuration...\n');

// Check environment variables
console.log('📋 Environment Variables:');
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing');
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing');

// Check upload directories
const fs = require('fs');
const path = require('path');

console.log('\n📁 Upload Directories:');
const uploadDirs = ['public/uploads/cases', 'public/uploads/symbols', 'public/uploads/icons'];

uploadDirs.forEach(dir => {
  const fullPath = path.join(process.cwd(), dir);
  const exists = fs.existsSync(fullPath);
  console.log(`${dir}: ${exists ? '✅ Exists' : '❌ Missing'}`);
  
  if (exists) {
    try {
      const stats = fs.statSync(fullPath);
      console.log(`  - Created: ${stats.birthtime}`);
      console.log(`  - Writable: ${fs.constants.W_OK ? '✅ Yes' : '❌ No'}`);
    } catch (error) {
      console.log(`  - Error checking: ${error.message}`);
    }
  }
});

console.log('\n🎯 Expected Image URLs:');
console.log('Supabase: https://[project].supabase.co/storage/v1/object/public/case-images/symbols/[filename]');
console.log('Local Fallback: http://localhost:3000/uploads/symbols/[filename]');

console.log('\n📊 Current Working Directory:', process.cwd());
console.log('Node Environment:', process.env.NODE_ENV || 'development');
