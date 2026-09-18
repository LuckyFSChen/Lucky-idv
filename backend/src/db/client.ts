/**
 * Database client abstraction.
 *
 * 這是取得 PrismaClient 的**唯一入口**。application layer 不應自行 `new PrismaClient()`。
 *
 *   Node（本機開發 / 現有 Express）  getPrisma()          → SQLite（DATABASE_URL）
 *   Cloudflare Workers               getPrisma({ DB })    → D1（@prisma/adapter-d1）
 *
 * 兩條路徑都回傳同一個 `PrismaClient` 型別，因此 routes、schemas、utils 完全不需要
 * 知道底層是 SQLite 還是 D1 —— 這也是 API contract 得以維持不變的原因。
 *
 * ⚠️ 本模組刻意**不在 module 層建立任何 client**。
 *    Workers 的 D1 binding 只存在於 `fetch(request, env, ctx)` 的 `env`，
 *    module 載入時取不到；若在此處 `new PrismaClient()` 會在 Worker 啟動時就爆掉。
 *    Node 端的相容包裝見 `../db.ts`。
 */

import type { D1Database } from '@cloudflare/workers-types'
import { PrismaD1 } from '@prisma/adapter-d1'
import { PrismaClient } from '@prisma/client'

/** Worker 的 env 中與資料庫有關的部分（見 wrangler.jsonc 的 d1_databases binding）。 */
export interface DatabaseEnv {
  DB?: D1Database
}

/**
 * Node 端的 process-wide 單例。
 *
 * Workers **不使用**這個變數：每個 isolate 的 env 可能不同，且 D1 binding 的
 * 生命週期屬於單次 request，不應跨 request 快取。
 */
let nodeClient: PrismaClient | undefined

/**
 * 取得 PrismaClient。
 *
 * @param env 傳入 Worker 的 env（含 D1 binding）時走 D1；省略時走 Node + SQLite。
 */
export function getPrisma(env?: DatabaseEnv): PrismaClient {
  if (env?.DB) {
    // D1 路徑：每次呼叫建立新的 client，綁定該次 request 的 D1 binding。
    // PrismaD1 內部使用 Workers 原生的 D1 binding（env.DB），
    // 不經過 Cloudflare REST API。
    return new PrismaClient({ adapter: new PrismaD1(env.DB) })
  }

  // Node 路徑：沿用既有行為（DATABASE_URL → SQLite 檔案），process 內共用單例。
  nodeClient ??= new PrismaClient()
  return nodeClient
}

/**
 * 僅供測試／腳本在明確需要時重置 Node 單例。正式程式碼不應呼叫。
 */
export async function disconnectNodePrisma(): Promise<void> {
  if (nodeClient) {
    await nodeClient.$disconnect()
    nodeClient = undefined
  }
}
