<script setup lang="ts">
import { computed } from 'vue'
import { uiText } from '@/i18n/ui'
import { useLocaleStore } from '@/stores/locale'

const localeStore = useLocaleStore()
const t = computed(() => uiText[localeStore.locale].footer)
const year = new Date().getFullYear()
</script>

<template>
  <footer class="footer">
    <div class="container footer__inner">
      <span>© {{ year }} idv-web</span>
      <span>{{ t.builtWith }}</span>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  border-top: 1px solid var(--color-border);
  padding-block: 1.75rem;
}

.footer__inner {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}
</style>
