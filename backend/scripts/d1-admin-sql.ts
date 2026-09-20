/**
 * 依「環境變數」產生管理者帳號的 upsert SQL，供 D1 初始化使用。
 *
 *   npm run d1:admin:sql
 *
 * 讀取（不得寫死在任何版控檔案中）：
 *   ADMIN_EMAIL          管理者 email
 *   ADMIN_PASSWORD_HASH  PBKDF2 雜湊（用 `npm run hash-password -- "<密碼>"` 產生）
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
import { PASSWORD_HASH_PATTERN } from '../src/utils/password.js'



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

if (!PASSWORD_HASH_PATTERN.test(passwordHash)) {
  fail(
    'ADMIN_PASSWORD_HASH 不像有效的密碼雜湊（預期形如 pbkdf2$sha256$100000$<salt>$<hash>）。\n' +
      '  請勿填入明碼密碼。產生方式：npm run hash-password -- "<你的密碼>"\n' +
      '  若你手上是舊的 bcrypt 雜湊（$2a$10$...），Workers 已不再支援，請重新產生。',
  )
}

/**
 * DateTime 欄位一律寫成 **ISO-8601 字串**（SQLite 的 text storage class）。
 *
 * ⚠️ 這裡曾經寫成整數 epoch 毫秒，結果 Prisma 透過 @prisma/adapter-d1 讀回時炸掉：
 *      Inconsistent column data: Could not convert value 1789909892000
 *      of the field `createdAt` to type `DateTime`
 *    造成 POST /api/admin/login 回 500。
 *
 *    原因是「本機 SQLite 檔案（Prisma 原生 connector）」與「D1（driver adapter）」
 *    的儲存慣例不同：前者存整數毫秒，後者要 ISO 字串。d1-export-seed.ts 產生的
 *    內容資料一直都是 ISO 字串（`value.toISOString()`），所以那些表都正常，
 *    只有本腳本產生的 AdminUser 例外。
 *
 *    strftime('%Y-%m-%dT%H:%M:%fZ','now') 的輸出與 JS 的 toISOString() 同形
 *    （2026-09-20T13:20:32.002Z），兩支腳本因此一致。
 */
const now = "strftime('%Y-%m-%dT%H:%M:%fZ', 'now')"

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
  '-- 修復既有資料：舊版本的本腳本把時間戳寫成整數 epoch 毫秒，',
  '-- Prisma 的 D1 adapter 讀不回來（會讓登入直接回 500）。',
  '-- 只改寫「不是文字」的列，已經正確的列不受影響。',
  `UPDATE "AdminUser" SET "createdAt" = ${now} WHERE typeof("createdAt") <> 'text';`,
  `UPDATE "AdminUser" SET "updatedAt" = ${now} WHERE typeof("updatedAt") <> 'text';`,
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
