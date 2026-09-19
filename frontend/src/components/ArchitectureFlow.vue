<script setup lang="ts">
import { computed } from 'vue'
import { useLocaleStore } from '@/stores/locale'
import type { ArchitectureStep } from '@/types/api'

const props = defineProps<{ steps: ArchitectureStep[] }>()

const localeStore = useLocaleStore()

function label(step: ArchitectureStep) {
  return localeStore.locale === 'zh' ? step.labelZh : step.labelEn
}

const steps = computed(() => props.steps)
</script>

<template>
  <ol
    v-if="steps.length"
    class="architecture-flow"
  >
    <li
      v-for="(step, index) in steps"
      :key="index"
      class="architecture-flow__item"
    >
      <span class="architecture-flow__node">{{ label(step) }}</span>
      <span
        v-if="index < steps.length - 1"
        class="architecture-flow__arrow"
        aria-hidden="true"
      >→</span>
    </li>
  </ol>
</template>

<style scoped>
.architecture-flow {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}

.architecture-flow__item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.architecture-flow__node {
  padding: 0.6rem 1.1rem;
  border-radius: var(--radius-sm);
  background: var(--color-bg-alt);
  border: 1px solid var(--color-border);
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--color-text);
}

.architecture-flow__arrow {
  color: var(--color-text-secondary);
  font-size: 1.1rem;
}
</style>
