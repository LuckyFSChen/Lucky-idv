/**
 * Cloudflare Worker 進入點。
 *
 * 路由順序（wrangler.jsonc 的 run_worker_first 已確保 /api/* 與 /uploads/*
 * 先進到這裡，不會被 Static Assets 的 SPA fallback 吃掉）：
 *
 *   /api/health          Worker 原生
 *   /api/* /uploads/*    本機開發若設了 API_PROXY_ORIGIN，一律轉發給 Express
 *   /uploads/*           從 R2 讀取（未設定 binding 時為 404）
 *   /api/admin/*         管理後台（見 routes/admin.ts）
 *   公開 GET API         見 routes/public.ts
 *   其餘 /api/*          501（明確告知尚未遷移，而非靜默失敗）
 *   其他                 404（靜態檔已由 assets 處理）
 */

import { getPrisma } from '../backend/src/db/client.js'
import type { Env } from './env.js'
import { json, jsonError } from './lib/http.js'
import { handleAdminApi, isAdminApiPath } from './routes/admin.js'
import { handlePublicApi, isPublicApiPath } from './routes/public.js'
import { handleUploads } from './routes/uploads.js'

export type { Env }

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const { pathname } = url

    // Health check
    if (pathname === '/api/health' && request.method === 'GET') {
      return json({ status: 'ok' })
    }

    const isApi = pathname.startsWith('/api/')
    const isUploads = pathname.startsWith('/uploads/')

    // 本機開發仍保留 Express proxy 行為
    if ((isApi || isUploads) && env.API_PROXY_ORIGIN) {
      const target = new URL(pathname + url.search, env.API_PROXY_ORIGIN)
      return fetch(new Request(target, request))
    }

    if (isUploads) {
      return handleUploads(request, env, pathname)
    }

    const isAdmin = isAdminApiPath(pathname)
    const isPublic = isPublicApiPath(request.method, pathname)

    if (isAdmin || isPublic) {
      if (!env.DB) {
        return jsonError('D1 database binding DB is not configured.', 500)
      }

      try {
        const prisma = getPrisma(env)

        if (isAdmin) {
          return await handleAdminApi(request, env, prisma, pathname)
        }

        const response = await handlePublicApi(prisma, pathname)
        if (response) return response
      } catch (error) {
        // 未預期的錯誤：記錄細節（Workers observability 已開啟），
        // 但只回傳概略訊息給客戶端。
        console.error(`${isAdmin ? 'Admin' : 'Public'} API failed:`, error)

        return isAdmin
          ? jsonError('伺服器發生未預期的錯誤。', 500)
          : jsonError('資料載入失敗', 500)
      }
    }

    // 其他尚未搬移或不存在的 API
    if (isApi) {
      return jsonError('此 API 尚未遷移至 Cloudflare Workers。', 501)
    }

    return new Response('Not Found', { status: 404 })
  },
} satisfies ExportedHandler<Env>
