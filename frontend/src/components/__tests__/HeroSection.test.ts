import { mount } from '@vue/test-utils'
import { MotionPlugin } from '@vueuse/motion'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import HeroSection from '@/components/HeroSection.vue'
import type { Profile } from '@/types/api'

const profile: Profile = {
  id: 1,
  displayName: 'Lucky Chen',
  preferredName: 'Lucky',
  titleZh: '後端與系統工程師',
  titleEn: 'Backend & System Engineer',
  introZh: '',
  introEn: '',
  avatarUrl: null,
  contactEmail: null,
  contactLinks: [],
  updatedAt: '2024-01-01T00:00:00.000Z',
}

function mockMatchMedia(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia
}

describe('HeroSection', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockMatchMedia(false)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the name, title and CTA links without large paragraphs', () => {
    const wrapper = mount(HeroSection, {
      props: { profile },
      global: { plugins: [MotionPlugin] },
    })

    expect(wrapper.text()).toContain('Lucky')
    expect(wrapper.text()).toContain('後端與系統工程師')
    expect(wrapper.get('a.btn--primary').attributes('href')).toBe('#contact')
    expect(wrapper.get('a.btn--secondary').attributes('href')).toBe('#projects')
    expect(wrapper.findAll('p').every((p) => p.text().length < 80)).toBe(true)
  })

  it('mounts without runtime errors when the OS prefers reduced motion', () => {
    mockMatchMedia(true)
    const wrapper = mount(HeroSection, {
      props: { profile },
      global: { plugins: [MotionPlugin] },
    })

    expect(wrapper.get('h1').text()).toBe('Lucky')
  })
})
