import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAdminAuthStore } from '@/stores/adminAuth'

const STORAGE_KEY = 'idv-web:adminToken'

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status }))
}

function base64Url(input: string): string {
  return Buffer.from(input, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

// salt 欄位刻意選用會讓 base64 出現 '+'/'/' 的內容，轉成 Base64URL 後即為 '-'/'_'，且需要補回 padding 才能還原
function makeJwt(payload: Record<string, unknown>): string {
  const header = base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = base64Url(JSON.stringify({ salt: 'admin>>??', ...payload }))
  return `${header}.${body}.signature`
}

describe('useAdminAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    window.localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    window.localStorage.clear()
  })

  it('stores the token in memory after a successful login', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => jsonResponse({ token: 'jwt-token' })),
    )

    const store = useAdminAuthStore()
    const ok = await store.login('admin@example.com', 'secret')

    expect(ok).toBe(true)
    expect(store.token).toBe('jwt-token')
    expect(store.isAuthenticated).toBe(true)
  })

  it('sets an error message and keeps the user logged out on invalid credentials', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => jsonResponse({ error: '帳號或密碼錯誤。' }, 401)),
    )

    const store = useAdminAuthStore()
    const ok = await store.login('admin@example.com', 'wrong-password')

    expect(ok).toBe(false)
    expect(store.token).toBeNull()
    expect(store.isAuthenticated).toBe(false)
    expect(store.error).toBe('帳號或密碼錯誤。')
  })

  it('logout clears the token', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => jsonResponse({ token: 'jwt-token' })),
    )

    const store = useAdminAuthStore()
    await store.login('admin@example.com', 'secret')
    expect(store.isAuthenticated).toBe(true)

    store.logout()
    expect(store.token).toBeNull()
    expect(store.isAuthenticated).toBe(false)
  })

  it('removes a previously remembered token when logging in again without remember', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockImplementationOnce(() => jsonResponse({ token: 'remembered-token' }))
        .mockImplementationOnce(() => jsonResponse({ token: 'session-only-token' })),
    )

    const store = useAdminAuthStore()

    await store.login('admin@example.com', 'secret', true)
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('remembered-token')

    await store.login('admin@example.com', 'secret', false)
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('parses exp from a Base64URL-encoded payload that requires padding', () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600
    const token = makeJwt({ exp: futureExp })
    // 確認測試資料確實含有 Base64URL 專屬字元且原始長度不是 4 的倍數（需要補 padding）
    const rawPayload = token.split('.')[1]
    expect(/[-_]/.test(rawPayload)).toBe(true)
    expect(rawPayload.length % 4).not.toBe(0)

    window.localStorage.setItem(STORAGE_KEY, token)
    const store = useAdminAuthStore()

    expect(store.token).toBe(token)
    expect(store.isAuthenticated).toBe(true)
  })

  it('does not throw and clears storage when the stored value is a malformed JWT', () => {
    window.localStorage.setItem(STORAGE_KEY, 'not-a-jwt')

    expect(() => useAdminAuthStore()).not.toThrow()
    const store = useAdminAuthStore()

    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
    expect(store.isAuthenticated).toBe(false)
  })

  it('does not throw and clears storage when the JWT payload has no exp', () => {
    const token = makeJwt({})
    window.localStorage.setItem(STORAGE_KEY, token)

    expect(() => useAdminAuthStore()).not.toThrow()
    const store = useAdminAuthStore()

    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
    expect(store.isAuthenticated).toBe(false)
  })

  it('restores the logged-in state from an unexpired token on init', () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600
    const token = makeJwt({ exp: futureExp })
    window.localStorage.setItem(STORAGE_KEY, token)

    const store = useAdminAuthStore()

    expect(store.token).toBe(token)
    expect(store.isAuthenticated).toBe(true)
  })

  it('clears an expired token on init and stays logged out', () => {
    const pastExp = Math.floor(Date.now() / 1000) - 3600
    const token = makeJwt({ exp: pastExp })
    window.localStorage.setItem(STORAGE_KEY, token)

    const store = useAdminAuthStore()

    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
    expect(store.isAuthenticated).toBe(false)
  })
})
