<script setup lang="ts">
import { computed, ref } from 'vue'
import { useLocaleStore } from '@/stores/locale'
import { uiText } from '@/i18n/ui'

const localeStore = useLocaleStore()
const t = computed(() => uiText[localeStore.locale].nav)
const isOpen = ref(false)

const links = computed(() => [
  { href: '#about', label: t.value.about },
  { href: '#skills', label: t.value.skills },
  { href: '#experience', label: t.value.experience },
  { href: '#projects', label: t.value.projects },
  { href: '#contact', label: t.value.contact },
])

function closeMenu() {
  isOpen.value = false
}
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
        >{{ link.label }}</a>
      </nav>

      <div class="nav__actions">
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
          aria-label="Menu"
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
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  border-bottom: 1px solid var(--color-border);
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
  gap: 2rem;
}

.nav__links--desktop a {
  font-size: 0.9rem;
  text-decoration: none;
  color: var(--color-text-secondary);
  transition: color 0.2s ease;
}

.nav__links--desktop a:hover {
  color: var(--color-text);
}

.nav__actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
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
  transition: background-color 0.2s ease;
}

.nav__lang:hover {
  background: rgba(0, 0, 0, 0.05);
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
  background: rgba(255, 255, 255, 0.96);
  border-bottom: 1px solid var(--color-border);
}

.nav__links--mobile a {
  text-decoration: none;
  color: var(--color-text);
  font-size: 1rem;
}

.menu-enter-active,
.menu-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
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
