import jwt from 'jsonwebtoken'

export interface AdminTokenPayload {
  sub: number
  email: string
}

function getSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET is not set')
  }
  return secret
}

export function signAdminToken(payload: AdminTokenPayload): string {
  const expiresIn = process.env.JWT_EXPIRES_IN ?? '12h'
  return jwt.sign(payload, getSecret(), { expiresIn } as jwt.SignOptions)
}

export function verifyAdminToken(token: string): AdminTokenPayload {
  return jwt.verify(token, getSecret()) as unknown as AdminTokenPayload
}
