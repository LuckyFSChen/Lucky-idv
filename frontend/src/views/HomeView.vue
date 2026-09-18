<script setup lang="ts">
import { computed, onMounted } from 'vue'
import AboutSection from '@/components/AboutSection.vue'
import AppFooter from '@/components/AppFooter.vue'
import AppNav from '@/components/AppNav.vue'
import ContactSection from '@/components/ContactSection.vue'
import ExperienceSection from '@/components/ExperienceSection.vue'
import HeroSection from '@/components/HeroSection.vue'
import ProjectsSection from '@/components/ProjectsSection.vue'
import SkillsSection from '@/components/SkillsSection.vue'
import { uiText } from '@/i18n/ui'
import { useLocaleStore } from '@/stores/locale'
import { usePortfolioStore } from '@/stores/portfolio'

const portfolio = usePortfolioStore()
const localeStore = useLocaleStore()
const t = computed(() => uiText[localeStore.locale].state)

onMounted(() => {
  portfolio.fetchAll()
})
</script>

<template>
  <div class="page">
    <AppNav />

    <main v-if="portfolio.status === 'success'">
      <HeroSection :profile="portfolio.profile" />
      <AboutSection :profile="portfolio.profile" />
      <SkillsSection :categories="portfolio.skillCategories" />
      <ExperienceSection :experiences="portfolio.experiences" />
      <ProjectsSection :projects="portfolio.projects" />
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
  color: #c0392b;
}
</style>
