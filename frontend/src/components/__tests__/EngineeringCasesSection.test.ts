import { mount } from '@vue/test-utils'
import { MotionPlugin } from '@vueuse/motion'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it } from 'vitest'
import EngineeringCasesSection from '@/components/EngineeringCasesSection.vue'
import { useLocaleStore } from '@/stores/locale'
import type { EngineeringCase } from '@/types/api'

const cases: EngineeringCase[] = [
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
    techStack: ['TypeScript', 'Vue'],
    githubUrl: null,
    projectUrl: null,
    featured: true,
    sortOrder: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: { template: '<div />' } },
      { path: '/cases/:slug', name: 'case-detail', component: { template: '<div />' } },
    ],
  })
}

describe('EngineeringCasesSection', () => {
  beforeEach(() => {
    window.localStorage.clear()
    setActivePinia(createPinia())
  })

  it('renders the empty state message when there are no cases', () => {
    const wrapper = mount(EngineeringCasesSection, {
      props: { cases: [] },
      global: { plugins: [createTestRouter(), MotionPlugin] },
    })

    expect(wrapper.text()).toContain('尚未發佈任何工程案例。')
  })

  it('renders case cards with title/category/summary/tech stack and links to the case detail route', () => {
    const wrapper = mount(EngineeringCasesSection, {
      props: { cases },
      global: { plugins: [createTestRouter(), MotionPlugin] },
    })

    expect(wrapper.text()).toContain('多代理任務流水線')
    expect(wrapper.text()).toContain('系統架構')
    expect(wrapper.text()).toContain('案例摘要')
    expect(wrapper.text()).toContain('TypeScript')
    expect(wrapper.text()).toContain('Vue')

    const link = wrapper.get('a.engineering-cases__card')
    expect(link.attributes('href')).toBe('/cases/taskflow-multi-agent-pipeline')
  })

  it('renders en title/category/summary when the locale is switched to English', async () => {
    const wrapper = mount(EngineeringCasesSection, {
      props: { cases },
      global: { plugins: [createTestRouter(), MotionPlugin] },
    })
    useLocaleStore().set('en')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Multi-Agent Task Pipeline')
    expect(wrapper.text()).toContain('System Architecture')
    expect(wrapper.text()).toContain('Case summary')
  })
})
