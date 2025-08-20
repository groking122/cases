import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { authenticator } from 'otplib'
import { supabaseAdmin } from '@/lib/supabase'
import type { AdminUser, AdminApiResponse } from '@/types/admin'

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'change-me-in-env'
const JWT_EXPIRES_IN = '24h'

interface LoginRequest {
  email: string
  password: string
  mfaCode?: string
}

interface LoginResponse extends AdminApiResponse {
  data?: {
    user: AdminUser
    token: string
    expiresAt: string
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: LoginRequest = await request.json()
    const { email, password, mfaCode } = body

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json<AdminApiResponse>({
        success: false,
        error: 'Email and password are required',
        timestamp: new Date().toISOString()
      }, { status: 400 })
    }

    // Check if admin user exists
    if (!supabaseAdmin) {
      return NextResponse.json<AdminApiResponse>({
        success: false,
        error: 'Database configuration error',
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }

    const { data: adminUser, error: userError } = await supabaseAdmin
      .from('admin_users')
      .select(`
        id,
        email,
        password_hash,
        role,
        permissions,
        is_active,
        mfa_enabled,
        mfa_secret,
        created_at,
        last_login,
        failed_login_attempts,
        locked_until
      `)
      .eq('email', email.toLowerCase())
      .single()

    if (userError || !adminUser) {
      return NextResponse.json<AdminApiResponse>({
        success: false,
        error: 'Invalid credentials',
        timestamp: new Date().toISOString()
      }, { status: 401 })
    }

    // Check if account is active
    if (!adminUser.is_active) {
      return NextResponse.json<AdminApiResponse>({
        success: false,
        error: 'Account is deactivated',
        timestamp: new Date().toISOString()
      }, { status: 401 })
    }

    // Check if account is locked
    if (adminUser.locked_until && new Date(adminUser.locked_until) > new Date()) {
      return NextResponse.json<AdminApiResponse>({
        success: false,
        error: 'Account is temporarily locked due to failed login attempts',
        timestamp: new Date().toISOString()
      }, { status: 401 })
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, adminUser.password_hash)
    if (!isPasswordValid) {
      // Increment failed login attempts
      await incrementFailedLoginAttempts(adminUser.id)
      
      return NextResponse.json<AdminApiResponse>({
        success: false,
        error: 'Invalid credentials',
        timestamp: new Date().toISOString()
      }, { status: 401 })
    }

    // Check MFA if enabled
    if (adminUser.mfa_enabled && !mfaCode) {
      return NextResponse.json<AdminApiResponse>({
        success: false,
        error: 'MFA code required',
        message: 'Please provide your MFA code',
        timestamp: new Date().toISOString()
      }, { status: 200 }) // Not 401 to distinguish from invalid credentials
    }

    if (adminUser.mfa_enabled && mfaCode) {
      const isMfaValid = await verifyMfaCode(adminUser.mfa_secret, mfaCode)
      if (!isMfaValid) {
        return NextResponse.json<AdminApiResponse>({
          success: false,
          error: 'Invalid MFA code',
          timestamp: new Date().toISOString()
        }, { status: 401 })
      }
    }

    // Generate JWT token
    const tokenPayload = {
      userId: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
      permissions: adminUser.permissions
    }

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    // Update last login and reset failed attempts
    await supabaseAdmin
      .from('admin_users')
      .update({
        last_login: new Date().toISOString(),
        failed_login_attempts: 0,
        locked_until: null
      })
      .eq('id', adminUser.id)

    // Log successful login
    await logAdminAction({
      action: 'ADMIN_LOGIN',
      adminId: adminUser.id,
      adminEmail: adminUser.email,
      targetType: 'system',
      targetId: 'auth',
      changes: {},
      ipAddress: getClientIp(request),
      userAgent: request.headers.get('user-agent') || 'unknown'
    })

    // Return success response
    const user: AdminUser = {
      id: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
      permissions: adminUser.permissions,
      createdAt: adminUser.created_at,
      lastLogin: new Date().toISOString()
    }

    return NextResponse.json<LoginResponse>({
      success: true,
      data: {
        user,
        token,
        expiresAt
      },
      message: 'Login successful',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Admin login error:', error)
    return NextResponse.json<AdminApiResponse>({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// Logout endpoint
export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json<AdminApiResponse>({
        success: false,
        error: 'No token provided',
        timestamp: new Date().toISOString()
      }, { status: 401 })
    }

    // Verify and decode token
    const decoded = jwt.verify(token, JWT_SECRET) as any
    
    if (!supabaseAdmin) {
      return NextResponse.json<AdminApiResponse>({
        success: false,
        error: 'Database configuration error',
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }
    
    // Add token to blacklist (implement token blacklist table)
    await supabaseAdmin
      .from('admin_token_blacklist')
      .insert({
        token_hash: await bcrypt.hash(token, 10),
        admin_id: decoded.userId,
        expires_at: new Date(decoded.exp * 1000).toISOString(),
        created_at: new Date().toISOString()
      })

    // Log logout
    await logAdminAction({
      action: 'ADMIN_LOGOUT',
      adminId: decoded.userId,
      adminEmail: decoded.email,
      targetType: 'system',
      targetId: 'auth',
      changes: {},
      ipAddress: getClientIp(request),
      userAgent: request.headers.get('user-agent') || 'unknown'
    })

    return NextResponse.json<AdminApiResponse>({
      success: true,
      message: 'Logout successful',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Admin logout error:', error)
    return NextResponse.json<AdminApiResponse>({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// Helper Functions
async function incrementFailedLoginAttempts(adminId: string) {
  if (!supabaseAdmin) {
    return
  }
  const { data: admin } = await supabaseAdmin
    .from('admin_users')
    .select('failed_login_attempts')
    .eq('id', adminId)
    .single()

  const failedAttempts = (admin?.failed_login_attempts || 0) + 1
  const lockUntil = failedAttempts >= 5 
    ? new Date(Date.now() + 30 * 60 * 1000).toISOString() // Lock for 30 minutes
    : null

  await supabaseAdmin
    .from('admin_users')
    .update({
      failed_login_attempts: failedAttempts,
      locked_until: lockUntil
    })
    .eq('id', adminId)
}

async function verifyMfaCode(secret: string, code: string): Promise<boolean> {
  if (!secret || !code) return false
  try {
    // Allow small time drift (default window=1 is usually fine)
    return authenticator.verify({ token: String(code), secret })
  } catch {
    return false
  }
}

async function logAdminAction(action: {
  action: string
  adminId: string
  adminEmail: string
  targetType: string
  targetId: string
  changes: Record<string, any>
  ipAddress: string
  userAgent: string
}) {
  if (!supabaseAdmin) {
    console.error('Database configuration error - cannot log admin action')
    return
  }
  
  const checksum = await generateChecksum(action)
  
  await supabaseAdmin.from('admin_audit_logs').insert({
    ...action,
    checksum,
    timestamp: new Date().toISOString()
  })
}

async function generateChecksum(data: any): Promise<string> {
  const dataString = JSON.stringify(data, Object.keys(data).sort())
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(dataString)
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  if (realIp) {
    return realIp
  }
  
  return 'unknown'
}