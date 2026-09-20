<script setup lang="ts">
import { computed } from 'vue'
import { uiText } from '@/i18n/ui'
import { useLocaleStore } from '@/stores/locale'
import type { EngineeringCase } from '@/types/api'

const props = defineProps<{ cases: EngineeringCase[] }>()

const localeStore = useLocaleStore()
const t = computed(() => uiText[localeStore.locale].engineeringCases)

function title(item: EngineeringCase) {
  return localeStore.locale === 'zh' ? item.titleZh : item.titleEn
}
function category(item: EngineeringCase) {
  return localeStore.locale === 'zh' ? item.categoryZh : item.categoryEn
}
function summary(item: EngineeringCase) {
  return localeStore.locale === 'zh' ? item.summaryZh : item.summaryEn
}

const cases = computed(() => props.cases)
</script>

<template>
  <section
    id="engineering-cases"
    class="section section--alt engineering-cases"
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

      <p
        v-if="!cases.length"
        class="engineering-cases__empty"
      >
        {{ t.empty }}
      </p>

      <div
        v-else
        class="engineering-cases__grid"
      >
        <RouterLink
          v-for="(item, index) in cases"
          :key="item.id"
          v-motion
          :initial="{ opacity: 0, y: 16 }"
          :visible-once="{ opacity: 1, y: 0, transition: { duration: 400, delay: Math.min(index * 60, 300) } }"
          class="engineering-cases__card"
          :class="{ 'engineering-cases__card--featured': item.featured }"
          :to="{ name: 'case-detail', params: { slug: item.slug } }"
        >
          <p class="engineering-cases__category">
            {{ category(item) }}
          </p>
          <h3 class="engineering-cases__title">
            {{ title(item) }}
          </h3>
          <p class="engineering-cases__summary">
            {{ summary(item) }}
          </p>

          <div
            v-if="item.techStack.length"
            class="engineering-cases__tech"
          >
            <span
              v-for="tech in item.techStack"
              :key="tech"
              class="engineering-cases__tech-tag"
            >{{ tech }}</span>
          </div>

          <span class="engineering-cases__link">
            <span>{{ t.viewDetail }}</span>
            <span
              class="engineering-cases__link-arrow"
              aria-hidden="true"
            >→</span>
          </span>
        </RouterLink>
      </div>
    </div>
  </section>
</template>

<style scoped>
.engineering-cases__empty {
  color: var(--color-text-secondary);
}

.engineering-cases__grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-md);
}

@media (min-width: 640px) {
  .engineering-cases__grid {
    grid-template-columns: repeat(6, 1fr);
  }

  .engineering-cases__card {
    grid-column: span 3;
  }

  .engineering-cases__card--featured {
    grid-column: span 6;
  }
}

@media (min-width: 960px) {
  .engineering-cases__grid {
    grid-template-columns: repeat(12, 1fr);
    grid-auto-flow: dense;
  }

  .engineering-cases__card {
    grid-column: span 4;
  }

  .engineering-cases__card--featured {
    grid-column: span 8;
    grid-row: span 2;
  }
}

.engineering-cases__card {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  padding: 1.75rem;
  text-decoration: none;
  color: inherit;
  transition:
    transform var(--motion-base) var(--motion-easing),
    box-shadow var(--motion-base) var(--motion-easing),
    border-color var(--motion-base) var(--motion-easing);
}

.engineering-cases__card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-card-hover);
  border-color: var(--color-border-strong);
}

.engineering-cases__card--featured {
  padding: 2.25rem;
  justify-content: center;
}

.engineering-cases__card--featured .engineering-cases__title {
  font-size: var(--text-project-title);
}

.engineering-cases__category {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-accent);
}

.engineering-cases__title {
  font-size: 1.3rem;
  font-weight: 700;
}

.engineering-cases__summary {
  color: var(--color-text-secondary);
  line-height: 1.7;
  font-size: 0.95rem;
}

.engineering-cases__tech {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.engineering-cases__tech-tag {
  font-size: 0.8rem;
  padding: 0.3rem 0.7rem;
  border-radius: var(--radius-pill);
  background: var(--color-bg-alt);
  color: var(--color-text-secondary);
}

.engineering-cases__link {
  margin-top: auto;
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-weight: 600;
  color: var(--color-accent);
}

.engineering-cases__link-arrow {
  display: inline-block;
  transition: transform var(--motion-base) var(--motion-easing);
}

.engineering-cases__card:hover .engineering-cases__link-arrow {
  transform: translateX(3px);
}
</style>
