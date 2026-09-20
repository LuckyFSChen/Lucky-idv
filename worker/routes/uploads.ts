/**
 * /uploads/* —— 從 R2 提供使用者上傳的檔案。
 *
 * 取代 Express 的 `express.static(process.cwd() + '/uploads')`：
 * Workers 沒有檔案系統，檔案改放 R2（binding 見 wrangler.jsonc 的 r2_buckets）。
 *
 * ⚠️ wrangler.jsonc 的 assets.run_worker_first 已把 /uploads/* 排除在 Static Assets
 *    之外，否則 SPA fallback 會讓圖片請求拿到 index.html 而不是圖片。
 */

import type { Env } from '../env.js'

export async function handleUploads(request: Request, env: Env, pathname: string): Promise<Response> {
  // R2 尚未設定時維持原本的行為（404），而不是拋錯。
  if (!env.UPLOADS) {
    return new Response('Not Found', { status: 404 })
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const key = decodeURIComponent(pathname.slice('/uploads/'.length))

  // R2 的 key 是扁平字串，'..' 沒有特殊意義，但仍明確擋掉可疑輸入。
  if (!key || key.includes('..') || key.startsWith('/')) {
    return new Response('Not Found', { status: 404 })
  }

  const object = await env.UPLOADS.get(key)
  if (!object) {
    return new Response('Not Found', { status: 404 })
  }

  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('etag', object.httpEtag)
  // 檔名含時間戳與隨機字串，同一個 key 的內容永遠不會變，可安全長期快取。
  headers.set('cache-control', 'public, max-age=31536000, immutable')

  if (request.method === 'HEAD') {
    return new Response(null, { headers })
  }

  return new Response(object.body, { headers })
}
