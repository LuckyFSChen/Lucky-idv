import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAdminAuthStore } from '@/stores/adminAuth'

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status }))
}

describe('useAdminAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
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
})
