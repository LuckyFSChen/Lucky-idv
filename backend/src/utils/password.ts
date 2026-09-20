/**
 * 密碼雜湊 / 驗證（PBKDF2-HMAC-SHA256，Web Crypto）。
 *
 * 為什麼不是 bcrypt：
 *   bcryptjs 是純 JS 實作，在 Cloudflare Workers 上 cost 10 需要約 100～300ms CPU，
 *   會撞上 Workers 的單次請求 CPU 限制。PBKDF2 走 crypto.subtle 是 runtime 原生實作，
 *   在 Workers 上以毫秒計，且 Node 18+ 也提供同一組 Web Crypto API，
 *   因此 Express（本機開發）與 Worker（production）可以共用這個模組，不必各寫一份。
 *
 * ⚠️ 迭代次數固定為 100,000：這是 Cloudflare Workers 對 PBKDF2 允許的上限，
 *    調高會在 production 直接拋錯。雜湊字串本身帶有迭代次數，
 *    未來若上限放寬，舊雜湊仍可正確驗證。
 *
 * 雜湊格式（自描述，單一字串存進 AdminUser.passwordHash）：
 *   pbkdf2$sha256$<iterations>$<salt base64>$<derived key base64>
 */

const ALGORITHM = 'PBKDF2'
const HASH = 'SHA-256'
const ITERATIONS = 100_000
const KEY_LENGTH_BITS = 256
const SALT_BYTES = 16

/** 可辨識本模組產生的雜湊；d1-admin-sql.ts 以此驗證環境變數。 */
export const PASSWORD_HASH_PATTERN = /^pbkdf2\$sha256\$\d+\$[A-Za-z0-9+/]+={0,2}\$[A-Za-z0-9+/]+={0,2}$/

/** 舊的 bcrypt 雜湊（$2a$ / $2b$ / $2y$）。本模組不再驗證這種格式，只用於給出明確錯誤訊息。 */
const LEGACY_BCRYPT_PATTERN = /^\$2[aby]\$\d{2}\$/

export function isLegacyBcryptHash(stored: string): boolean {
  return LEGACY_BCRYPT_PATTERN.test(stored)
}

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

async function deriveKey(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    ALGORITHM,
    false,
    ['deriveBits'],
  )

  const bits = await crypto.subtle.deriveBits(
    // salt 直接傳 Uint8Array：Node 與 Workers 的 Web Crypto 都接受。
    // 刻意不寫 `as BufferSource` —— backend 的 tsconfig 沒有載入 DOM lib，會找不到該型別。
    { name: ALGORITHM, salt, iterations, hash: HASH },
    keyMaterial,
    KEY_LENGTH_BITS,
  )

  return new Uint8Array(bits)
}

/**
 * 以固定時間比較兩段 bytes，避免依比較耗時推測雜湊內容。
 * 長度不同直接回 false（長度本身不是機密）。
 */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i]
  return diff === 0
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const derived = await deriveKey(password, salt, ITERATIONS)
  return `pbkdf2$sha256$${ITERATIONS}$${toBase64(salt)}$${toBase64(derived)}`
}

/**
 * 驗證密碼。
 *
 * @throws 當 stored 是舊的 bcrypt 雜湊時拋出，呼叫端應轉成明確的操作指引
 *         （而不是讓使用者看到「帳號或密碼錯誤」而誤以為是打錯密碼）。
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (isLegacyBcryptHash(stored)) {
    throw new Error(
      '此帳號仍是舊的 bcrypt 密碼雜湊，Workers 已不再支援。' +
        '請以 `npm run hash-password -- "<密碼>"` 重新產生後套用到資料庫。',
    )
  }

  const parts = stored.split('$')
  if (parts.length !== 5 || parts[0] !== 'pbkdf2' || parts[1] !== 'sha256') return false

  const iterations = Number(parts[2])
  if (!Number.isInteger(iterations) || iterations <= 0) return false

  const salt = fromBase64(parts[3])
  const expected = fromBase64(parts[4])
  const derived = await deriveKey(password, salt, iterations)

  return timingSafeEqual(derived, expected)
}
