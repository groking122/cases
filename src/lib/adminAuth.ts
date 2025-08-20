/**
 * Admin Authentication Middleware
 * JWT verification and permission checking for admin routes
 */

import { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import type { AdminUser, AdminPermission } from '@/types/admin'

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'your-admin-secret-key'

interface TokenPayload {
  userId: string
  email: string
  role: string
  permissions: AdminPermission[]
  iat: number
  exp: number
}

interface AuthResult {
  success: boolean
  user?: TokenPayload
  error?: string
}

export async function verifyAdminToken(
  request: NextRequest, 
  requiredPermissions?: AdminPermission[]
): Promise<AuthResult> {
  try {
    // Optional development bypass (disabled by default)
    if (process.env.ADMIN_DEV_BYPASS === 'true') {
      console.warn('⚠️ ADMIN_DEV_BYPASS enabled: Bypassing admin authentication')
      return {
        success: true,
        user: {
          userId: 'dev-admin',
          email: 'admin@dev.local',
          role: 'admin',
          permissions: ['manage_cases', 'manage_symbols', 'view_analytics'],
          iat: Date.now(),
          exp: Date.now() + 3600000
        }
      }
    }

    // Extract token from Authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { success: false, error: 'No valid authorization token provided' }
    }

    const token = authHeader.replace('Bearer ', '')

    // Check if token is blacklisted
    if (!supabase) {
      return { success: false, error: 'Database configuration error' }
    }
    const { data: blacklistedToken } = await supabase
      .from('admin_token_blacklist')
      .select('id')
      .eq('token_hash', await hashToken(token))
      .single()

    if (blacklistedToken) {
      return { success: false, error: 'Token has been revoked' }
    }

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload

    // Verify user still exists and is active
    const { data: adminUser, error: userError } = await supabase
      .from('admin_users')
      .select('id, email, role, permissions, is_active')
      .eq('id', decoded.userId)
      .single()

    if (userError || !adminUser) {
      return { success: false, error: 'User not found' }
    }

    if (!adminUser.is_active) {
      return { success: false, error: 'User account is deactivated' }
    }

    // Check if required permissions are met
    if (requiredPermissions && requiredPermissions.length > 0) {
      const userPermissions = adminUser.permissions as AdminPermission[]
      const hasPermission = requiredPermissions.every(permission => 
        userPermissions.includes(permission)
      )

      if (!hasPermission) {
        return { 
          success: false, 
          error: `Insufficient permissions. Required: ${requiredPermissions.join(', ')}` 
        }
      }
    }

    return { 
      success: true, 
      user: {
        ...decoded,
        role: adminUser.role,
        permissions: adminUser.permissions
      }
    }

  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return { success: false, error: 'Invalid token' }
    }
    if (error instanceof jwt.TokenExpiredError) {
      return { success: false, error: 'Token expired' }
    }
    
    console.error('Admin token verification error:', error)
    return { success: false, error: 'Token verification failed' }
  }
}

export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export function hasPermission(
  userPermissions: AdminPermission[], 
  requiredPermission: AdminPermission
): boolean {
  return userPermissions.includes(requiredPermission)
}

export function hasAnyPermission(
  userPermissions: AdminPermission[], 
  requiredPermissions: AdminPermission[]
): boolean {
  return requiredPermissions.some(permission => 
    userPermissions.includes(permission)
  )
}

export function hasAllPermissions(
  userPermissions: AdminPermission[], 
  requiredPermissions: AdminPermission[]
): boolean {
  return requiredPermissions.every(permission => 
    userPermissions.includes(permission)
  )
}

// Helper function to extract admin user info from request
export async function getAdminUserFromRequest(request: NextRequest): Promise<TokenPayload | null> {
  const authResult = await verifyAdminToken(request)
  return authResult.success ? authResult.user! : null
}

// Middleware for API routes - use in API route handlers
export function withAdminAuth(
  handler: (request: NextRequest, user: TokenPayload) => Promise<Response>,
  requiredPermissions?: AdminPermission[]
) {
  return async (request: NextRequest): Promise<Response> => {
    const authResult = await verifyAdminToken(request, requiredPermissions)
    
    if (!authResult.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: authResult.error,
          timestamp: new Date().toISOString()
        }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    return handler(request, authResult.user!)
  }
}

// Generate secure admin session
export async function createAdminSession(user: AdminUser): Promise<{
  token: string
  expiresAt: string
}> {
  const tokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    permissions: user.permissions
  }

  const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' })
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  return { token, expiresAt }
}

// Revoke admin session (add to blacklist)
export async function revokeAdminSession(token: string, adminId: string): Promise<void> {
  const tokenHash = await hashToken(token)
  
  // Get token expiration from JWT
  const decoded = jwt.decode(token) as any
  const expiresAt = new Date(decoded.exp * 1000).toISOString()

  if (!supabase) {
    throw new Error('Database configuration error')
  }
  await supabase.from('admin_token_blacklist').insert({
    token_hash: tokenHash,
    admin_id: adminId,
    expires_at: expiresAt,
    created_at: new Date().toISOString()
  })
}