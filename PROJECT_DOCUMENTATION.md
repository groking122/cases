# Case Opening Site - Complete Project Documentation

## 📋 Project Overview

This is a **Cardano-based case opening application** built with Next.js, React, and Supabase. Users can connect their Cardano wallets, purchase credits, and open cases to win various rewards with different rarities and values.

## 🏗️ Architecture & Tech Stack

### Frontend
- **Framework**: Next.js 14 with App Router
- **UI**: React with TypeScript
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Wallet Integration**: Mesh SDK for Cardano wallets
- **State Management**: React useState/useEffect hooks

### Backend
- **API**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Wallet Connection**: CIP-30 standard (Cardano Improvement Proposal)
- **Rate Limiting**: Custom middleware for case opening

### Database Schema
- **users**: Stores user wallet addresses, credits, cases opened
- **cases**: Available case types with prices and metadata
- **case_symbols**: Items that can be won from cases with weights/probabilities
- **symbols**: Individual reward items with rarity and value

## 🔧 Key Features Implemented

### 1. Wallet Connection System
- **Dual Implementation**: Direct CIP-30 integration + Mesh SDK
- **Multi-wallet Support**: Nami, Eternl, and other CIP-30 wallets
- **Address Validation**: Flexible validation for different Cardano address formats
- **Connection State Management**: Persistent wallet connection across components

### 2. Credit Management
- **User Credits**: Stored in database, fetched via API
- **Credit Purchase**: Integration for buying credits with ADA
- **Balance Display**: Real-time credit and ADA balance updates
- **Credit Validation**: Server-side validation for all transactions

### 3. Case Opening Mechanics
- **Probabilistic System**: Weighted random selection of rewards
- **Case Types**: Multiple case categories with different price points
- **Reward System**: Items with varying rarity and value
- **Animation System**: Smooth case opening animations
- **Result Display**: Modal showing won items and statistics

### 4. Database Integration
- **User Management**: Automatic user creation on wallet connection
- **Transaction Logging**: All case openings are recorded
- **Inventory System**: User inventory tracking (planned)
- **Security**: Server-side validation and rate limiting

## 📁 File Structure & Components

### Core Application Files

#### `/src/app/page.tsx` - Main Application Component
**Purpose**: Central hub managing all application state and user interactions

**Key Responsibilities**:
- **Wallet State Management**: Connection status, selected wallet, wallet address
- **Credit Management**: User credits, balance updates, credit fetching
- **Case Opening Logic**: Case selection, opening process, result handling
- **UI State**: Active tabs, modals, error/success messages
- **Component Orchestration**: Coordinating between all child components

**Critical Functions**:
```typescript
- loadWallets(): Detects available Cardano wallets
- connectWallet(): Handles wallet connection via CIP-30
- loadUserCredits(): Fetches user credits from API
- openCaseWithCredits(): Manages case opening process
- loadCases(): Fetches available cases from database
```

**State Management**:
- `connected`: Wallet connection status
- `walletAddress`: Connected wallet's address
- `credits`: User's current credit balance
- `selectedCase`: Currently selected case for opening
- `cases`: Array of available cases
- `caseResult`: Result of last case opening

#### `/src/components/WalletBalance.tsx` - Balance Display Component
**Purpose**: Shows user's ADA and credit balances with real-time updates

**Key Features**:
- **External State Integration**: Accepts props from parent for synchronized display
- **Automatic Refresh**: Polls for balance updates every 15 seconds
- **Animation System**: Smooth transitions for balance changes
- **Error Handling**: Graceful error display and retry mechanisms
- **Debug Features**: Development mode debugging tools

**Integration Logic**:
- Uses both Mesh SDK hooks and external props
- Prioritizes external connection state over internal state
- Supports manual refresh and instant updates

#### `/src/components/CaseSelector.tsx` - Case Selection Interface
**Purpose**: Displays available cases with selection functionality

**Features**:
- **Loading States**: Skeleton loading animations
- **Case Information**: Price, description, and visual presentation
- **Selection Logic**: Visual feedback for selected cases
- **Credit Validation**: Shows affordability status

#### `/src/components/CreditPacks.tsx` - Credit Purchase System
**Purpose**: Handles credit purchases with ADA payments

**Payment Flow**:
1. User selects credit pack
2. Wallet transaction is initiated
3. Payment is verified on-chain
4. Credits are added to user account
5. UI is updated with new balance

### API Routes

#### `/src/app/api/get-credits/route.ts` - Credit Fetching API
**Purpose**: Retrieves user credits and handles user creation

**Logic Flow**:
1. **Input Validation**: Validates wallet address format
2. **User Lookup**: Searches for existing user in database
3. **User Creation**: Creates new user if not found
4. **Credit Response**: Returns current credit balance

**Error Handling**:
- Invalid wallet address formats
- Database connection issues
- User creation failures (with temporary workaround)

**Temporary Workaround**: Returns 100 demo credits if database constraint fails

#### `/src/app/api/open-case-credits/route.ts` - Case Opening API
**Purpose**: Handles case opening logic and reward distribution

**Complex Logic**:
1. **Validation**: Wallet address and case ID validation
2. **User Verification**: Ensures user exists and has sufficient credits
3. **Case Data**: Fetches case information and available symbols
4. **Probability Calculation**: Weighted random selection of rewards
5. **Transaction**: Deducts credits, adds winnings, updates user stats
6. **Response**: Returns won item and new credit balance

**Rate Limiting**: Prevents spam and ensures fair play

#### `/src/app/api/cases/route.ts` - Case Data API
**Purpose**: Fetches available cases from database

