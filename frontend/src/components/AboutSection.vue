<script setup lang="ts">
import { computed } from 'vue'
import { uiText } from '@/i18n/ui'
import { useLocaleStore } from '@/stores/locale'
import type { Profile } from '@/types/api'

const props = defineProps<{ profile: Profile | null }>()

const localeStore = useLocaleStore()
const t = computed(() => uiText[localeStore.locale].about)
const intro = computed(() =>
  localeStore.locale === 'zh' ? props.profile?.introZh : props.profile?.introEn,
)
const paragraphs = computed(() => (intro.value ?? '').split('\n\n').filter(Boolean))
</script>

<template>
  <section
    id="about"
    class="section about"
  >
    <div class="container">
      <div class="section-header">
        <h2 class="section-title">
          {{ t.title }}
        </h2>
      </div>

      <div
        v-motion-slide-visible-once-bottom
        class="about__body"
      >
        <p
          v-for="(paragraph, index) in paragraphs"
          :key="index"
        >
          {{ paragraph }}
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.about__body {
  max-width: 720px;
  margin-inline: auto;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  font-size: 1.05rem;
  line-height: 1.85;
  color: var(--color-text);
}
</style>
