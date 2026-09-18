import { defineStore } from 'pinia'

export type Locale = 'zh' | 'en'

const STORAGE_KEY = 'idv-web:locale'

function detectInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'zh'
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored === 'zh' || stored === 'en') return stored
  return 'zh'
}

export const useLocaleStore = defineStore('locale', {
  state: () => ({
    locale: detectInitialLocale() as Locale,
  }),
  actions: {
    toggle() {
      this.set(this.locale === 'zh' ? 'en' : 'zh')
    },
    set(locale: Locale) {
      this.locale = locale
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, locale)
      }
    },
  },
})
