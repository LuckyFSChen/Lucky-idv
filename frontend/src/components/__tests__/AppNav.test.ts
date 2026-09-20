import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AppNav from '@/components/AppNav.vue'
import { usePortfolioStore } from '@/stores/portfolio'
import { useThemeStore } from '@/stores/theme'

class FakeIntersectionObserver {
  static instances: FakeIntersectionObserver[] = []
  callback: IntersectionObserverCallback
  observed: Element[] = []

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback
    FakeIntersectionObserver.instances.push(this)
  }

  observe(el: Element) {
    this.observed.push(el)
  }

  disconnect() {
    this.observed = []
  }

  unobserve() {}
}

describe('AppNav', () => {
  beforeEach(() => {
    window.localStorage.clear()
    setActivePinia(createPinia())
  })

  it('renders anchor links for every major section', () => {
    const wrapper = mount(AppNav)
    const hrefs = wrapper
      .findAll('.nav__links--desktop a')
      .map((a) => a.attributes('href'))

    expect(hrefs).toEqual([
      '#about',
      '#selected-work',
      '#engineering-cases',
      '#experience',
      '#skills',
      '#projects',
      '#contact',
    ])
  })

  it('toggles the mobile menu open and closed', async () => {
    const wrapper = mount(AppNav)
    expect(wrapper.find('.nav__links--mobile').exists()).toBe(false)

    await wrapper.get('.nav__toggle').trigger('click')
    expect(wrapper.find('.nav__links--mobile').exists()).toBe(true)

    await wrapper.get('.nav__links--mobile a').trigger('click')
    expect(wrapper.find('.nav__links--mobile').exists()).toBe(false)
  })

  it('cycles the theme preference when the theme button is clicked', async () => {
    const wrapper = mount(AppNav)
    const themeStore = useThemeStore()
    expect(themeStore.preference).toBe('system')

    await wrapper.get('.nav__icon-btn').trigger('click')
    expect(themeStore.preference).toBe('light')

    await wrapper.get('.nav__icon-btn').trigger('click')
    expect(themeStore.preference).toBe('dark')

    await wrapper.get('.nav__icon-btn').trigger('click')
    expect(themeStore.preference).toBe('system')
  })

  it('sets up the section IntersectionObserver once portfolio data has loaded, and highlights the active link', async () => {
    FakeIntersectionObserver.instances = []
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver)

    document.body.innerHTML = `
      <div id="top"></div>
      <div id="about"></div>
      <div id="selected-work"></div>
      <div id="engineering-cases"></div>
      <div id="experience"></div>
      <div id="skills"></div>
      <div id="projects"></div>
      <div id="contact"></div>
    `

    const portfolio = usePortfolioStore()
    portfolio.status = 'success'

    const wrapper = mount(AppNav, { attachTo: document.body })
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    expect(FakeIntersectionObserver.instances.length).toBe(1)
    const observerInstance = FakeIntersectionObserver.instances[0]
    expect(observerInstance.observed.length).toBe(8)

    const aboutEl = document.getElementById('about') as HTMLElement
    observerInstance.callback(
      [
        { target: aboutEl, isIntersecting: true, intersectionRatio: 0.5 } as unknown as IntersectionObserverEntry,
      ],
      observerInstance as unknown as IntersectionObserver,
    )
    await wrapper.vm.$nextTick()

    const activeLink = wrapper.get('.nav__links--desktop a.nav__links--active')
    expect(activeLink.attributes('href')).toBe('#about')

    wrapper.unmount()
    vi.unstubAllGlobals()
  })
})
