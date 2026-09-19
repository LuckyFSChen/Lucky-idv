import { mount, flushPromises } from '@vue/test-utils'
import { MotionPlugin } from '@vueuse/motion'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AdminDashboardView from '@/views/AdminDashboardView.vue'
import { useAdminAuthStore } from '@/stores/adminAuth'
import { AdminApiError } from '@/api/adminClient'
import type { Experience, Profile, Project, SkillCategory } from '@/types/api'

vi.mock('@/api/adminClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/adminClient')>()
  return {
    ...actual,
    adminApi: {
      ...actual.adminApi,
      updateProfile: vi.fn(),
    },
  }
})

const profile: Profile = {
  id: 1,
  displayName: 'Lucky',
  preferredName: 'Lucky',
  titleZh: 'PHP / Laravel 後端工程師',
  titleEn: 'Backend Engineer',
  introZh: '我是 Lucky。',
  introEn: "I'm Lucky.",
  avatarUrl: null,
  contactEmail: 'lucky@example.com',
  contactLinks: [],
  updatedAt: new Date().toISOString(),
}

const skillCategories: SkillCategory[] = [
  {
    id: 1,
    nameZh: '後端開發',
    nameEn: 'Backend Development',
    sortOrder: 0,
    skills: [{ id: 1, nameZh: 'PHP', nameEn: 'PHP', sortOrder: 0, categoryId: 1 }],
  },
]

const experiences: Experience[] = []
const projects: Project[] = []

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status }))
}

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/admin', name: 'admin-dashboard', component: AdminDashboardView },
      { path: '/admin/login', name: 'admin-login', component: { template: '<div>login</div>' } },
    ],
  })
}

describe('AdminDashboardView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/api/profile')) return jsonResponse(profile)
        if (url.includes('/api/skills')) return jsonResponse(skillCategories)
        if (url.includes('/api/experience')) return jsonResponse(experiences)
        if (url.includes('/api/projects')) return jsonResponse(projects)
        if (url.includes('/api/engineering-cases')) return jsonResponse([])
        if (url.includes('/api/certifications')) return jsonResponse([])
        return Promise.reject(new Error(`unexpected fetch: ${url}`))
      }),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  async function mountDashboard() {
    const router = createTestRouter()
    router.push('/admin')
    await router.isReady()
    const wrapper = mount(AdminDashboardView, {
      global: { plugins: [router, MotionPlugin] },
    })
    await flushPromises()
    return { wrapper, router }
  }

  it('pre-fills the profile form and switches tabs', async () => {
    const { wrapper } = await mountDashboard()

    const displayNameInput = wrapper.find('input[type="text"]')
    expect((displayNameInput.element as HTMLInputElement).value).toBe('Lucky')

    await wrapper.findAll('.admin__tab')[1].trigger('click')
    const categoryNameInput = wrapper.find('.admin-card input[type="text"]')
    expect((categoryNameInput.element as HTMLInputElement).value).toBe('後端開發')
  })

  it('saves profile changes through adminApi and shows a success message', async () => {
    const { adminApi } = await import('@/api/adminClient')
    vi.mocked(adminApi.updateProfile).mockResolvedValue({ ...profile, displayName: 'Lucky Chen' })

    const { wrapper } = await mountDashboard()
    useAdminAuthStore().token = 'jwt-token'

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(adminApi.updateProfile).toHaveBeenCalledWith(
      'jwt-token',
      expect.objectContaining({ displayName: 'Lucky' }),
    )
    expect(wrapper.text()).toContain('個人資料已儲存。')
  })

  it('logs out and redirects to login when the admin API returns 401', async () => {
    const { adminApi } = await import('@/api/adminClient')
    vi.mocked(adminApi.updateProfile).mockRejectedValue(new AdminApiError('unauthorized', 401))

    const { wrapper, router } = await mountDashboard()
    const authStore = useAdminAuthStore()
    authStore.token = 'jwt-token'

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(authStore.token).toBeNull()
    expect(router.currentRoute.value.name).toBe('admin-login')
  })
})
