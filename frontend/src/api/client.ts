const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

export async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`)
  if (!res.ok) {
    throw new Error(`請求失敗（${res.status}）：${path}`)
  }
  return (await res.json()) as T
}

export function resolveAssetUrl(path: string | null | undefined): string | null {
  if (!path) return null
  if (/^https?:\/\//.test(path)) return path
  return `${API_BASE}${path}`
}
