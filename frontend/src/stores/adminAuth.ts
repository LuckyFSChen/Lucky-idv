import { defineStore } from 'pinia'
import { adminLogin, AdminApiError } from '@/api/adminClient'

const STORAGE_KEY = 'idv-web:adminToken'

function decodeJwtExpiry(token: string): number | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
    const payload = JSON.parse(window.atob(padded)) as { exp?: number }
    return typeof payload.exp === 'number' ? payload.exp : null
  } catch {
    return null
  }
}

function isTokenExpired(token: string): boolean {
  const exp = decodeJwtExpiry(token)
  if (exp === null) return true
  return Date.now() >= exp * 1000
}

function detectInitialToken(): string | null {
  if (typeof window === 'undefined') return null
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (!stored) return null
  if (isTokenExpired(stored)) {
    window.localStorage.removeItem(STORAGE_KEY)
    return null
  }
  return stored
}

export const useAdminAuthStore = defineStore('adminAuth', {
  state: () => ({
    token: detectInitialToken(),
    error: null as string | null,
    status: 'idle' as 'idle' | 'loading' | 'error',
  }),
  getters: {
    isAuthenticated: (state) => state.token !== null,
  },
  actions: {
    async login(email: string, password: string, remember: boolean = false): Promise<boolean> {
      this.status = 'loading'
      this.error = null
      try {
        const { token } = await adminLogin(email, password)
        this.token = token
        this.status = 'idle'
        if (typeof window !== 'undefined') {
          if (remember) {
            window.localStorage.setItem(STORAGE_KEY, token)
          } else {
            window.localStorage.removeItem(STORAGE_KEY)
          }
        }
        return true
      } catch (err) {
        this.error = err instanceof AdminApiError ? err.message : '登入失敗，請稍後再試。'
        this.status = 'error'
        return false
      }
    },
    logout() {
      this.token = null
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(STORAGE_KEY)
      }
    },
  },
})
