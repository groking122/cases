import { getBearerToken, verifyUserToken } from '@/lib/userAuth'

export function withUserAuth<T extends (request: Request, ...args: any[]) => any>(handler: T) {
  return async function wrapped(request: any, ...rest: any[]) {
    const hdrAuth = request.headers?.get?.('authorization') || request.headers?.authorization || null
    const headerToken = getBearerToken(hdrAuth)
    let token = headerToken
    if (!token) {
      // Fallback: read cookie from request headers for broad Next.js compatibility
      try {
        const cookieHeader = request.headers?.get?.('cookie') || request.headers?.cookie || ''
        if (cookieHeader && typeof cookieHeader === 'string') {
          const parts = cookieHeader.split(';')
          for (const part of parts) {
            const [k, ...restVal] = part.trim().split('=')
            if (k === 'user_token') {
              token = decodeURIComponent(restVal.join('='))
              break
            }
          }
        }
      } catch {
        token = null
      }
    }
    const payload = token ? verifyUserToken(token) : null
    if (!payload) {
      const resBody = JSON.stringify({ error: 'Missing or invalid token' })
      return new Response(resBody, { status: 401, headers: { 'Content-Type': 'application/json' } })
    }
    ;(request as any).user = { id: payload.userId, wallet: payload.walletAddress }
    return handler(request, ...rest)
  }
}


