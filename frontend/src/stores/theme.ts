import { defineStore } from 'pinia'

export type ThemePreference = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

const STORAGE_KEY = 'idv-web:theme'

function detectInitialPreference(): ThemePreference {
  if (typeof window === 'undefined') return 'system'
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  return 'system'
}

function prefersDark(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function resolve(preference: ThemePreference): ResolvedTheme {
  if (preference === 'system') return prefersDark() ? 'dark' : 'light'
  return preference
}

function applyToDocument(resolved: ResolvedTheme) {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-theme', resolved)
}

let mediaListenerAttached = false

export const useThemeStore = defineStore('theme', {
  state: () => {
    const preference = detectInitialPreference()
    const resolved = resolve(preference)
    return {
      preference,
      resolved: resolved as ResolvedTheme,
    }
  },
  actions: {
    set(preference: ThemePreference) {
      this.preference = preference
      this.resolved = resolve(preference)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, preference)
      }
      applyToDocument(this.resolved)
    },
    cycle() {
      const order: ThemePreference[] = ['light', 'dark', 'system']
      const next = order[(order.indexOf(this.preference) + 1) % order.length]
      this.set(next)
    },
    init() {
      applyToDocument(this.resolved)
      if (
        mediaListenerAttached ||
        typeof window === 'undefined' ||
        typeof window.matchMedia !== 'function'
      ) {
        return
      }
      mediaListenerAttached = true
      const media = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = () => {
        if (this.preference !== 'system') return
        this.resolved = resolve('system')
        applyToDocument(this.resolved)
      }
      media.addEventListener('change', handleChange)
    },
  },
})
