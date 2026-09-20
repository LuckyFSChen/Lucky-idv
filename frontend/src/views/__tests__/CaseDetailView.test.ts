import { mount, flushPromises } from '@vue/test-utils'
import { MotionPlugin } from '@vueuse/motion'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import CaseDetailView from '@/views/CaseDetailView.vue'
import type { Certification, EngineeringCase, Experience, Profile, Project, SkillCategory } from '@/types/api'

function createTestRouter() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: { template: '<div />' } },
      { path: '/cases/:slug', name: 'case-detail', component: CaseDetailView },
    ],
  })
  return router
}

const profile: Profile = {
  id: 1,
  displayName: 'Lucky',
  preferredName: 'Lucky',
  titleZh: 'PHP / Laravel 後端工程師',
  titleEn: 'Backend Engineer',
  introZh: '我是 Lucky。',
  introEn: "I'm Lucky.",
  avatarUrl: null,
  contactEmail: null,
  contactLinks: [],
  updatedAt: new Date().toISOString(),
}

const skillCategories: SkillCategory[] = []
const experiences: Experience[] = []
const projects: Project[] = []

const engineeringCases: EngineeringCase[] = [
  {
    id: 1,
    slug: 'git-repository-topology-detection',
    titleZh: 'Git 儲存庫拓樸偵測',
    titleEn: 'Git Repository Topology Detection',
    categoryZh: '系統架構',
    categoryEn: 'System Architecture',
    summaryZh: '案例摘要',
    summaryEn: 'Case summary for SEO description',
    problemZh: '',
    problemEn: '',
    contextZh: '',
    contextEn: '',
    investigationZh: '',
    investigationEn: '',
    solutionZh: '',
    solutionEn: '',
    validationZh: '',
    validationEn: '',
    resultZh: '',
    resultEn: '',
    architecture: [],
    techStack: [],
    githubUrl: null,
    projectUrl: null,
    featured: true,
    published: true,
    sortOrder: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

const certifications: Certification[] = []

function jsonResponse(body: unknown) {
  return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }))
}

describe('CaseDetailView', () => {
  beforeEach(() => {
    window.localStorage.clear()
    document.title = 'Lucky | Backend & System Engineer'
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/api/profile')) return jsonResponse(profile)
        if (url.includes('/api/skills')) return jsonResponse(skillCategories)
        if (url.includes('/api/experience')) return jsonResponse(experiences)
        if (url.includes('/api/projects')) return jsonResponse(projects)
        if (url.includes('/api/engineering-cases')) return jsonResponse(engineeringCases)
        if (url.includes('/api/certifications')) return jsonResponse(certifications)
        return Promise.reject(new Error(`unexpected fetch: ${url}`))
      }),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('updates document title and meta description to match the case, then resets on unmount', async () => {
    const router = createTestRouter()
    router.push('/cases/git-repository-topology-detection')
    await router.isReady()

    const wrapper = mount(CaseDetailView, {
      global: { plugins: [createPinia(), router, MotionPlugin] },
    })

    await flushPromises()

    expect(document.title).toBe('Git Repository Topology Detection | Lucky')
    const description = document.head.querySelector('meta[name="description"]')
    expect(description?.getAttribute('content')).toBe('Case summary for SEO description')

    wrapper.unmount()

    expect(document.title).toBe('Lucky | Backend & System Engineer')
  })
})
