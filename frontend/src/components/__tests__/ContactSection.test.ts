import { mount } from '@vue/test-utils'
import { MotionPlugin } from '@vueuse/motion'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import ContactSection from '@/components/ContactSection.vue'
import type { Profile } from '@/types/api'

const baseProfile: Profile = {
  id: 1,
  displayName: 'Lucky Chen',
  preferredName: 'Lucky',
  titleZh: '後端與系統工程師',
  titleEn: 'Backend & System Engineer',
  introZh: '',
  introEn: '',
  avatarUrl: null,
  contactEmail: 'lucky@example.com',
  contactPhone: null,
  contactLinks: [],
  updatedAt: '2024-01-01T00:00:00.000Z',
}

describe('ContactSection', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders a clickable tel: link when contactPhone is set', () => {
    const wrapper = mount(ContactSection, {
      props: { profile: { ...baseProfile, contactPhone: '+886 912-345-678' } },
      global: { plugins: [MotionPlugin] },
    })

    const telLink = wrapper.find('a[href="tel:+886 912-345-678"]')
    expect(telLink.exists()).toBe(true)
  })

  it('does not render a tel: link when contactPhone is null', () => {
    const wrapper = mount(ContactSection, {
      props: { profile: baseProfile },
      global: { plugins: [MotionPlugin] },
    })

    expect(wrapper.find('a[href^="tel:"]').exists()).toBe(false)
  })

  it('does not render a tel: link when profile is null', () => {
    const wrapper = mount(ContactSection, {
      props: { profile: null },
      global: { plugins: [MotionPlugin] },
    })

    expect(wrapper.find('a[href^="tel:"]').exists()).toBe(false)
  })
})
