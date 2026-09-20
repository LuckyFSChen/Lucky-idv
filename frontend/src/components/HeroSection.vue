<script setup lang="ts">
import { computed } from 'vue'
import { resolveAssetUrl } from '@/api/client'
import { uiText } from '@/i18n/ui'
import { useLocaleStore } from '@/stores/locale'
import type { Profile } from '@/types/api'

const props = defineProps<{ profile: Profile | null }>()

const localeStore = useLocaleStore()
const t = computed(() => uiText[localeStore.locale].hero)

const displayName = computed(() => props.profile?.preferredName ?? props.profile?.displayName ?? '')
const title = computed(() =>
  localeStore.locale === 'zh' ? props.profile?.titleZh : props.profile?.titleEn,
)
const avatarSrc = computed(() => resolveAssetUrl(props.profile?.avatarUrl))
const initials = computed(() => displayName.value.slice(0, 1).toUpperCase())
</script>

<template>
  <section
    id="top"
    class="hero"
  >
    <div
      class="hero__bg"
      aria-hidden="true"
    />
    <div class="container hero__inner">
      <div
        v-motion
        :initial="{ opacity: 0, y: 24 }"
        :enter="{ opacity: 1, y: 0, transition: { duration: 500 } }"
        class="hero__avatar"
      >
        <img
          v-if="avatarSrc"
          :src="avatarSrc"
          :alt="displayName"
        >
        <span
          v-else
          class="hero__avatar-fallback"
        >{{ initials }}</span>
      </div>

      <p
        v-motion
        :initial="{ opacity: 0, y: 16 }"
        :enter="{ opacity: 1, y: 0, transition: { duration: 500, delay: 100 } }"
        class="hero__eyebrow"
      >
        {{ t.eyebrow }}
      </p>

      <h1
        v-motion
        :initial="{ opacity: 0, y: 20 }"
        :enter="{ opacity: 1, y: 0, transition: { duration: 550, delay: 180 } }"
        class="hero__name gradient-text"
      >
        {{ displayName }}
      </h1>

      <p
        v-motion
        :initial="{ opacity: 0, y: 16 }"
        :enter="{ opacity: 1, y: 0, transition: { duration: 550, delay: 260 } }"
        class="hero__title"
      >
        {{ title }}
      </p>

      <div
        v-motion
        :initial="{ opacity: 0, y: 16 }"
        :enter="{ opacity: 1, y: 0, transition: { duration: 550, delay: 340 } }"
        class="hero__actions"
      >
        <a
          class="btn btn--primary"
          href="#contact"
        >{{ t.ctaContact }}</a>
        <a
          class="btn btn--secondary"
          href="#projects"
        >{{ t.ctaProjects }}</a>
      </div>
    </div>

    <a
      class="hero__scroll"
      href="#about"
      :aria-label="t.scrollHint"
    >
      <span />
    </a>
  </section>
</template>

<style scoped>
.hero {
  position: relative;
  min-height: 100svh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.hero__bg {
  position: absolute;
  inset: 0;
  background: var(--gradient-hero);
  z-index: -1;
}

.hero__inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding-block: 6rem 4rem;
}

.hero__avatar {
  width: 128px;
  height: 128px;
  border-radius: 50%;
  overflow: hidden;
  margin-bottom: 2rem;
  box-shadow: var(--shadow-card);
  border: 4px solid var(--color-surface);
  transition: border-color var(--motion-base) var(--motion-easing);
}

.hero__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hero__avatar-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--gradient-text);
  color: #fff;
  font-size: 3rem;
  font-weight: 700;
}

.hero__eyebrow {
  font-size: var(--text-eyebrow);
  color: var(--color-text-secondary);
  font-weight: 500;
}

.hero__name {
  margin-top: 0.5rem;
  font-size: var(--text-hero);
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.05;
}

.hero__title {
  margin-top: 1rem;
  font-size: var(--text-body);
  color: var(--color-text-secondary);
  max-width: 560px;
}

.hero__actions {
  margin-top: 2.5rem;
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: center;
}

.hero__scroll {
  position: absolute;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  width: 26px;
  height: 42px;
  border: 2px solid var(--color-text-secondary);
  border-radius: 999px;
  display: flex;
  justify-content: center;
  padding-top: 6px;
  opacity: 0.6;
}

.hero__scroll span {
  width: 4px;
  height: 8px;
  border-radius: 999px;
  background: var(--color-text-secondary);
  animation: hero-scroll 1.8s ease-in-out infinite;
}

@keyframes hero-scroll {
  0% {
    opacity: 1;
    transform: translateY(0);
  }
  100% {
    opacity: 0;
    transform: translateY(10px);
  }
}
</style>
