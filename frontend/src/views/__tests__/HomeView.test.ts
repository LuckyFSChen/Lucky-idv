import { mount, flushPromises } from '@vue/test-utils'
import { MotionPlugin } from '@vueuse/motion'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import HomeView from '@/views/HomeView.vue'
import type { Certification, EngineeringCase, Experience, Profile, Project, SkillCategory } from '@/types/api'

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: HomeView },
      { path: '/cases/:slug', name: 'case-detail', component: { template: '<div />' } },
    ],
  })
}

const profile: Profile = {
  id: 1,
  displayName: 'Lucky',
  preferredName: 'Lucky',
  titleZh: 'PHP / Laravel 後端工程師',
  titleEn: 'Backend Engineer specializing in PHP / Laravel',
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

const experiences: Experience[] = [
  {
    id: 1,
    companyZh: '華碩',
    companyEn: 'ASUS',
    roleZh: '後端工程師',
    roleEn: 'Backend Engineer',
    locationZh: '台灣',
    locationEn: 'Taiwan',
    startDate: '2023-08-01T00:00:00.000Z',
    endDate: null,
    summaryZh: '摘要',
    summaryEn: 'Summary',
    highlightsZh: ['重點一'],
    highlightsEn: ['Highlight one'],
    sortOrder: 0,
  },
]

const projects: Project[] = [
  {
    id: 1,
    nameZh: 'DineFlow',
    nameEn: 'DineFlow',
    categoryZh: null,
    categoryEn: null,
    subtitleZh: null,
    subtitleEn: null,
    summaryZh: '摘要',
    summaryEn: 'Summary',
    highlightsZh: ['重點一'],
    highlightsEn: ['Highlight one'],
    techStack: ['GCP'],
    link: null,
    githubUrl: null,
    imageUrl: null,
    featured: false,
    sortOrder: 0,
  },
  {
    id: 2,
    nameZh: 'TaskFlow',
    nameEn: 'TaskFlow',
    categoryZh: 'SaaS 產品',
    categoryEn: 'SaaS Product',
    subtitleZh: null,
    subtitleEn: null,
    summaryZh: '精選作品摘要',
    summaryEn: 'Featured work summary',
    highlightsZh: ['重點二'],
    highlightsEn: ['Highlight two'],
    techStack: ['TypeScript'],
    link: null,
    githubUrl: null,
    imageUrl: null,
    featured: true,
    sortOrder: 0,
  },
]

const engineeringCases: EngineeringCase[] = [
  {
    id: 1,
    slug: 'taskflow-multi-agent-pipeline',
    titleZh: '多代理任務流水線',
    titleEn: 'Multi-Agent Task Pipeline',
    categoryZh: '系統架構',
    categoryEn: 'System Architecture',
    summaryZh: '案例摘要',
    summaryEn: 'Case summary',
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
    architecture: [{ labelZh: '規劃', labelEn: 'Planner' }],
    techStack: ['TypeScript'],
    githubUrl: null,
    projectUrl: null,
    featured: true,
    sortOrder: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

const certifications: Certification[] = [
  {
    id: 1,
    nameZh: 'ISO 27001 主導稽核員',
    nameEn: 'ISO 27001 Lead Auditor',
    issuerZh: 'BSI',
    issuerEn: 'BSI',
    descriptionZh: '資訊安全管理系統主導稽核員資格。',
    descriptionEn: 'Lead auditor qualification for information security management systems.',
    credential: 'ISO27001-0001',
    issuedAt: '2024-01-01T00:00:00.000Z',
    link: null,
    sortOrder: 0,
  },
]

function jsonResponse(body: unknown) {
  return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }))
}

describe('HomeView', () => {
  beforeEach(() => {
    window.localStorage.clear()
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

  it('loads portfolio data and renders profile content', async () => {
    const wrapper = mount(HomeView, {
      global: { plugins: [createPinia(), createTestRouter(), MotionPlugin] },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('Lucky')
    expect(wrapper.text()).toContain('PHP / Laravel 後端工程師')
    expect(wrapper.text()).toContain('DineFlow')
  })

  it('switches section labels when the language toggle is clicked', async () => {
    const wrapper = mount(HomeView, {
      global: { plugins: [createPinia(), createTestRouter(), MotionPlugin] },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('自我介紹')

    await wrapper.find('.nav__lang').trigger('click')

    expect(wrapper.text()).toContain('About')
    expect(wrapper.text()).toContain('Backend Engineer specializing in PHP / Laravel')
  })

  it('renders Selected Engineering Work only for featured projects', async () => {
    const wrapper = mount(HomeView, {
      global: { plugins: [createPinia(), createTestRouter(), MotionPlugin] },
    })

    await flushPromises()

    const selectedWork = wrapper.get('#selected-work')
    expect(selectedWork.text()).toContain('TaskFlow')
    expect(selectedWork.text()).not.toContain('DineFlow')
  })

  it('renders the Engineering Case Studies section with title/category/summary/tech stack', async () => {
    const wrapper = mount(HomeView, {
      global: { plugins: [createPinia(), createTestRouter(), MotionPlugin] },
    })

    await flushPromises()

    const casesSection = wrapper.get('#engineering-cases')
    expect(casesSection.text()).toContain('多代理任務流水線')
    expect(casesSection.text()).toContain('系統架構')
    expect(casesSection.text()).toContain('案例摘要')
    expect(casesSection.text()).toContain('TypeScript')

    const link = casesSection.get('a')
    expect(link.attributes('href')).toBe('/cases/taskflow-multi-agent-pipeline')
  })

  it('renders the Certification section with certification data', async () => {
    const wrapper = mount(HomeView, {
      global: { plugins: [createPinia(), createTestRouter(), MotionPlugin] },
    })

    await flushPromises()

    const certificationSection = wrapper.get('#certification')
    expect(certificationSection.text()).toContain('ISO 27001 主導稽核員')
    expect(certificationSection.text()).toContain('BSI')
    expect(certificationSection.text()).toContain('ISO27001-0001')
  })
})
