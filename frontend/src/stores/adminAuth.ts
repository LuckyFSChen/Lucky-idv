import { defineStore } from 'pinia'
import { adminLogin, AdminApiError } from '@/api/adminClient'

export const useAdminAuthStore = defineStore('adminAuth', {
  state: () => ({
    token: null as string | null,
    error: null as string | null,
    status: 'idle' as 'idle' | 'loading' | 'error',
  }),
  getters: {
    isAuthenticated: (state) => state.token !== null,
  },
  actions: {
    async login(email: string, password: string): Promise<boolean> {
      this.status = 'loading'
      this.error = null
      try {
        const { token } = await adminLogin(email, password)
        this.token = token
        this.status = 'idle'
        return true
      } catch (err) {
        this.error = err instanceof AdminApiError ? err.message : '登入失敗，請稍後再試。'
        this.status = 'error'
        return false
      }
    },
    logout() {
      this.token = null
    },
  },
})
