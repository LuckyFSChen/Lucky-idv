<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from 'vue'
import AboutSection from '@/components/AboutSection.vue'
import AppFooter from '@/components/AppFooter.vue'
import AppNav from '@/components/AppNav.vue'
import CertificationSection from '@/components/CertificationSection.vue'
import ContactSection from '@/components/ContactSection.vue'
import EngineeringCasesSection from '@/components/EngineeringCasesSection.vue'
import ExperienceSection from '@/components/ExperienceSection.vue'
import HeroSection from '@/components/HeroSection.vue'
import ProjectsSection from '@/components/ProjectsSection.vue'
import SelectedWorkSection from '@/components/SelectedWorkSection.vue'
import SkillsSection from '@/components/SkillsSection.vue'
import { uiText } from '@/i18n/ui'
import { useLocaleStore } from '@/stores/locale'
import { usePortfolioStore } from '@/stores/portfolio'
import { removeJsonLd, setJsonLd } from '@/utils/head'

const SITE_URL = 'https://idv.lucky0504.idv.tw/'

const portfolio = usePortfolioStore()
const localeStore = useLocaleStore()
const t = computed(() => uiText[localeStore.locale].state)

const otherProjects = computed(() => portfolio.projects.filter((project) => !project.featured))

onMounted(() => {
  portfolio.fetchAll()
})

watch(
  () => [portfolio.status, portfolio.profile] as const,
  ([status, profile]) => {
    if (status !== 'success' || !profile) return

    setJsonLd('website', {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Lucky | Backend & System Engineer',
      url: SITE_URL,
    })

    const person: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: profile.preferredName || profile.displayName,
      jobTitle: profile.titleEn,
      description: profile.introEn,
      url: SITE_URL,
    }
    if (profile.contactEmail) {
      person.email = profile.contactEmail
    }
    const sameAs = (profile.contactLinks ?? []).map((link) => link.url)
    if (sameAs.length > 0) {
      person.sameAs = sameAs
    }
    setJsonLd('person', person)

    setJsonLd('profile-page', {
      '@context': 'https://schema.org',
      '@type': 'ProfilePage',
      url: SITE_URL,
      mainEntity: { '@type': 'Person', name: profile.preferredName || profile.displayName },
    })
  },
  { immediate: true },
)

onUnmounted(() => {
  removeJsonLd('website')
  removeJsonLd('person')
  removeJsonLd('profile-page')
})
</script>

<template>
  <div class="page">
    <AppNav />

    <main v-if="portfolio.status === 'success'">
      <HeroSection :profile="portfolio.profile" />
      <AboutSection :profile="portfolio.profile" />
      <SelectedWorkSection :projects="portfolio.projects" />
      <EngineeringCasesSection :cases="portfolio.engineeringCases" />
      <ExperienceSection :experiences="portfolio.experiences" />
      <SkillsSection :categories="portfolio.skillCategories" />
      <CertificationSection :certifications="portfolio.certifications" />
      <ProjectsSection :projects="otherProjects" />
      <ContactSection :profile="portfolio.profile" />
    </main>

    <div
      v-else-if="portfolio.status === 'error'"
      class="page__state page__state--error"
    >
      <p>{{ t.error }}</p>
    </div>

    <div
      v-else
      class="page__state"
    >
      <p>{{ t.loading }}</p>
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
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  color: var(--color-text-secondary);
  font-size: 1.05rem;
}

.page__state--error {
  color: var(--color-danger);
}
</style>
