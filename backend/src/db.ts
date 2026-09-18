/**
 * Node（Express）端的資料庫入口。
 *
 * 行為與遷移前完全相同：`prisma` 仍是 process 內共用的單一 PrismaClient，
 * 連線目標仍由 `DATABASE_URL` 決定（本機開發 = SQLite 檔案）。
 * 現有的 routes / tests 不需要任何修改。
 *
 * 實際的 client 建立邏輯已抽到 `./db/client.ts`，那裡同時支援 Node（SQLite）
 * 與 Cloudflare Workers（D1 adapter）兩條路徑。
 *
 * ⚠️ Worker **不應** import 本檔案 —— 這裡會在 module 載入時就建立 Node client。
 *    Worker 請改 import `./db/client.js` 的 `getPrisma(env)`。
 */

import { getPrisma } from './db/client.js'

export { getPrisma, disconnectNodePrisma, type DatabaseEnv } from './db/client.js'

export const prisma = getPrisma()
