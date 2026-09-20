import { fadeVisibleOnce, slideVisibleOnceBottom } from '@vueuse/motion'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  applyReducedMotionPresets,
  motionTransition,
  prefersReducedMotion,
} from '@/composables/useReducedMotion'

function mockMatchMedia(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia
}

describe('useReducedMotion', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    delete fadeVisibleOnce.visibleOnce?.transition
    delete slideVisibleOnceBottom.visibleOnce?.transition
  })

  it('prefersReducedMotion reflects the matchMedia query result', () => {
    mockMatchMedia(true)
    expect(prefersReducedMotion()).toBe(true)

    mockMatchMedia(false)
    expect(prefersReducedMotion()).toBe(false)
  })

  it('motionTransition keeps the requested duration/delay when motion is not reduced', () => {
    expect(motionTransition(400, 120, false)).toEqual({ duration: 400, delay: 120 })
  })

  it('motionTransition collapses to a near-instant transition when motion is reduced', () => {
    expect(motionTransition(400, 120, true)).toEqual({ duration: 1 })
  })

  it('applyReducedMotionPresets mutates the shared fade/slide presets to near-instant when reduced', () => {
    applyReducedMotionPresets(true)

    expect(fadeVisibleOnce.visibleOnce?.transition).toEqual({ duration: 1 })
    expect(slideVisibleOnceBottom.visibleOnce?.transition).toEqual({ duration: 1 })
  })

  it('applyReducedMotionPresets leaves the shared presets untouched when motion is not reduced', () => {
    applyReducedMotionPresets(false)

    expect(fadeVisibleOnce.visibleOnce?.transition).toBeUndefined()
    expect(slideVisibleOnceBottom.visibleOnce?.transition).toBeUndefined()
  })
})
