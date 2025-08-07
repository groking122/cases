# 🎯 Case Opening Admin System - Complete Guide

## 📊 **System Architecture Overview**

The Case Opening Admin system is a full-stack application that manages cases, symbols, and probabilities for a gambling/gaming platform.

### **Technology Stack:**
- **Frontend**: Next.js 15.4.1 + React 19 + TypeScript
- **Backend**: Next.js API Routes + Supabase PostgreSQL
- **Authentication**: JWT tokens (bypassed in development)
- **File Storage**: Supabase Storage for images
- **Styling**: Tailwind CSS + Framer Motion

---

## 🗄️ **Database Architecture**

### **Core Tables:**

#### 1. **`symbols` Table** (Primary content)
```sql
CREATE TABLE symbols (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image_url VARCHAR(500),           -- ⚠️ Image URLs
    rarity VARCHAR(50) NOT NULL,      -- common, uncommon, rare, epic, legendary
    value DECIMAL(10,2) NOT NULL,     -- Credit value
    is_active BOOLEAN DEFAULT true,   -- ⚠️ Active/Inactive status
    metadata JSONB DEFAULT '{}',      -- Extra data (emoji, colors, etc.)
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 2. **`cases` Table** (Containers for symbols)
```sql
CREATE TABLE cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,     -- Cost in credits
    image_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'
);
```

#### 3. **`case_symbols` Table** (Many-to-Many Relationships)
```sql
CREATE TABLE case_symbols (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    symbol_id UUID REFERENCES symbols(id) ON DELETE CASCADE,
    weight DECIMAL(5,2) NOT NULL,     -- Probability weight (0-100)
    UNIQUE(case_id, symbol_id)
);
```

#### 4. **`users` Table** (Player data)
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    wallet_address VARCHAR(255),
    credits DECIMAL(10,2) DEFAULT 0,  -- Player balance
    cases_opened INTEGER DEFAULT 0,
    total_spent DECIMAL(10,2) DEFAULT 0,
    total_won DECIMAL(10,2) DEFAULT 0
);
```