**Data Processing**:
- Retrieves active cases with metadata
- Calculates case statistics (symbol counts)
- Formats response for frontend consumption

### Database Schema & Logic

#### Users Table
```sql
- id: Primary key
- wallet_address: Cardano wallet address (with constraints)
- username: Generated username
- credits: Current credit balance
- cases_opened: Total cases opened
- created_at: Account creation timestamp
- is_active: Account status
```

#### Cases Table
```sql
- id: Case identifier
- name: Case display name
- description: Case description
- price: Credit cost to open
- image_url: Case visual
- is_active: Availability status
```

#### Symbols Table (Rewards)
```sql
- id: Symbol identifier
- name: Item name
- rarity: Rarity level (common, rare, epic, legendary)
- value: Credit value of item
- image_url: Item visual
- emoji: Display emoji
```

#### Case_Symbols Table (Probability Mapping)
```sql
- case_id: Reference to case
- symbol_id: Reference to symbol/reward
- weight: Probability weight for selection
```

## 🔄 Application Flow

### 1. Initial Load
```
User visits site → Load available wallets → Display wallet options → Load cases from database
```

### 2. Wallet Connection
```
User selects wallet → CIP-30 connection → Get wallet address → Fetch user credits → Update UI
```

### 3. Case Opening Process
```
User selects case → Validates credits → Sends opening request → Server calculates reward → Updates database → Returns result → Displays animation
```

### 4. Credit Management
```
User wants credits → Selects pack → Initiates ADA payment → Transaction confirmed → Credits added → Balance updated
```

## 🚨 Known Issues & Workarounds

### Database Constraint Issues
**Problem**: Supabase database has strict wallet address validation that rejects some valid Cardano addresses

**Symptoms**:
- "violates check constraint users_wallet_address_check" errors
- 500 Internal Server Error when creating users
- Credits not loading after wallet connection

**Temporary Workarounds Implemented**:
1. **get-credits API**: Returns 100 demo credits if constraint fails
2. **open-case-credits API**: Creates temporary demo user for case opening
3. **Error Logging**: Detailed logging for debugging

**Permanent Solution**:
```sql
-- Run in Supabase SQL Editor
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_wallet_address_check;
```

### Wallet Address Format Compatibility
**Issue**: Different Cardano wallets use different address formats
- Mainnet: `addr1...`
- Testnet: `addr_test1...`
- Legacy: `DdzFF...`
- Stake: `stake1...`

**Solution**: Flexible validation that accepts multiple formats

## 🎮 User Experience Features

### Visual Feedback
- **Loading States**: Skeleton loaders for all data fetching
- **Animations**: Smooth transitions and feedback animations
- **Error Messages**: Clear, user-friendly error descriptions
- **Success Notifications**: Confirmation of successful actions

### Responsive Design
- **Mobile-First**: Optimized for mobile devices
- **Tablet Support**: Adaptive layout for tablets
- **Desktop Enhanced**: Full features on desktop

### Accessibility
- **Keyboard Navigation**: Full keyboard support
- **Screen Reader**: Semantic HTML and ARIA labels
- **Color Contrast**: WCAG compliant color schemes

## 🔧 Development Tools & Debug Features

### Debug Panel (Development Mode)
Located in main page, shows:
- Current wallet address
- Credit balance in state
- Number of cases loaded
- Connection status
- Selected case information
- Manual refresh buttons

### Console Logging
Comprehensive logging throughout the application:
- `🚀` - Application lifecycle events
- `💰` - Credit and balance operations
- `🔗` - Wallet connection events
- `🎲` - Case opening logic
- `❌` - Error conditions
- `✅` - Successful operations
- `🚧` - Temporary workarounds

### Error Handling Strategy
1. **User-Friendly Messages**: Never show technical errors to users
2. **Detailed Logging**: Comprehensive server and client logs
3. **Graceful Degradation**: App continues working with limited functionality
4. **Retry Mechanisms**: Automatic retries for failed operations

## 🚀 Deployment Considerations

### Environment Variables Needed
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
NEXT_PUBLIC_PAYMENT_ADDRESS=your_cardano_address
```

### Production Checklist
- [ ] Remove debug logging
- [ ] Remove temporary workarounds
- [ ] Fix database constraints
- [ ] Set up proper error monitoring
- [ ] Configure rate limiting
- [ ] Set up SSL certificates
- [ ] Test wallet compatibility

## 🔮 Future Enhancements

### Planned Features
1. **Inventory System**: Store and display won items
2. **Trading System**: Allow users to trade items
3. **Leaderboards**: Display top players and statistics
4. **Social Features**: User profiles and achievements
5. **Mobile App**: React Native mobile application
6. **Multi-language**: Internationalization support

### Technical Improvements
1. **Caching**: Redis for improved performance
2. **CDN**: Asset delivery optimization
3. **Analytics**: User behavior tracking
4. **A/B Testing**: Feature experimentation
5. **Performance Monitoring**: Real-time performance metrics

## 📞 Support & Maintenance

### Common User Issues
1. **Wallet Not Connecting**: Check wallet installation and permissions
2. **Credits Not Loading**: Database constraint issue - apply SQL fix
3. **Case Opening Fails**: Usually database-related, check server logs
4. **Balance Not Updating**: Refresh browser or check wallet connection

### Monitoring Points
- Database connection health
- API response times
- Error rates by endpoint
- User wallet connection success rates
- Case opening success/failure rates

---

**Last Updated**: January 2025
**Version**: 1.0.0
**Status**: Development with temporary workarounds in place