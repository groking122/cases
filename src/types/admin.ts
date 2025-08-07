/**
 * Admin Dashboard Type Definitions
 * Professional admin system for case opening management
 */

export interface AdminUser {
  id: string
  email: string
  role: 'super_admin' | 'admin' | 'content_manager'
  permissions: AdminPermission[]
  createdAt: string
  lastLogin: string
}

export type AdminPermission = 
  | 'manage_cases'
  | 'manage_symbols' 
  | 'edit_probabilities'
  | 'view_analytics'
  | 'manage_users'
  | 'system_settings'

export interface CaseConfig {
  id: string
  name: string
  description: string
  price: number
  imageUrl: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  symbols: CaseSymbolWeight[]
  metadata: {
    totalOpenings: number
    averageValue: number
    lastModified: string
    modifiedBy: string
  }
}

export interface CaseSymbolWeight {
  symbolId: string
  weight: number // 0-100, must sum to 100 for the case
  symbol: Symbol // Populated symbol data
}

export interface Symbol {
  id: string
  name: string
  description: string
  imageUrl: string
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  value: number // Credit value
  isActive: boolean
  createdAt: string
  updatedAt: string
  metadata: {
    totalDropped: number
    averageOpenPrice: number
    popularity: number
  }
}

export interface ProbabilityUpdate {
  caseId: string
  changes: Array<{
    symbolId: string
    oldWeight: number
    newWeight: number
  }>
  adminId: string
  reason: string
  checksum: string
}

export interface AdminAuditLog {
  id: string
  action: AdminAction
  adminId: string
  adminEmail: string
  targetType: 'case' | 'symbol' | 'user' | 'system'
  targetId: string
  changes: Record<string, { old: any; new: any }>
  timestamp: string
  ipAddress: string
  userAgent: string
  checksum: string
}

export type AdminAction = 
  | 'CREATE_CASE'
  | 'UPDATE_CASE'
  | 'DELETE_CASE'
  | 'CREATE_SYMBOL'
  | 'UPDATE_SYMBOL'
  | 'DELETE_SYMBOL'
  | 'UPDATE_PROBABILITIES'
  | 'TOGGLE_CASE_STATUS'
  | 'BULK_IMPORT'
  | 'SYSTEM_MAINTENANCE'
  | 'USER_ACTION'

export interface AdminDashboardStats {
  totalCases: number
  activeCases: number
  totalSymbols: number
  todayOpenings: number
  totalRevenue: number
  averageSessionTime: number
  topPerformingCase: {
    id: string
    name: string
    openings: number
  }
  recentActivity: AdminAuditLog[]
}

export interface ProbabilityValidationResult {
  isValid: boolean
  totalWeight: number
  errors: string[]
  warnings: string[]
  distribution: Array<{
    rarity: string
    percentage: number
    expectedValue: number
  }>
}

export interface CaseTestResult {
  caseId: string
  iterations: number
  results: Array<{
    symbolId: string
    count: number
    percentage: number
    expectedPercentage: number
    deviation: number
  }>
  averageValue: number
  valueDistribution: {
    min: number
    max: number
    median: number
    standardDeviation: number
  }
}

// Admin API Response Types
export interface AdminApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  timestamp: string
  checksum?: string
}

export interface AdminListResponse<T> extends AdminApiResponse {
  data: {
    items: T[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }
}

// Form Types for Admin UI
export interface CaseFormData {
  name: string
  description: string
  price: number
  imageUrl: string
  isActive: boolean
  symbols: Array<{
    symbolId: string
    weight: number
  }>
}

export interface SymbolFormData {
  name: string
  description: string
  imageUrl: string
  rarity: Symbol['rarity']
  value: number
  isActive: boolean
}

export interface ProbabilityFormData {
  caseId: string
  symbols: Array<{
    symbolId: string
    weight: number
  }>
  reason: string
}

// Admin Dashboard Component Props
export interface AdminPageProps {
  user: AdminUser
  permissions: AdminPermission[]
}

export interface CaseConfiguratorProps {
  existingCase?: CaseConfig
  symbols: Symbol[]
  onSave: (data: CaseFormData) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export interface ProbabilityMatrixProps {
  caseId: string
  currentWeights: CaseSymbolWeight[]
  availableSymbols: Symbol[]
  onUpdate: (data: ProbabilityFormData) => Promise<void>
  onTest: (caseId: string, iterations: number) => Promise<CaseTestResult>
}

export interface SymbolLibraryProps {
  symbols: Symbol[]
  onEdit: (symbol: Symbol) => void
  onCreate: () => void
  onDelete: (symbolId: string) => Promise<void>
  onToggleActive: (symbolId: string, isActive: boolean) => Promise<void>
}

export interface AdminAnalyticsProps {
  stats: AdminDashboardStats
  dateRange: {
    start: Date
    end: Date
  }
  onDateRangeChange: (range: { start: Date; end: Date }) => void
}

// Utility Types
export type AdminRole = AdminUser['role']
export type AdminActionType = AdminAction
export type SymbolRarity = Symbol['rarity']
export type CaseStatus = 'active' | 'inactive' | 'maintenance'

// Constants
export const ADMIN_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
  super_admin: [
    'manage_cases',
    'manage_symbols',
    'edit_probabilities',
    'view_analytics',
    'manage_users',
    'system_settings'
  ],
  admin: [
    'manage_cases',
    'manage_symbols',
    'edit_probabilities',
    'view_analytics'
  ],
  content_manager: [
    'manage_cases',
    'manage_symbols',
    'view_analytics'
  ]
}

export const RARITY_CONFIG = {
  common: { color: '#6b7280', weight: 60, label: 'Common' },
  uncommon: { color: '#10b981', weight: 25, label: 'Uncommon' },
  rare: { color: '#3b82f6', weight: 10, label: 'Rare' },
  epic: { color: '#8b5cf6', weight: 4, label: 'Epic' },
  legendary: { color: '#f59e0b', weight: 1, label: 'Legendary' }
} as const