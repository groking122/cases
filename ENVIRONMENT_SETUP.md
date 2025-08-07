# Environment Setup Instructions

## Database Configuration

The admin dashboard issues you're experiencing are due to missing environment variables. Follow these steps:

### 1. Create Environment File

Copy the example file:
```bash
cp .env.example .env.local
```

### 2. Configure Supabase

Fill in your Supabase credentials in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
ADMIN_JWT_SECRET=your_admin_secret_here
```

### 3. Run Database Migration

Set up the symbols table:
```bash
# Run one of the admin migration scripts
# (Check sql-scripts/ folder for available options)
psql -h your-host -U your-user -d your-db -f sql-scripts/admin-migration-ultra-safe.sql
```

### 4. Migrate Symbol Configuration

Populate the database with symbols from the hardcoded config:
```bash
node migrate-config-to-db.js
```

### 5. Start Development Server

```bash
npm run dev
```

## Issues Fixed

✅ **Symbol Activation**: Fixed field mapping between database (snake_case) and frontend (camelCase)  
✅ **Image Loading**: Admin dashboard now properly maps image URLs from database  
✅ **API Conflicts**: Updated routes to use symbols table instead of deprecated skins table  
🔄 **Database Setup**: Need to configure environment variables and run migrations  

## Troubleshooting

- If symbols still appear inactive, check if the symbols table exists and has data
- If images don't load, verify the image upload system has proper storage configuration
- If case opening fails, ensure both symbols and case_symbols tables are populated