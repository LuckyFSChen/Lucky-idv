import type { Certification, EngineeringCase } from '@/types/api'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

export async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`)
  if (!res.ok) {
    throw new Error(`請求失敗（${res.status}）：${path}`)
  }
  return (await res.json()) as T
}

export function fetchEngineeringCases(): Promise<EngineeringCase[]> {
  return fetchJson<EngineeringCase[]>('/api/engineering-cases')
}

export async function fetchEngineeringCaseBySlug(slug: string): Promise<EngineeringCase | null> {
  const res = await fetch(`${API_BASE}/api/engineering-cases/${slug}`)
  if (res.status === 404) return null
  if (!res.ok) {
    throw new Error(`請求失敗（${res.status}）：/api/engineering-cases/${slug}`)
  }
  return (await res.json()) as EngineeringCase
}

export function fetchCertifications(): Promise<Certification[]> {
  return fetchJson<Certification[]>('/api/certifications')
}

export function resolveAssetUrl(path: string | null | undefined): string | null {
  if (!path) return null
  if (/^https?:\/\//.test(path)) return path
  return `${API_BASE}${path}`
}
