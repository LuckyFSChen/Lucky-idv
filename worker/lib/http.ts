/**
 * Worker 共用的 Response 工具。
 *
 * ⚠️ charset=utf-8 不可省略：API 的錯誤訊息是中文，少了 charset 在部分瀏覽器
 *    與 curl 會變成亂碼，而前端 adminClient 會直接把 error 字串顯示給使用者。
 */

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
} as const

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS })
}

export function jsonError(message: string, status: number, extra?: Record<string, unknown>): Response {
  return json({ error: message, ...extra }, status)
}

/** 204 必須沒有 body，否則 Workers runtime 會拋錯。 */
export function noContent(): Response {
  return new Response(null, { status: 204 })
}

/**
 * 解析 JSON body。回傳 undefined 代表 body 不是合法 JSON，
 * 呼叫端應視為 400（而不是讓例外冒泡成 500）。
 */
export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    return undefined
  }
}
