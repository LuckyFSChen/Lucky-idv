<script setup lang="ts">
import { computed } from 'vue'
import { formatDateRange } from '@/composables/useDateRange'
import { uiText } from '@/i18n/ui'
import { useLocaleStore } from '@/stores/locale'
import type { Experience } from '@/types/api'

const props = defineProps<{ experiences: Experience[] }>()

const localeStore = useLocaleStore()
const t = computed(() => uiText[localeStore.locale].experience)

function company(exp: Experience) {
  return localeStore.locale === 'zh' ? exp.companyZh : exp.companyEn
}
function role(exp: Experience) {
  return localeStore.locale === 'zh' ? exp.roleZh : exp.roleEn
}
function location(exp: Experience) {
  return localeStore.locale === 'zh' ? exp.locationZh : exp.locationEn
}
function summary(exp: Experience) {
  return localeStore.locale === 'zh' ? exp.summaryZh : exp.summaryEn
}
function highlights(exp: Experience) {
  return localeStore.locale === 'zh' ? exp.highlightsZh : exp.highlightsEn
}
function dateRange(exp: Experience) {
  return formatDateRange(exp.startDate, exp.endDate, localeStore.locale)
}

const experiences = computed(() => props.experiences)
</script>

<template>
  <section
    id="experience"
    class="section experience"
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

      <ol
        v-motion-fade-visible-once
        class="timeline"
      >
        <li
          v-for="exp in experiences"
          :key="exp.id"
          class="timeline__item"
        >
          <div
            class="timeline__marker"
            aria-hidden="true"
          />
          <div class="timeline__content">
            <p class="timeline__date">
              {{ dateRange(exp) }}
            </p>
            <h3 class="timeline__role">
              {{ role(exp) }}
            </h3>
            <p class="timeline__company">
              {{ company(exp) }}<span v-if="location(exp)"> · {{ location(exp) }}</span>
            </p>
            <p class="timeline__summary">
              {{ summary(exp) }}
            </p>
            <ul class="timeline__highlights">
              <li
                v-for="(item, index) in highlights(exp)"
                :key="index"
              >
                {{ item }}
              </li>
            </ul>
          </div>
        </li>
      </ol>
    </div>
  </section>
</template>

<style scoped>
.timeline {
  list-style: none;
  margin: 0;
  padding: 0;
  max-width: 760px;
  margin-inline: auto;
  position: relative;
}

.timeline__item {
  position: relative;
  padding-left: 2.25rem;
  padding-bottom: var(--space-xl);
}

.timeline__item:not(:last-child)::before {
  content: '';
  position: absolute;
  left: 5px;
  top: 8px;
  bottom: -0.5rem;
  width: 2px;
  background: var(--color-border-strong);
}

.timeline__marker {
  position: absolute;
  left: 0;
  top: 6px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--gradient-text);
}

.timeline__date {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.timeline__role {
  margin-top: 0.35rem;
  font-size: 1.25rem;
  font-weight: 700;
}

.timeline__company {
  margin-top: 0.25rem;
  color: var(--color-text-secondary);
  font-size: 0.95rem;
}

.timeline__summary {
  margin-top: var(--space-sm);
  line-height: 1.75;
  color: var(--color-text);
  font-size: var(--text-body-sm);
}

.timeline__highlights {
  margin-top: var(--space-sm);
  padding-left: 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  color: var(--color-text-secondary);
  font-size: var(--text-body-sm);
  line-height: 1.6;
}
</style>
