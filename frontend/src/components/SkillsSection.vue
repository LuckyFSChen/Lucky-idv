<script setup lang="ts">
import { computed } from 'vue'
import { uiText } from '@/i18n/ui'
import { useLocaleStore } from '@/stores/locale'
import { motionTransition, useReducedMotion } from '@/composables/useReducedMotion'
import type { SkillCategory } from '@/types/api'

const props = defineProps<{ categories: SkillCategory[] }>()

const localeStore = useLocaleStore()
const t = computed(() => uiText[localeStore.locale].skills)

const reducedMotion = useReducedMotion()
function reveal(index: number) {
  return motionTransition(400, Math.min(index * 60, 300), reducedMotion.value)
}

function categoryName(category: SkillCategory) {
  return localeStore.locale === 'zh' ? category.nameZh : category.nameEn
}

function skillName(skill: SkillCategory['skills'][number]) {
  return localeStore.locale === 'zh' ? skill.nameZh : skill.nameEn
}

const categories = computed(() => props.categories)
</script>

<template>
  <section
    id="skills"
    class="section section--alt skills"
  >
    <div class="container">
      <div class="section-header">
        <h2 class="section-title">
          {{ t.title }}
        </h2>
        <p class="section-subtitle">
          {{ t.subtitle }}
        </p>
      </div>

      <div class="skills__grid">
        <article
          v-for="(category, index) in categories"
          :key="category.id"
          v-motion
          :initial="{ opacity: 0, y: 16 }"
          :visible-once="{ opacity: 1, y: 0, transition: reveal(index) }"
          class="skills__card"
        >
          <h3 class="skills__card-title">
            {{ categoryName(category) }}
          </h3>
          <ul class="skills__list">
            <li
              v-for="skill in category.skills"
              :key="skill.id"
            >
              {{ skillName(skill) }}
            </li>
          </ul>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.skills__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1.25rem;
}

.skills__card {
  background: var(--color-surface);
  border-radius: var(--radius-md);
  padding: 1.75rem;
  border: 1px solid var(--color-border);
  transition:
    transform var(--motion-base) var(--motion-easing),
    box-shadow var(--motion-base) var(--motion-easing),
    border-color var(--motion-base) var(--motion-easing);
}

.skills__card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-card);
  border-color: var(--color-border-strong);
}

.skills__card-title {
  font-size: 1.05rem;
  font-weight: 700;
  margin-bottom: 0.9rem;
}

.skills__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.skills__list li {
  font-size: 0.85rem;
  padding: 0.4rem 0.8rem;
  border-radius: var(--radius-pill);
  background: var(--color-bg-alt);
  color: var(--color-text-secondary);
}
</style>
