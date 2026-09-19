<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import ArchitectureFlow from '@/components/ArchitectureFlow.vue'
import AppFooter from '@/components/AppFooter.vue'
import AppNav from '@/components/AppNav.vue'
import { uiText } from '@/i18n/ui'
import { useLocaleStore } from '@/stores/locale'
import { usePortfolioStore } from '@/stores/portfolio'

const route = useRoute()
const portfolio = usePortfolioStore()
const localeStore = useLocaleStore()
const t = computed(() => uiText[localeStore.locale].caseDetail)
const stateText = computed(() => uiText[localeStore.locale].state)

const slug = computed(() => String(route.params.slug))
const engineeringCase = computed(() => portfolio.getEngineeringCaseBySlug(slug.value))

onMounted(() => {
  if (portfolio.status === 'idle') {
    portfolio.fetchAll()
  }
})

function pick(zh: string, en: string) {
  return localeStore.locale === 'zh' ? zh : en
}
</script>

<template>
  <div class="page">
    <AppNav />

    <main
      v-if="portfolio.status === 'success' && engineeringCase"
      class="case-detail"
    >
      <div class="container">
        <p class="case-detail__category">
          {{ pick(engineeringCase.categoryZh, engineeringCase.categoryEn) }}
        </p>
        <h1 class="case-detail__title">
          {{ pick(engineeringCase.titleZh, engineeringCase.titleEn) }}
        </h1>

        <section class="case-detail__section">
          <h2>{{ t.overview }}</h2>
          <p>{{ pick(engineeringCase.summaryZh, engineeringCase.summaryEn) }}</p>
        </section>

        <section class="case-detail__section">
          <h2>{{ t.problem }}</h2>
          <p>{{ pick(engineeringCase.problemZh, engineeringCase.problemEn) }}</p>
        </section>

        <section class="case-detail__section">
          <h2>{{ t.context }}</h2>
          <p>{{ pick(engineeringCase.contextZh, engineeringCase.contextEn) }}</p>
        </section>

        <section class="case-detail__section">
          <h2>{{ t.investigation }}</h2>
          <p>{{ pick(engineeringCase.investigationZh, engineeringCase.investigationEn) }}</p>
        </section>

        <section class="case-detail__section">
          <h2>{{ t.solution }}</h2>
          <p>{{ pick(engineeringCase.solutionZh, engineeringCase.solutionEn) }}</p>
        </section>

        <section
          v-if="engineeringCase.architecture.length"
          class="case-detail__section"
        >
          <h2>{{ t.architecture }}</h2>
          <ArchitectureFlow :steps="engineeringCase.architecture" />
        </section>

        <section class="case-detail__section">
          <h2>{{ t.validation }}</h2>
          <p>{{ pick(engineeringCase.validationZh, engineeringCase.validationEn) }}</p>
        </section>

        <section class="case-detail__section">
          <h2>{{ t.result }}</h2>
          <p>{{ pick(engineeringCase.resultZh, engineeringCase.resultEn) }}</p>
        </section>

        <section
          v-if="engineeringCase.techStack.length"
          class="case-detail__section"
        >
          <h2>{{ t.technology }}</h2>
          <div class="case-detail__tech">
            <span
              v-for="tech in engineeringCase.techStack"
              :key="tech"
              class="case-detail__tech-tag"
            >{{ tech }}</span>
          </div>
        </section>

        <section
          v-if="engineeringCase.projectUrl || engineeringCase.githubUrl"
          class="case-detail__section"
        >
          <h2>{{ t.relatedProject }}</h2>
          <div class="case-detail__links">
            <a
              v-if="engineeringCase.projectUrl"
              :href="engineeringCase.projectUrl"
              target="_blank"
              rel="noopener"
              class="case-detail__link"
            >
              {{ t.viewProject }} →
            </a>
            <a
              v-if="engineeringCase.githubUrl"
              :href="engineeringCase.githubUrl"
              target="_blank"
              rel="noopener"
              class="case-detail__link"
            >
              {{ t.viewGithub }} →
            </a>
          </div>
        </section>
      </div>
    </main>

    <div
      v-else-if="portfolio.status === 'error'"
      class="page__state page__state--error"
    >
      <p>{{ stateText.error }}</p>
    </div>

    <div
      v-else-if="portfolio.status === 'success'"
      class="page__state"
    >
      <p>{{ t.notFound }}</p>
      <RouterLink
        class="case-detail__back"
        :to="{ name: 'home' }"
      >
        {{ t.backHome }}
      </RouterLink>
    </div>

    <div
      v-else
      class="page__state"
    >
      <p>{{ stateText.loading }}</p>
    </div>

    <AppFooter />
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.page__state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  min-height: 60vh;
  color: var(--color-text-secondary);
  font-size: 1.05rem;
}

.page__state--error {
  color: #c0392b;
}

.case-detail {
  flex: 1;
  padding-block: 3rem;
}

.case-detail__category {
  font-size: 0.85rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-accent);
}

.case-detail__title {
  margin-top: 0.5rem;
  font-size: 2.2rem;
  font-weight: 800;
}

.case-detail__section {
  margin-top: 2.25rem;
}

.case-detail__section h2 {
  font-size: 1.2rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
}

.case-detail__section p {
  line-height: 1.8;
  color: var(--color-text);
  white-space: pre-line;
}

.case-detail__tech {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.case-detail__tech-tag {
  font-size: 0.8rem;
  padding: 0.3rem 0.7rem;
  border-radius: 999px;
  background: var(--color-bg-alt);
  color: var(--color-text-secondary);
}

.case-detail__links {
  display: flex;
  gap: 1.5rem;
}

.case-detail__link,
.case-detail__back {
  font-weight: 600;
  color: var(--color-accent);
  text-decoration: none;
}

.case-detail__link:hover,
.case-detail__back:hover {
  color: var(--color-accent-strong);
}
</style>
