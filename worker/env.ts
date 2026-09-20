/**
 * Worker 的環境（bindings、secrets、vars）。
 *
 * 來源：
 *   DB               wrangler.jsonc 的 d1_databases binding
 *   UPLOADS          wrangler.jsonc 的 r2_buckets binding（頭像等上傳檔案）
 *   LOGIN_RATE_LIMIT wrangler.jsonc 的 ratelimits binding
 *   API_PROXY_ORIGIN .dev.vars（僅本機開發；production 不設定）
 *   JWT_SECRET       `wrangler secret put JWT_SECRET`（本機則放 .dev.vars）
 *   JWT_EXPIRES_IN   選填，預設 12h
 */

/**
 * Cloudflare Rate Limiting binding 的最小型別。
 *
 * @cloudflare/workers-types 目前尚未內建這個 binding 的型別，因此在此自行宣告；
 * 待官方型別提供後可直接改用官方版本並刪除這段。
 */
export interface RateLimitBinding {
  limit(options: { key: string }): Promise<{ success: boolean }>
}

export interface Env {
  DB?: D1Database
  UPLOADS?: R2Bucket
  API_PROXY_ORIGIN?: string
  JWT_SECRET?: string
  JWT_EXPIRES_IN?: string
  LOGIN_RATE_LIMIT?: RateLimitBinding
}
