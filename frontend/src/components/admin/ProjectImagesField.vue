<script setup lang="ts">
import { ref } from 'vue'
import { adminApi } from '@/api/adminClient'
import { resolveAssetUrl } from '@/api/client'
import { useAdminAuthStore } from '@/stores/adminAuth'
import {
  MAX_PROJECT_IMAGES,
  MAX_PROJECT_IMAGE_SIZE_BYTES,
  PROJECT_IMAGE_ACCEPT,
  PROJECT_IMAGE_MIME_TYPES,
} from '@/constants/projectImages'

const props = defineProps<{ modelValue: string[]; disabled?: boolean }>()
const emit = defineEmits<{
  'update:modelValue': [images: string[]]
  busy: [value: boolean]
  error: [error: unknown]
}>()
const authStore = useAdminAuthStore()
const uploading = ref(false)

function move(index: number, offset: number) {
  const images = [...props.modelValue]
  const target = index + offset
  if (props.disabled || uploading.value || target < 0 || target >= images.length) return
  ;[images[index], images[target]] = [images[target], images[index]]
  emit('update:modelValue', images)
}

async function selectImages(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''
  if (!files.length || props.disabled || uploading.value) return
  if (props.modelValue.length + files.length > MAX_PROJECT_IMAGES) {
    emit('error', new Error('最多 3 張圖片（每張 5MB 以內）。'))
    return
  }
  for (const file of files) {
    if (!(PROJECT_IMAGE_MIME_TYPES as readonly string[]).includes(file.type)) {
      emit('error', new Error('僅允許上傳 jpg、png 或 webp 格式的圖片。'))
      return
    }
    if (file.size > MAX_PROJECT_IMAGE_SIZE_BYTES) {
      emit('error', new Error('圖片大小不可超過 5MB。'))
      return
    }
  }
  uploading.value = true
  emit('busy', true)
  const images = [...props.modelValue]
  try {
    for (const file of files) {
      const { url } = await adminApi.uploadProjectImage(authStore.token, file)
      images.push(url)
      emit('update:modelValue', [...images])
    }
  } catch (error) {
    emit('error', error)
  } finally {
    uploading.value = false
    emit('busy', false)
  }
}
</script>

<template>
  <div
    class="admin-form__field project-images"
    :aria-busy="uploading"
  >
    <span>專案圖片</span>
    <div
      v-if="modelValue.length"
      class="project-images__list"
    >
      <div
        v-for="(url, index) in modelValue"
        :key="`${index}-${url}`"
        class="project-images__item"
      >
        <img
          :src="resolveAssetUrl(url) ?? undefined"
          :alt="`專案圖片 ${index + 1}`"
        >
        <div class="admin-card__actions">
          <button
            type="button"
            class="btn btn--secondary"
            :disabled="disabled || uploading || index === 0"
            :aria-label="`左移第 ${index + 1} 張圖片`"
            @click="move(index, -1)"
          >
            ←
          </button>
          <button
            type="button"
            class="btn btn--secondary"
            :disabled="disabled || uploading || index === modelValue.length - 1"
            :aria-label="`右移第 ${index + 1} 張圖片`"
            @click="move(index, 1)"
          >
            →
          </button>
          <button
            type="button"
            class="admin-danger-link"
            :disabled="disabled || uploading"
            :aria-label="`刪除第 ${index + 1} 張圖片`"
            @click="emit('update:modelValue', modelValue.filter((_, i) => i !== index))"
          >
            刪除
          </button>
        </div>
      </div>
    </div>
    <label>
      <span>選擇圖片</span>
      <input
        type="file"
        :accept="PROJECT_IMAGE_ACCEPT"
        multiple
        :disabled="disabled || uploading || modelValue.length >= MAX_PROJECT_IMAGES"
        @change="selectImages"
      >
    </label>
    <small>最多 3 張圖片（每張 5MB 以內）</small>
    <span
      v-if="uploading"
      role="status"
    >圖片上傳中…</span>
  </div>
</template>

<style scoped>
.project-images { grid-column: 1 / -1; }
.project-images__list { display: flex; flex-wrap: wrap; gap: 1rem; }
.project-images__item { display: grid; gap: 0.5rem; max-width: 100%; }
.project-images__item img { width: 160px; height: 100px; object-fit: cover; border-radius: var(--radius-sm, 8px); }
.project-images small { color: var(--color-text-muted); }
</style>
