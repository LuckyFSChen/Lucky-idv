import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import router from '@/router'
import { useAdminAuthStore } from '@/stores/adminAuth'

describe('router auth guard', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('redirects to the login page when visiting /admin without a token', async () => {
    await router.push('/admin')
    expect(router.currentRoute.value.name).toBe('admin-login')
    expect(router.currentRoute.value.query.redirect).toBe('/admin')
  })

  it('allows access to /admin once authenticated', async () => {
    useAdminAuthStore().token = 'jwt-token'
    await router.push('/admin')
    expect(router.currentRoute.value.name).toBe('admin-dashboard')
  })

  it('does not guard the public login page', async () => {
    await router.push('/admin/login')
    expect(router.currentRoute.value.name).toBe('admin-login')
  })

  it('resolves /cases/:slug to the case detail route without requiring auth', async () => {
    await router.push('/cases/taskflow-multi-agent-pipeline')
    expect(router.currentRoute.value.name).toBe('case-detail')
    expect(router.currentRoute.value.params.slug).toBe('taskflow-multi-agent-pipeline')
  })
})
