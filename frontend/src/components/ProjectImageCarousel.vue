<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { resolveAssetUrl } from '@/api/client'
import { useReducedMotion } from '@/composables/useReducedMotion'
import { uiText } from '@/i18n/ui'
import { useLocaleStore } from '@/stores/locale'

const props = defineProps<{ images: string[]; alt: string; placeholder: string }>()
const localeStore = useLocaleStore()
const t = computed(() => uiText[localeStore.locale].projects)
const reducedMotion = useReducedMotion()
const currentIndex = ref(0)
const multiple = computed(() => props.images.length > 1)

watch(() => [...props.images], () => {
  currentIndex.value = 0
})

function move(direction: number) {
  if (multiple.value) {
    currentIndex.value = (currentIndex.value + direction + props.images.length) % props.images.length
  }
}

function onKeydown(event: KeyboardEvent) {
  if (!multiple.value || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return
  event.preventDefault()
  event.stopPropagation()
  move(event.key === 'ArrowLeft' ? -1 : 1)
}
</script>

<template>
  <div
    class="project-carousel"
    :class="{ 'project-carousel--reduced': reducedMotion }"
    role="group"
    :aria-label="alt"
    :tabindex="multiple ? 0 : undefined"
    @keydown="onKeydown"
    @click.stop
  >
    <template v-if="images.length">
      <div class="project-carousel__viewport">
        <div
          class="project-carousel__track"
          :style="{ transform: `translateX(-${currentIndex * 100}%)` }"
        >
          <img
            v-for="(image, index) in images"
            :key="`${index}-${image}`"
            :src="resolveAssetUrl(image) ?? undefined"
            :alt="t.imageAlt.replace('{name}', alt).replace('{index}', String(index + 1))"
            :aria-hidden="index !== currentIndex"
          >
        </div>
        <template v-if="multiple">
          <button
            type="button"
            class="project-carousel__arrow project-carousel__arrow--previous"
            :aria-label="t.previousImage"
            @click="move(-1)"
          >
            <span aria-hidden="true">‹</span>
          </button>
          <button
            type="button"
            class="project-carousel__arrow project-carousel__arrow--next"
            :aria-label="t.nextImage"
            @click="move(1)"
          >
            <span aria-hidden="true">›</span>
          </button>
        </template>
      </div>
      <div
        v-if="multiple"
        class="project-carousel__dots"
      >
        <button
          v-for="(_, index) in images"
          :key="index"
          type="button"
          class="project-carousel__dot"
          :class="{ active: index === currentIndex }"
          :aria-label="t.imageNavigation.replace('{index}', String(index + 1))"
          :aria-current="index === currentIndex ? 'true' : undefined"
          @click="currentIndex = index"
        >
          <span aria-hidden="true" />
        </button>
      </div>
    </template>
    <span
      v-else
      class="project-carousel__placeholder"
    >{{ placeholder }}</span>
  </div>
</template>

<style scoped>
.project-carousel {
  width: 100%;
  height: 180px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: var(--gradient-hero);
}

.project-carousel__viewport {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.project-carousel__track {
  display: flex;
  height: 100%;
  transition: transform var(--motion-base) var(--motion-easing);
}

.project-carousel--reduced .project-carousel__track {
  transition: none;
}

.project-carousel__track img {
  flex: 0 0 100%;
  width: 100%;
  min-width: 0;
  height: 100%;
  object-fit: cover;
}

.project-carousel__arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 36px;
  height: 36px;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-pill);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 1.75rem;
  cursor: pointer;
}

.project-carousel__arrow--previous { left: 0.5rem; }
.project-carousel__arrow--next { right: 0.5rem; }

.project-carousel__dots {
  display: flex;
  justify-content: center;
  background: var(--color-surface);
}

.project-carousel__dot {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 0;
  padding: 0;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
}

.project-carousel__dot span {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-pill);
  background: currentColor;
}

.project-carousel__dot.active { color: var(--color-accent); }
.project-carousel button:focus-visible,
.project-carousel:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: -2px;
}

.project-carousel__placeholder {
  margin: auto;
  font-size: 2.5rem;
  font-weight: 800;
  color: var(--color-text-secondary);
  opacity: 0.35;
}
</style>
