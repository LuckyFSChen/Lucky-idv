<script setup lang="ts">
import { computed } from 'vue'
import { resolveAssetUrl } from '@/api/client'
import { uiText } from '@/i18n/ui'
import { useLocaleStore } from '@/stores/locale'
import type { Project } from '@/types/api'

const props = defineProps<{ projects: Project[] }>()

const localeStore = useLocaleStore()
const t = computed(() => uiText[localeStore.locale].selectedWork)

function name(project: Project) {
  return localeStore.locale === 'zh' ? project.nameZh : project.nameEn
}
function category(project: Project) {
  return localeStore.locale === 'zh' ? project.categoryZh : project.categoryEn
}
function summary(project: Project) {
  return localeStore.locale === 'zh' ? project.summaryZh : project.summaryEn
}

const featuredProjects = computed(() => props.projects.filter((project) => project.featured))
</script>

<template>
  <section
    v-if="featuredProjects.length"
    id="selected-work"
    class="section selected-work"
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

      <div
        v-motion-fade-visible-once
        class="selected-work__grid"
      >
        <article
          v-for="project in featuredProjects"
          :key="project.id"
          class="selected-work__card"
        >
          <div
            class="selected-work__media"
            aria-hidden="true"
          >
            <img
              v-if="project.imageUrl"
              :src="resolveAssetUrl(project.imageUrl) ?? undefined"
              :alt="name(project)"
            >
            <span
              v-else
              class="selected-work__media-placeholder"
            >{{ name(project).slice(0, 2).toUpperCase() }}</span>
          </div>

          <div class="selected-work__body">
            <p
              v-if="category(project)"
              class="selected-work__category"
            >
              {{ category(project) }}
            </p>
            <h3 class="selected-work__name">
              {{ name(project) }}
            </h3>
            <p class="selected-work__summary">
              {{ summary(project) }}
            </p>

            <a
              v-if="project.link"
              class="selected-work__link"
              :href="project.link"
              target="_blank"
              rel="noopener"
            >
              <span>{{ t.viewCase }}</span>
              <span
                class="selected-work__link-arrow"
                aria-hidden="true"
              >→</span>
            </a>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.selected-work__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.75rem;
}

.selected-work__card {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  transition:
    transform var(--motion-base) var(--motion-easing),
    box-shadow var(--motion-base) var(--motion-easing),
    border-color var(--motion-base) var(--motion-easing);
}

.selected-work__card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-card-hover);
  border-color: var(--color-border-strong);
}

.selected-work__media {
  height: 180px;
  background: var(--gradient-hero);
  display: flex;
  align-items: center;
  justify-content: center;
}

.selected-work__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.selected-work__media-placeholder {
  font-size: 2.5rem;
  font-weight: 800;
  color: var(--color-text-secondary);
  opacity: 0.35;
}

.selected-work__body {
  padding: 1.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.selected-work__category {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-accent);
}

.selected-work__name {
  font-size: var(--text-project-title);
  font-weight: 700;
}

.selected-work__summary {
  color: var(--color-text-secondary);
  line-height: 1.7;
  font-size: 0.95rem;
}

.selected-work__link {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-weight: 600;
  color: var(--color-accent);
  text-decoration: none;
}

.selected-work__link:hover {
  color: var(--color-accent-strong);
}

.selected-work__link-arrow {
  display: inline-block;
  transition: transform var(--motion-base) var(--motion-easing);
}

.selected-work__link:hover .selected-work__link-arrow {
  transform: translateX(3px);
}
</style>
