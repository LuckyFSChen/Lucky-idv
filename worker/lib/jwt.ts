/**
 * HS256 JWT 的簽發與驗證（Web Crypto）。
 *
 * 為什麼不直接用 jsonwebtoken：
 *   jsonwebtoken 依賴 node:crypto，在 Workers 上必須開 nodejs_compat 才能跑，
 *   而 wrangler.jsonc 刻意不啟用該 flag。HS256 用 crypto.subtle 實作只需要幾十行，
 *   且與 jsonwebtoken 產出的 token 格式完全相容 —— 只要 JWT_SECRET 相同，
 *   本機 Express 簽發的 token 在 Worker 上也驗得過，反之亦然。
 */

export interface AdminTokenPayload {
  sub: number
  email: string
}

interface JwtClaims extends AdminTokenPayload {
  iat: number
  exp: number
}

const encoder = new TextEncoder()

function base64UrlFromBytes(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlFromString(value: string): string {
  return base64UrlFromBytes(encoder.encode(value))
}

function bytesFromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=')
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret) as unknown as BufferSource,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

/**
 * 解析 '12h' / '30m' / '7d' / '3600'（秒）這類期限字串，回傳秒數。
 * 格式不合法時回退為 12 小時，並保持與原本 Express 端 JWT_EXPIRES_IN 的預設一致。
 */
export function parseExpiresInSeconds(value: string | undefined): number {
  const fallback = 12 * 60 * 60
  if (!value) return fallback

  const match = /^(\d+)\s*([smhd])?$/.exec(value.trim())
  if (!match) return fallback

  const amount = Number(match[1])
  const unit = match[2] ?? 's'
  const multiplier = { s: 1, m: 60, h: 60 * 60, d: 24 * 60 * 60 }[unit] ?? 1
  return amount * multiplier
}

export async function signAdminToken(
  payload: AdminTokenPayload,
  secret: string,
  expiresInSeconds: number,
): Promise<string> {
  const issuedAt = Math.floor(Date.now() / 1000)
  const claims: JwtClaims = { ...payload, iat: issuedAt, exp: issuedAt + expiresInSeconds }

  const signingInput = `${base64UrlFromString(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${base64UrlFromString(
    JSON.stringify(claims),
  )}`

  const key = await importKey(secret)
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(signingInput) as unknown as BufferSource)

  return `${signingInput}.${base64UrlFromBytes(new Uint8Array(signature))}`
}

/**
 * 驗證 token 並回傳 payload。
 *
 * @throws token 結構錯誤、簽章不符或已過期時拋出；呼叫端一律轉成 401，
 *         不區分原因（避免洩漏 token 是「過期」還是「偽造」）。
 */
export async function verifyAdminToken(token: string, secret: string): Promise<AdminTokenPayload> {
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('Malformed token')

  const [headerPart, payloadPart, signaturePart] = parts

  const key = await importKey(secret)
  const valid = await crypto.subtle.verify(
    'HMAC',
    key,
    bytesFromBase64Url(signaturePart) as unknown as BufferSource,
    encoder.encode(`${headerPart}.${payloadPart}`) as unknown as BufferSource,
  )
  if (!valid) throw new Error('Invalid signature')

  const claims = JSON.parse(new TextDecoder().decode(bytesFromBase64Url(payloadPart))) as Partial<JwtClaims>

  if (typeof claims.exp !== 'number' || claims.exp <= Math.floor(Date.now() / 1000)) {
    throw new Error('Token expired')
  }
  if (typeof claims.sub !== 'number' || typeof claims.email !== 'string') {
    throw new Error('Malformed claims')
  }

  return { sub: claims.sub, email: claims.email }
}
