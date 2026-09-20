<script setup lang="ts">
import { computed } from 'vue'
import { uiText } from '@/i18n/ui'
import { useLocaleStore } from '@/stores/locale'
import type { Certification } from '@/types/api'

const props = defineProps<{ certifications: Certification[] }>()

const localeStore = useLocaleStore()
const t = computed(() => uiText[localeStore.locale].certification)

function name(item: Certification) {
  return localeStore.locale === 'zh' ? item.nameZh : item.nameEn
}
function issuer(item: Certification) {
  return localeStore.locale === 'zh' ? item.issuerZh : item.issuerEn
}
function description(item: Certification) {
  return localeStore.locale === 'zh' ? item.descriptionZh : item.descriptionEn
}

// 僅呈現具備正式發證日期（issuedAt）的已驗證項目，避免在發證資訊確認前展示未證實的證照聲稱。
const certifications = computed(() => props.certifications.filter((item) => !!item.issuedAt))
</script>

<template>
  <section
    id="certification"
    class="section certification"
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
        v-if="!certifications.length"
        class="certification__empty"
      >
        {{ t.empty }}
      </p>

      <div
        v-else
        v-motion-fade-visible-once
        class="certification__grid"
      >
        <article
          v-for="item in certifications"
          :key="item.id"
          class="certification__card"
        >
          <h3 class="certification__name">
            {{ name(item) }}
          </h3>
          <p class="certification__issuer">
            {{ t.issuer }}：{{ issuer(item) }}
          </p>
          <p
            v-if="description(item)"
            class="certification__description"
          >
            {{ description(item) }}
          </p>
          <p
            v-if="item.credential"
            class="certification__credential"
          >
            {{ t.credential }}：{{ item.credential }}
          </p>
          <a
            v-if="item.link"
            class="certification__link"
            :href="item.link"
            target="_blank"
            rel="noopener"
          >
            {{ t.viewCredential }} →
          </a>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.certification__empty {
  color: var(--color-text-secondary);
}

.certification__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
}

.certification__card {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  transition: border-color var(--motion-base) var(--motion-easing);
}

.certification__name {
  font-size: 1.15rem;
  font-weight: 700;
}

.certification__issuer {
  color: var(--color-text-secondary);
  font-size: 0.9rem;
}

.certification__description {
  color: var(--color-text);
  font-size: 0.92rem;
  line-height: 1.6;
}

.certification__credential {
  color: var(--color-text-secondary);
  font-size: 0.85rem;
}

.certification__link {
  align-self: flex-start;
  font-weight: 600;
  color: var(--color-accent);
  text-decoration: none;
}

.certification__link:hover {
  color: var(--color-accent-strong);
}
</style>
