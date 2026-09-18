import { setActivePinia, createPinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useLocaleStore } from '@/stores/locale'

describe('useLocaleStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    window.localStorage.clear()
  })

  it('defaults to zh-TW', () => {
    const store = useLocaleStore()
    expect(store.locale).toBe('zh')
  })

  it('toggles between zh and en and persists to localStorage', () => {
    const store = useLocaleStore()
    store.toggle()
    expect(store.locale).toBe('en')
    expect(window.localStorage.getItem('idv-web:locale')).toBe('en')

    store.toggle()
    expect(store.locale).toBe('zh')
  })

  it('set() switches to a specific locale', () => {
    const store = useLocaleStore()
    store.set('en')
    expect(store.locale).toBe('en')
  })
})
