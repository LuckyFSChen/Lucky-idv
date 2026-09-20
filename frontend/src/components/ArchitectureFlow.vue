<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { useLocaleStore } from '@/stores/locale'
import type { ArchitectureStep } from '@/types/api'

const props = defineProps<{ steps: ArchitectureStep[] }>()

const localeStore = useLocaleStore()
const revealed = ref(false)

onMounted(async () => {
  await nextTick()
  revealed.value = true
})

function label(step: ArchitectureStep) {
  return localeStore.locale === 'zh' ? step.labelZh : step.labelEn
}

const steps = computed(() => props.steps)
</script>

<template>
  <ol
    v-if="steps.length"
    class="architecture-flow"
    :class="{ 'architecture-flow--revealed': revealed }"
  >
    <li
      v-for="(step, index) in steps"
      :key="index"
      class="architecture-flow__item"
      :style="{ transitionDelay: `${Math.min(index * 70, 350)}ms` }"
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
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-sm);
}

@media (min-width: 720px) {
  .architecture-flow {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
  }
}

.architecture-flow__item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-sm);
  opacity: 0;
  transform: translateY(8px);
  transition:
    opacity var(--motion-slow) var(--motion-easing),
    transform var(--motion-slow) var(--motion-easing);
}

.architecture-flow--revealed .architecture-flow__item {
  opacity: 1;
  transform: translateY(0);
}

@media (min-width: 720px) {
  .architecture-flow__item {
    flex-direction: row;
    align-items: center;
  }
}

.architecture-flow__node {
  padding: 0.6rem 1.1rem;
  border-radius: var(--radius-sm);
  background: var(--color-bg-alt);
  border: 1px solid var(--color-border);
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--color-text);
  transition: border-color var(--motion-base) var(--motion-easing);
}

.architecture-flow__arrow {
  color: var(--color-text-secondary);
  font-size: 1.1rem;
  display: inline-block;
  transform: rotate(90deg);
}

@media (min-width: 720px) {
  .architecture-flow__arrow {
    transform: none;
  }
}
</style>
