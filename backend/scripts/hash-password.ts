/**
 * 產生管理者密碼雜湊。
 *
 *   npm run hash-password -- "<明碼密碼>"
 *
 * 輸出可直接填入 .env 的 ADMIN_PASSWORD_HASH，再以
 * `npm run d1:admin:sql` 產生 D1 的 upsert SQL。
 *
 * ⚠️ 雜湊演算法與驗證端共用 src/utils/password.ts 的實作（PBKDF2-HMAC-SHA256），
 *    請勿在此另外實作一份，否則產生出來的雜湊可能驗不過。
 */

import { hashPassword } from '../src/utils/password.js'

const password = process.argv[2]

if (!password) {
  console.error('用法：npm run hash-password -- "<明碼密碼>"')
  process.exit(1)
}

console.log(await hashPassword(password))
