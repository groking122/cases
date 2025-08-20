import jwt, { type SignOptions, type JwtPayload, type Secret } from 'jsonwebtoken'

const USER_JWT_SECRET = process.env.USER_JWT_SECRET || 'change-me-user-secret'

export type UserJwtPayload = {
	userId: string
	walletAddress: string
	role: 'user'
}

export function signUserToken(payload: UserJwtPayload, expiresInMinutes: number = 120): string {
	const options: SignOptions = { expiresIn: expiresInMinutes * 60 }
	return jwt.sign(payload as JwtPayload, USER_JWT_SECRET as Secret, options)
}

export function verifyUserToken(token: string): UserJwtPayload | null {
	try {
		const decoded = jwt.verify(token, USER_JWT_SECRET as Secret) as JwtPayload & Partial<UserJwtPayload>
		if (!decoded || (decoded as any).role !== 'user') return null
		return {
			userId: String((decoded as any).userId ?? decoded.sub ?? ''),
			walletAddress: String((decoded as any).walletAddress ?? (decoded as any).wa ?? ''),
			role: 'user'
		}
	} catch {
		return null
	}
}

export function getBearerToken(authorizationHeader: string | null): string | null {
	if (!authorizationHeader) return null
	if (!authorizationHeader.toLowerCase().startsWith('bearer ')) return null
	return authorizationHeader.slice(7).trim()
}


