import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import ArchitectureFlow from '@/components/ArchitectureFlow.vue'
import { useLocaleStore } from '@/stores/locale'
import type { ArchitectureStep } from '@/types/api'

const steps: ArchitectureStep[] = [
  { labelZh: '規劃', labelEn: 'Planner' },
  { labelZh: '執行', labelEn: 'Executor' },
  { labelZh: '驗證', labelEn: 'Validator' },
]

describe('ArchitectureFlow', () => {
  beforeEach(() => {
    window.localStorage.clear()
    setActivePinia(createPinia())
  })

  it('renders zh labels by default and connects steps with arrows', () => {
    const wrapper = mount(ArchitectureFlow, { props: { steps } })

    expect(wrapper.text()).toContain('規劃')
    expect(wrapper.text()).toContain('執行')
    expect(wrapper.text()).toContain('驗證')
    expect(wrapper.findAll('.architecture-flow__arrow')).toHaveLength(steps.length - 1)
  })

  it('renders en labels when the locale is switched to English', async () => {
    const wrapper = mount(ArchitectureFlow, { props: { steps } })
    useLocaleStore().set('en')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Planner')
    expect(wrapper.text()).toContain('Executor')
    expect(wrapper.text()).toContain('Validator')
    expect(wrapper.text()).not.toContain('規劃')
  })

  it('renders nothing when there are no steps', () => {
    const wrapper = mount(ArchitectureFlow, { props: { steps: [] } })

    expect(wrapper.find('.architecture-flow').exists()).toBe(false)
  })
})