#### 5. **`case_openings` Table** (Game history)
```sql
CREATE TABLE case_openings (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    case_id UUID REFERENCES cases(id),
    symbol_id UUID REFERENCES symbols(id),
    symbol_key VARCHAR(255),          -- For backward compatibility
    symbol_name VARCHAR(255),
    symbol_rarity VARCHAR(50),
    case_cost DECIMAL(10,2),
    reward_value DECIMAL(10,2),
    server_seed VARCHAR(255),         -- Provably fair
    client_seed VARCHAR(255),
    nonce INTEGER,
    random_value DECIMAL(10,8),
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🔌 **API Architecture**

### **Admin API Routes:**

#### **1. Cases Management**
- `GET /api/admin/cases` - List all cases
- `POST /api/admin/cases` - Create new case
- `PATCH /api/admin/cases/[id]` - Update case ⚠️ **NEW ROUTE**
- `DELETE /api/admin/cases/[id]` - Delete case

#### **2. Symbols Management**
- `GET /api/admin/symbols` - List all symbols
- `POST /api/admin/symbols` - Create new symbol
- `PATCH /api/admin/symbols/[id]` - Update symbol
- `DELETE /api/admin/symbols/[id]` - Delete symbol

#### **3. File Upload**
- `POST /api/upload-image` - Upload images to Supabase Storage

#### **4. Game API Routes:**
- `POST /api/open-case` - Open case with ADA payment
- `POST /api/open-case-credits` - Open case with credits ⚠️ **MAIN ROUTE**
- `GET /api/cases` - List active cases for players

---

## 🖥️ **Frontend Components**

### **Admin Dashboard** (`/admin`)
```
AdminDashboard (src/app/admin/page.tsx)
├── DashboardOverview (stats)
├── CasesList + CaseConfigurator
├── SymbolLibrary + SymbolEditor + SymbolCreator
└── AdminAnalytics
```

### **Component Structure:**
1. **`AdminDashboard`** - Main container, data loading
2. **`CaseConfigurator`** - Create/edit cases, set probabilities
3. **`SymbolEditor`** - Edit existing symbols
4. **`SymbolCreator`** - Create new symbols
5. **`SymbolLibrary`** - Browse all symbols
6. **`ImageUpload`** - Handle file uploads

---

## 🔄 **Data Flow**

### **1. Admin Dashboard Loading:**
```
AdminDashboard.loadDashboardData()
├── GET /api/admin/stats    → Dashboard statistics
├── GET /api/admin/cases    → All cases with symbols
└── GET /api/admin/symbols  → All symbols
```

### **2. Symbol Update Flow:**
```
SymbolEditor.onSave(formData)
├── ImageUpload → POST /api/upload-image → Supabase Storage
├── formData.imageUrl = uploadedURL
└── PATCH /api/admin/symbols/[id] → Database update
```

### **3. Case Opening Flow:**
```
Player opens case
├── POST /api/open-case-credits
├── Check user credits
├── Get case symbols via case_symbols JOIN
├── Calculate random result (provably fair)
├── Deduct credits, add to inventory
└── Return winning symbol
```

---

## 🔐 **Authentication System**

### **Development Mode:**
```javascript
// In development, authentication is BYPASSED
if (process.env.NODE_ENV === 'development') {
  return { 
    success: true, 
    user: { userId: 'dev-admin', email: 'admin@dev.local' }
  }
}
```

### **Production Mode:**
- JWT tokens required in `Authorization: Bearer <token>` header
- Admin permissions: `manage_cases`, `manage_symbols`, `view_analytics`

---

## ⚠️ **Current Issues & Fixes**

### **1. DEV SERVER ISSUE:**
```bash
# Problem: npm run dev fails
# Cause: Missing scripts in package.json
# Fix: Use Next.js directly
npx next dev
# Or add to package.json:
"scripts": { "dev": "next dev" }
```

### **2. CASE UPDATE API ISSUE:**
```bash
# Problem: PATCH /api/admin/cases/[id] returns 404
# Cause: Route file wasn't created properly
# Status: ✅ FIXED - Route recreated
```

### **3. SYMBOL IMAGE ISSUE:**
```bash
# Problem: Images upload but don't appear
# Cause: Field mapping mismatch (image_url vs imageUrl)
# Status: ✅ FIXED - Added field mapping in API
```

### **4. DATABASE FIELD MAPPING:**
```javascript
// Database uses snake_case, Frontend uses camelCase
// Fixed with mapping in API responses:
{
  imageUrl: symbol.image_url,
  isActive: symbol.is_active,
  createdAt: symbol.created_at,
  updatedAt: symbol.updated_at
}
```

---

## 🚀 **How to Get It Working**

### **1. Start Development Server:**
```bash
# Since npm run dev fails, use:
npx next dev
# Or fix package.json scripts section
```

### **2. Configure Environment:**
```bash
# Create .env.local with your Supabase credentials:
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

### **3. Run Database Setup:**
```bash
# Run migration to create tables:
psql -f sql-scripts/admin-migration-ultra-safe.sql

# Populate with default data:
node setup-defaults.js
```

### **4. Access Admin Dashboard:**
```
http://localhost:3000/admin
```

---

## 🔧 **Debugging Tools**

### **Browser Console Logs:**
- `🔓 Development mode: Setting fake admin token`
- `🖼️ Image uploaded successfully, URL:`
- `🔍 Form submitted with data:`
- `✅ Symbol updated successfully:`

### **Network Tab Monitoring:**
- Check API responses for 200 status codes
- Verify JSON response structure
- Monitor image upload progress

### **Database Queries:**
```sql
-- Check if symbols exist:
SELECT COUNT(*) FROM symbols;

-- Check case-symbol relationships:
SELECT c.name, s.name, cs.weight 
FROM cases c 
JOIN case_symbols cs ON c.id = cs.case_id 
JOIN symbols s ON s.id = cs.symbol_id;
```

---

## 📈 **System Status**

| Component | Status | Notes |
|-----------|--------|-------|
| Database Schema | ✅ Working | Tables created |
| API Routes | ✅ Fixed | PATCH route recreated |
| Admin Dashboard | ✅ Working | Field mapping fixed |
| Image Upload | ✅ Working | Supabase integration |
| Case Opening | ✅ Working | Credits system |
| Symbol Updates | ✅ Working | Database sync |
| Authentication | ⚠️ Bypassed | Development mode |

---

**The system is now functional! Start the dev server with `npx next dev` and access `/admin`** 🎉