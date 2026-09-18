/**
 * Cloudflare Worker — entry point
 *
 * 目前階段（Static Assets + Worker 基礎建置）的職責：
 *
 *   1. 原生提供 GET /api/health，與現有 Express 實作的回應完全一致（{ "status": "ok" }）
 *   2. 讓 /api/* 與 /uploads/* 不被 Static Assets 的 SPA fallback 吞掉
 *   3. 本機開發時，可選擇性把尚未遷移的 /api/*、/uploads/* 轉發到仍在運行的
 *      Express backend（透過 .dev.vars 的 API_PROXY_ORIGIN），
 *      讓 `wrangler dev` 能完整驗證整個站台
 *
 * 其餘所有路徑都不會進到這裡 —— wrangler.jsonc 的 assets.run_worker_first
 * 只把上述兩組前綴導向 Worker，靜態檔與 SPA fallback 由 Static Assets 直接處理。
 *
 * ⚠️ 本檔案刻意不引入 Express / Prisma / 任何 Node.js 專用 API。
 *    API 的實際遷移屬於後續 Phase，見 CLOUDFLARE_MIGRATION_PLAN.md（P6 / P7 / P8）。
 */

export interface Env {
  /**
   * D1 binding（wrangler.jsonc 的 d1_databases）。
   *
   * 資料存取路徑固定為：
   *
   *     Worker → env.DB → @prisma/adapter-d1 → D1
   *
   * 也就是使用 Workers 原生的 D1 binding，**不經過 Cloudflare REST API**。
   *
   * 取得 client 一律透過 backend/src/db/client.ts 的 `getPrisma(env)`，
   * application layer 不得自行 `new PrismaClient()`：
   *
   *     import { getPrisma } from '../backend/src/db/client.js'
   *     const prisma = getPrisma(env)
   *     const profile = await prisma.profile.findFirst({ orderBy: { id: 'asc' } })
   *
   * ⚠️ 目前 /api/* 尚未遷移到 Worker（見 CLOUDFLARE_MIGRATION_PLAN.md 的 P6），
   *    因此本檔案還沒有任何查詢會用到這個 binding。D1 這條路徑目前由
   *    backend/src/__tests__/d1.adapter.test.ts 以 miniflare 驗證。
   */
  DB?: D1Database

  /**
   * 僅供本機開發使用，於 `.dev.vars` 設定（例如 http://localhost:3001）。
   *
   * 未設定時（＝production 的預期狀態），尚未遷移的 API 會回傳 501，
   * 而不是靜默地回傳錯誤資料或 HTML。
   */
  API_PROXY_ORIGIN?: string
}

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' } as const

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS })
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const { pathname } = url

    // 與現有 Express 契約一致：backend/src/app.ts 的 app.get('/api/health', ...)
    if (pathname === '/api/health' && request.method === 'GET') {
      return json({ status: 'ok' })
    }

    const isApi = pathname.startsWith('/api/')
    const isUploads = pathname.startsWith('/uploads/')

    if (isApi || isUploads) {
      // 本機開發：轉發給仍在 3001 埠運行的 Express backend。
      // 這不改變 uploads 的儲存方式 —— 檔案依舊由 Express 從本機磁碟提供。
      if (env.API_PROXY_ORIGIN) {
        const target = new URL(pathname + url.search, env.API_PROXY_ORIGIN)
        return fetch(new Request(target, request))
      }

      if (isUploads) {
        return new Response('Not Found', { status: 404 })
      }

      return json(
        {
          error:
            '此 API 尚未遷移至 Cloudflare Workers；目前僅提供 /api/health。' +
            '本機開發請於 .dev.vars 設定 API_PROXY_ORIGIN 以轉發至 Express backend。',
        },
        501,
      )
    }

    // 正常情況不會執行到這裡（run_worker_first 只導入上述兩組前綴）。
    return new Response('Not Found', { status: 404 })
  },
} satisfies ExportedHandler<Env>
