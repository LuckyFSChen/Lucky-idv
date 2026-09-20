import { onBeforeUnmount, onMounted, ref } from 'vue'
import { fadeVisibleOnce, slideVisibleOnceBottom } from '@vueuse/motion'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'
const REDUCED_MOTION_TRANSITION = { duration: 1 }

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia(REDUCED_MOTION_QUERY).matches
}

/**
 * @vueuse/motion presets animate via JS (popmotion), so the global CSS
 * `prefers-reduced-motion` rule cannot shorten them. Mutate the shared preset
 * objects in place before MotionPlugin registers its directives so that
 * every `v-motion-fade-visible-once` / `v-motion-slide-visible-once-bottom`
 * instance resolves to a near-instant transition.
 */
export function applyReducedMotionPresets(reduced = prefersReducedMotion()): void {
  if (!reduced) return
  if (fadeVisibleOnce.visibleOnce) {
    fadeVisibleOnce.visibleOnce.transition = { ...REDUCED_MOTION_TRANSITION }
  }
  if (slideVisibleOnceBottom.visibleOnce) {
    slideVisibleOnceBottom.visibleOnce.transition = { ...REDUCED_MOTION_TRANSITION }
  }
}

export function motionTransition(
  duration: number,
  delay = 0,
  reduced = prefersReducedMotion(),
): { duration: number; delay?: number } {
  return reduced ? { ...REDUCED_MOTION_TRANSITION } : { duration, delay }
}

export function useReducedMotion() {
  const reduced = ref(prefersReducedMotion())
  let media: MediaQueryList | null = null

  const handleChange = (event: MediaQueryListEvent) => {
    reduced.value = event.matches
  }

  onMounted(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    media = window.matchMedia(REDUCED_MOTION_QUERY)
    media.addEventListener('change', handleChange)
  })

  onBeforeUnmount(() => {
    media?.removeEventListener('change', handleChange)
  })

  return reduced
}
