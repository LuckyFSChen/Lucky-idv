<script setup lang="ts">
import { computed } from 'vue'
import { uiText } from '@/i18n/ui'
import { useLocaleStore } from '@/stores/locale'
import type { Profile } from '@/types/api'

const props = defineProps<{ profile: Profile | null }>()

const localeStore = useLocaleStore()
const t = computed(() => uiText[localeStore.locale].contact)

const email = computed(() => props.profile?.contactEmail)
const links = computed(() => props.profile?.contactLinks ?? [])
</script>

<template>
  <section
    id="contact"
    class="section contact"
  >
    <div class="container">
      <div
        v-motion-fade-visible-once
        class="contact__card"
      >
        <h2 class="section-title">
          {{ t.title }}
        </h2>
        <p class="section-subtitle">
          {{ t.subtitle }}
        </p>

        <div class="contact__actions">
          <a
            v-if="email"
            class="btn btn--primary"
            :href="`mailto:${email}`"
          >{{ t.emailCta }}</a>
          <a
            v-for="link in links"
            :key="link.url"
            class="btn btn--secondary"
            :href="link.url"
            target="_blank"
            rel="noopener"
          >
            {{ link.label }}
          </a>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.contact__card {
  text-align: center;
  max-width: 640px;
  margin-inline: auto;
}

.contact__actions {
  margin-top: 2rem;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 1rem;
}
</style>
