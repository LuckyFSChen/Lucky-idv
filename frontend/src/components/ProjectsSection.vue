<script setup lang="ts">
import { computed } from 'vue'
import { resolveAssetUrl } from '@/api/client'
import { uiText } from '@/i18n/ui'
import { useLocaleStore } from '@/stores/locale'
import type { Project } from '@/types/api'

const props = defineProps<{ projects: Project[] }>()

const localeStore = useLocaleStore()
const t = computed(() => uiText[localeStore.locale].projects)

function name(project: Project) {
  return localeStore.locale === 'zh' ? project.nameZh : project.nameEn
}
function summary(project: Project) {
  return localeStore.locale === 'zh' ? project.summaryZh : project.summaryEn
}
function highlights(project: Project) {
  return localeStore.locale === 'zh' ? project.highlightsZh : project.highlightsEn
}

const projects = computed(() => props.projects)
</script>

<template>
  <section
    id="projects"
    class="section section--alt projects"
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
        class="projects__grid"
      >
        <article
          v-for="project in projects"
          :key="project.id"
          class="projects__card"
        >
          <div
            class="projects__media"
            aria-hidden="true"
          >
            <img
              v-if="project.imageUrl"
              :src="resolveAssetUrl(project.imageUrl) ?? undefined"
              :alt="name(project)"
            >
            <span
              v-else
              class="projects__media-placeholder"
            >{{ name(project).slice(0, 2).toUpperCase() }}</span>
          </div>

          <div class="projects__body">
            <h3 class="projects__name">
              {{ name(project) }}
            </h3>
            <p class="projects__summary">
              {{ summary(project) }}
            </p>

            <ul class="projects__highlights">
              <li
                v-for="(item, index) in highlights(project)"
                :key="index"
              >
                {{ item }}
              </li>
            </ul>

            <div
              v-if="project.techStack.length"
              class="projects__tech"
            >
              <span class="projects__tech-label">{{ t.techStack }}</span>
              <div class="projects__tech-list">
                <span
                  v-for="tech in project.techStack"
                  :key="tech"
                  class="projects__tech-tag"
                >{{
                  tech
                }}</span>
              </div>
            </div>

            <a
              v-if="project.link"
              class="projects__link"
              :href="project.link"
              target="_blank"
              rel="noopener"
            >
              <span>{{ t.viewProject }}</span>
              <span
                class="projects__link-arrow"
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
.projects__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.75rem;
}

.projects__card {
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

.projects__card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-card-hover);
  border-color: var(--color-border-strong);
}

.projects__media {
  height: 180px;
  background: var(--gradient-hero);
  display: flex;
  align-items: center;
  justify-content: center;
}

.projects__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.projects__media-placeholder {
  font-size: 2.5rem;
  font-weight: 800;
  color: var(--color-text-secondary);
  opacity: 0.35;
}

.projects__body {
  padding: 1.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.projects__name {
  font-size: var(--text-project-title);
  font-weight: 700;
}

.projects__summary {
  color: var(--color-text-secondary);
  line-height: 1.7;
  font-size: 0.95rem;
}

.projects__highlights {
  margin: 0;
  padding-left: 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.9rem;
  color: var(--color-text);
}

.projects__tech {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.projects__tech-label {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-secondary);
}

.projects__tech-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.projects__tech-tag {
  font-size: 0.8rem;
  padding: 0.3rem 0.7rem;
  border-radius: var(--radius-pill);
  background: var(--color-bg-alt);
  color: var(--color-text-secondary);
}

.projects__link {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-weight: 600;
  color: var(--color-accent);
  text-decoration: none;
}

.projects__link:hover {
  color: var(--color-accent-strong);
}

.projects__link-arrow {
  display: inline-block;
  transition: transform var(--motion-base) var(--motion-easing);
}

.projects__link:hover .projects__link-arrow {
  transform: translateX(3px);
}
</style>
