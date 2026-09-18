/**
 * 依「環境變數」產生管理者帳號的 upsert SQL，供 D1 初始化使用。
 *
 *   npm run d1:admin:sql
 *
 * 讀取（不得寫死在任何版控檔案中）：
 *   ADMIN_EMAIL          管理者 email
 *   ADMIN_PASSWORD_HASH  bcrypt 雜湊（用 `npm run hash-password -- "<密碼>"` 產生）
 *
 * 輸出檔已被 .gitignore 排除，且內含密碼雜湊 —— **套用完請立即刪除**。
 *
 * 安全性註記：
 *   `POST /api/admin/login` 只比對 AdminUser 表中該列的 passwordHash，完全不讀 .env。
 *   因此**更換 ADMIN_EMAIL 不會停用舊帳號**。本腳本預設會列出將被保留的其他帳號並
 *   提出警告；若要讓新帳號「取代」而非「新增」，請加 `--exclusive`，
 *   它會在 upsert 後刪除所有其他管理者。
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import 'dotenv/config'

const BCRYPT_PATTERN = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/

function fail(message: string): never {
  console.error(`錯誤：${message}`)
  process.exit(1)
}

function sqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`
}

const email = process.env.ADMIN_EMAIL?.trim()
const passwordHash = process.env.ADMIN_PASSWORD_HASH?.trim()
const exclusive = process.argv.includes('--exclusive')

if (!email) fail('未設定 ADMIN_EMAIL。')
if (!passwordHash) fail('未設定 ADMIN_PASSWORD_HASH。')

if (!BCRYPT_PATTERN.test(passwordHash)) {
  fail(
    'ADMIN_PASSWORD_HASH 不像有效的 bcrypt 雜湊（預期形如 $2a$10$...，共 60 字元）。\n' +
      '  請勿填入明碼密碼。產生方式：npm run hash-password -- "<你的密碼>"',
  )
}

const now = '(CAST(strftime(\'%s\', \'now\') AS INTEGER) * 1000)'

const lines = [
  '-- idv-web 管理者帳號',
  '-- 由 backend/scripts/d1-admin-sql.ts 依環境變數產生。',
  '--',
  '-- ⚠️ 本檔案含密碼雜湊，已被 .gitignore 排除。套用後請立即刪除，切勿提交。',
  '',
  `INSERT INTO "AdminUser" ("email", "passwordHash", "createdAt", "updatedAt")`,
  `VALUES (${sqlString(email)}, ${sqlString(passwordHash)}, ${now}, ${now})`,
  `ON CONFLICT("email") DO UPDATE SET`,
  `  "passwordHash" = excluded."passwordHash",`,
  `  "updatedAt"    = excluded."updatedAt";`,
  '',
]

if (exclusive) {
  lines.push(
    '-- --exclusive：移除其他所有管理者帳號，確保只有上面這一組可登入。',
    `DELETE FROM "AdminUser" WHERE "email" <> ${sqlString(email)};`,
    '',
  )
}

const outPath = join(process.cwd(), '.generated', 'd1-admin.sql')
mkdirSync(dirname(outPath), { recursive: true })
writeFileSync(outPath, lines.join('\n'), 'utf8')

console.log(`已輸出：${outPath}`)
console.log(`管理者：${email}`)
if (exclusive) {
  console.log('模式：--exclusive（將刪除其他所有管理者帳號）')
} else {
  console.log(
    '模式：upsert（不會刪除其他管理者帳號）。\n' +
      '  ⚠️ 若曾更換過 ADMIN_EMAIL，舊帳號會留在 D1 中且仍可登入。\n' +
      '     要讓新帳號取代舊帳號，請改用：npm run d1:admin:sql -- --exclusive',
  )
}
console.log('⚠️ 套用完畢後請刪除該檔案（內含密碼雜湊）。')
