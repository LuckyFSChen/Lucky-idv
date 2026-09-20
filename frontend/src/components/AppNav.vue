<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useLocaleStore } from '@/stores/locale'
import { usePortfolioStore } from '@/stores/portfolio'
import { useThemeStore } from '@/stores/theme'
import { uiText } from '@/i18n/ui'

const localeStore = useLocaleStore()
const themeStore = useThemeStore()
const portfolio = usePortfolioStore()
const t = computed(() => uiText[localeStore.locale].nav)
const isOpen = ref(false)
const activeSection = ref('top')

const links = computed(() => [
  { href: '#about', id: 'about', label: t.value.about },
  { href: '#selected-work', id: 'selected-work', label: t.value.selectedWork },
  { href: '#engineering-cases', id: 'engineering-cases', label: t.value.engineeringCases },
  { href: '#experience', id: 'experience', label: t.value.experience },
  { href: '#skills', id: 'skills', label: t.value.skills },
  { href: '#projects', id: 'projects', label: t.value.projects },
  { href: '#contact', id: 'contact', label: t.value.contact },
])

const themeIcon = computed(() => {
  if (themeStore.preference === 'light') return '☀︎'
  if (themeStore.preference === 'dark') return '☾'
  return '◐'
})

const themeAriaLabel = computed(() => {
  const current =
    themeStore.preference === 'light'
      ? t.value.themeLight
      : themeStore.preference === 'dark'
        ? t.value.themeDark
        : t.value.themeSystem
  return `${t.value.themeLabel} (${current})`
})

function closeMenu() {
  isOpen.value = false
}

let observer: IntersectionObserver | null = null

function setupSectionObserver() {
  observer?.disconnect()

  const sectionIds = ['top', ...links.value.map((link) => link.id)]
  const sections = sectionIds
    .map((id) => document.getElementById(id))
    .filter((el): el is HTMLElement => el !== null)

  if (sections.length === 0 || typeof IntersectionObserver === 'undefined') return

  observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
      if (visible[0]) {
        activeSection.value = visible[0].target.id
      }
    },
    { rootMargin: '-40% 0px -50% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] },
  )

  sections.forEach((section) => observer?.observe(section))
}

onMounted(() => {
  if (portfolio.status === 'success') {
    nextTick(setupSectionObserver)
  }
})

watch(
  () => portfolio.status,
  (status) => {
    if (status === 'success') {
      nextTick(setupSectionObserver)
    }
  },
)

onBeforeUnmount(() => {
  observer?.disconnect()
})
</script>

<template>
  <header class="nav">
    <div class="nav__inner container">
      <a
        class="nav__brand"
        href="#top"
        @click="closeMenu"
      >idv.</a>

      <nav class="nav__links nav__links--desktop">
        <a
          v-for="link in links"
          :key="link.href"
          :href="link.href"
          :class="{ 'nav__links--active': activeSection === link.id }"
        >{{ link.label }}</a>
      </nav>

      <div class="nav__actions">
        <button
          class="nav__icon-btn"
          type="button"
          :aria-label="themeAriaLabel"
          @click="themeStore.cycle()"
        >
          <span aria-hidden="true">{{ themeIcon }}</span>
        </button>
        <button
          class="nav__lang"
          type="button"
          @click="localeStore.toggle()"
        >
          {{ t.langSwitch }}
        </button>
        <button
          class="nav__toggle"
          type="button"
          :aria-expanded="isOpen"
          :aria-label="isOpen ? t.menuClose : t.menuOpen"
          @click="isOpen = !isOpen"
        >
          <span />
          <span />
          <span />
        </button>
      </div>
    </div>

    <Transition name="menu">
      <nav
        v-if="isOpen"
        class="nav__links nav__links--mobile"
      >
        <a
          v-for="link in links"
          :key="link.href"
          :href="link.href"
          :class="{ 'nav__links--active': activeSection === link.id }"
          @click="closeMenu"
        >{{
          link.label
        }}</a>
      </nav>
    </Transition>
  </header>
</template>

<style scoped>
.nav {
  position: sticky;
  top: 0;
  z-index: 50;
  background: var(--color-surface-translucent);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  border-bottom: 1px solid var(--color-border);
  transition: background-color var(--motion-base) var(--motion-easing);
}

.nav__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
}

.nav__brand {
  font-weight: 700;
  font-size: 1.1rem;
  text-decoration: none;
  letter-spacing: -0.02em;
}

.nav__links--desktop {
  display: none;
  gap: 1.75rem;
}

.nav__links--desktop a {
  font-size: 0.9rem;
  text-decoration: none;
  color: var(--color-text-secondary);
  transition: color var(--motion-fast) var(--motion-easing);
  position: relative;
  padding-block: 0.25rem;
}

.nav__links--desktop a::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -2px;
  height: 2px;
  border-radius: 999px;
  background: var(--color-accent);
  transform: scaleX(0);
  transform-origin: center;
  transition: transform var(--motion-base) var(--motion-easing);
}

.nav__links--desktop a:hover {
  color: var(--color-text);
}

.nav__links--desktop a.nav__links--active {
  color: var(--color-text);
  font-weight: 600;
}

.nav__links--desktop a.nav__links--active::after {
  transform: scaleX(1);
}

.nav__actions {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.nav__icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text);
  cursor: pointer;
  font-size: 0.95rem;
  transition: background-color var(--motion-fast) var(--motion-easing);
}

.nav__icon-btn:hover {
  background: var(--color-hover-overlay);
}

.nav__lang {
  border: 1px solid var(--color-border);
  background: transparent;
  border-radius: 999px;
  padding: 0.35rem 0.85rem;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  color: var(--color-text);
  transition: background-color var(--motion-fast) var(--motion-easing);
}

.nav__lang:hover {
  background: var(--color-hover-overlay);
}

.nav__toggle {
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
}

.nav__toggle span {
  width: 20px;
  height: 2px;
  background: var(--color-text);
  border-radius: 2px;
}

.nav__links--mobile {
  display: flex;
  flex-direction: column;
  padding: 1rem clamp(1.25rem, 4vw, 2.5rem) 1.5rem;
  gap: 1rem;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}

.nav__links--mobile a {
  text-decoration: none;
  color: var(--color-text);
  font-size: 1rem;
  transition: color var(--motion-fast) var(--motion-easing);
}

.nav__links--mobile a.nav__links--active {
  color: var(--color-accent);
  font-weight: 600;
}

.menu-enter-active,
.menu-leave-active {
  transition:
    opacity var(--motion-base) var(--motion-easing),
    transform var(--motion-base) var(--motion-easing);
}

.menu-enter-from,
.menu-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

@media (min-width: 860px) {
  .nav__links--desktop {
    display: flex;
  }

  .nav__toggle {
    display: none;
  }

  .nav__links--mobile {
    display: none;
  }
}
</style>
