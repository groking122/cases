import { getBearerToken, verifyUserToken } from '@/lib/userAuth'
import { cookies } from 'next/headers'

export function withUserAuth<T extends (request: Request, ...args: any[]) => any>(handler: T) {
  return async function wrapped(request: any, ...rest: any[]) {
    const hdrAuth = request.headers?.get?.('authorization') || request.headers?.authorization || null
    const headerToken = getBearerToken(hdrAuth)
    let token = headerToken
    if (!token) {
      try {
        token = cookies().get('user_token')?.value || null
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


