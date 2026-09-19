import { mount, flushPromises } from '@vue/test-utils'
import { MotionPlugin } from '@vueuse/motion'
import { createPinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import HomeView from '@/views/HomeView.vue'
import type { Experience, Profile, Project, SkillCategory } from '@/types/api'

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
        if (url.includes('/api/engineering-cases')) return jsonResponse([])
        if (url.includes('/api/certifications')) return jsonResponse([])
        return Promise.reject(new Error(`unexpected fetch: ${url}`))
      }),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('loads portfolio data and renders profile content', async () => {
    const wrapper = mount(HomeView, {
      global: { plugins: [createPinia(), MotionPlugin] },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('Lucky')
    expect(wrapper.text()).toContain('PHP / Laravel 後端工程師')
    expect(wrapper.text()).toContain('DineFlow')
  })

  it('switches section labels when the language toggle is clicked', async () => {
    const wrapper = mount(HomeView, {
      global: { plugins: [createPinia(), MotionPlugin] },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('自我介紹')

    await wrapper.find('.nav__lang').trigger('click')

    expect(wrapper.text()).toContain('About')
    expect(wrapper.text()).toContain('Backend Engineer specializing in PHP / Laravel')
  })
})
