import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AdminLoginView from '@/views/AdminLoginView.vue'
import { useAdminAuthStore } from '@/stores/adminAuth'

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status }))
}

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/admin/login', name: 'admin-login', component: AdminLoginView },
      { path: '/admin', name: 'admin-dashboard', component: { template: '<div>dashboard</div>' } },
    ],
  })
}

describe('AdminLoginView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('logs in and redirects to the admin dashboard on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => jsonResponse({ token: 'jwt-token' })),
    )

    const router = createTestRouter()
    router.push('/admin/login')
    await router.isReady()

    const wrapper = mount(AdminLoginView, {
      global: { plugins: [router] },
    })

    await wrapper.find('input[type="email"]').setValue('admin@example.com')
    await wrapper.find('input[type="password"]').setValue('secret')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('admin-dashboard')
    expect(useAdminAuthStore().token).toBe('jwt-token')
  })

  it('shows an error message and stays on the login page on failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => jsonResponse({ error: '帳號或密碼錯誤。' }, 401)),
    )

    const router = createTestRouter()
    router.push('/admin/login')
    await router.isReady()

    const wrapper = mount(AdminLoginView, {
      global: { plugins: [router] },
    })

    await wrapper.find('input[type="email"]').setValue('admin@example.com')
    await wrapper.find('input[type="password"]').setValue('wrong-password')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('admin-login')
    expect(wrapper.text()).toContain('帳號或密碼錯誤。')
  })
})
