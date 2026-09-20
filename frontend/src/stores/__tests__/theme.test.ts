import { setActivePinia, createPinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useThemeStore } from '@/stores/theme'

function mockMatchMedia(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia
}

describe('useThemeStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    window.localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
    mockMatchMedia(false)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('defaults to system preference and resolves to light when OS prefers light', () => {
    const store = useThemeStore()
    expect(store.preference).toBe('system')
    expect(store.resolved).toBe('light')
  })

  it('resolves to dark when OS prefers dark and preference is system', () => {
    mockMatchMedia(true)
    const store = useThemeStore()
    expect(store.resolved).toBe('dark')
  })

  it('set() switches preference, persists to localStorage, and applies data-theme', () => {
    const store = useThemeStore()
    store.set('dark')
    expect(store.preference).toBe('dark')
    expect(store.resolved).toBe('dark')
    expect(window.localStorage.getItem('idv-web:theme')).toBe('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('cycle() moves light -> dark -> system -> light', () => {
    const store = useThemeStore()
    store.set('light')
    store.cycle()
    expect(store.preference).toBe('dark')
    store.cycle()
    expect(store.preference).toBe('system')
    store.cycle()
    expect(store.preference).toBe('light')
  })

  it('reads a previously stored preference on init', () => {
    window.localStorage.setItem('idv-web:theme', 'dark')
    const store = useThemeStore()
    expect(store.preference).toBe('dark')
    expect(store.resolved).toBe('dark')
  })
})
