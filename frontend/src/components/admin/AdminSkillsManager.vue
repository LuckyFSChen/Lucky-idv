<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { adminApi, AdminApiError } from '@/api/adminClient'
import { useAdminAuthStore } from '@/stores/adminAuth'
import type { SkillCategory } from '@/types/api'

const props = defineProps<{ categories: SkillCategory[] }>()
const emit = defineEmits<{ refresh: []; unauthorized: [] }>()

const authStore = useAdminAuthStore()

const localCategories = ref<SkillCategory[]>([])
watch(
  () => props.categories,
  (categories) => {
    localCategories.value = categories.map((category) => ({
      ...category,
      skills: category.skills.map((skill) => ({ ...skill })),
    }))
  },
  { immediate: true, deep: true },
)

const newCategory = reactive({ nameZh: '', nameEn: '' })
const newSkillDrafts = reactive<Record<number, { nameZh: string; nameEn: string }>>({})
const saving = ref(false)
const message = ref<{ type: 'success' | 'error'; text: string } | null>(null)

function handleError(err: unknown) {
  if (err instanceof AdminApiError && err.status === 401) {
    emit('unauthorized')
    return
  }
  message.value = { type: 'error', text: err instanceof Error ? err.message : '操作失敗，請稍後再試。' }
}

function skillDraft(categoryId: number) {
  if (!newSkillDrafts[categoryId]) newSkillDrafts[categoryId] = { nameZh: '', nameEn: '' }
  return newSkillDrafts[categoryId]
}

async function addCategory() {
  if (!newCategory.nameZh || !newCategory.nameEn) return
  saving.value = true
  message.value = null
  try {
    await adminApi.createSkillCategory(authStore.token, { ...newCategory })
    newCategory.nameZh = ''
    newCategory.nameEn = ''
    message.value = { type: 'success', text: '已新增技能分類。' }
    emit('refresh')
  } catch (err) {
    handleError(err)
  } finally {
    saving.value = false
  }
}

async function saveCategory(category: SkillCategory) {
  saving.value = true
  message.value = null
  try {
    await adminApi.updateSkillCategory(authStore.token, category.id, {
      nameZh: category.nameZh,
      nameEn: category.nameEn,
    })
    message.value = { type: 'success', text: '已更新技能分類。' }
    emit('refresh')
  } catch (err) {
    handleError(err)
  } finally {
    saving.value = false
  }
}

async function removeCategory(id: number) {
  if (!window.confirm('確定要刪除此技能分類？分類下的技能將一併刪除。')) return
  saving.value = true
  message.value = null
  try {
    await adminApi.deleteSkillCategory(authStore.token, id)
    message.value = { type: 'success', text: '已刪除技能分類。' }
    emit('refresh')
  } catch (err) {
    handleError(err)
  } finally {
    saving.value = false
  }
}

async function addSkill(categoryId: number) {
  const draft = skillDraft(categoryId)
  if (!draft.nameZh || !draft.nameEn) return
  saving.value = true
  message.value = null
  try {
    await adminApi.createSkill(authStore.token, { categoryId, nameZh: draft.nameZh, nameEn: draft.nameEn })
    draft.nameZh = ''
    draft.nameEn = ''
    message.value = { type: 'success', text: '已新增技能。' }
    emit('refresh')
  } catch (err) {
    handleError(err)
  } finally {
    saving.value = false
  }
}

async function saveSkill(categoryId: number, skillId: number, nameZh: string, nameEn: string) {
  saving.value = true
  message.value = null
  try {
    await adminApi.updateSkill(authStore.token, skillId, { categoryId, nameZh, nameEn })
    message.value = { type: 'success', text: '已更新技能。' }
    emit('refresh')
  } catch (err) {
    handleError(err)
  } finally {
    saving.value = false
  }
}

async function removeSkill(id: number) {
  if (!window.confirm('確定要刪除此技能？')) return
  saving.value = true
  message.value = null
  try {
    await adminApi.deleteSkill(authStore.token, id)
    message.value = { type: 'success', text: '已刪除技能。' }
    emit('refresh')
  } catch (err) {
    handleError(err)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="admin-panel">
    <h2 class="admin-panel__title">
      技能分類
    </h2>

    <p
      v-if="message"
      class="admin-message"
      :class="`admin-message--${message.type}`"
    >
      {{ message.text }}
    </p>

    <div class="admin-list">
      <div
        v-for="category in localCategories"
        :key="category.id"
        class="admin-card"
      >
        <div class="admin-form__grid">
          <label class="admin-form__field">
            <span>分類名稱（中文）</span>
            <input
              v-model="category.nameZh"
              type="text"
            >
          </label>
          <label class="admin-form__field">
            <span>分類名稱（英文）</span>
            <input
              v-model="category.nameEn"
              type="text"
            >
          </label>
        </div>
        <div class="admin-card__actions">
          <button
            type="button"
            class="btn btn--secondary"
            :disabled="saving"
            @click="saveCategory(category)"
          >
            儲存分類
          </button>
          <button
            type="button"
            class="admin-danger-link"
            :disabled="saving"
            @click="removeCategory(category.id)"
          >
            刪除分類
          </button>
        </div>

        <ul class="admin-skill-list">
          <li
            v-for="skill in category.skills"
            :key="skill.id"
            class="admin-skill-item"
          >
            <input
              v-model="skill.nameZh"
              type="text"
            >
            <input
              v-model="skill.nameEn"
              type="text"
            >
            <button
              type="button"
              class="btn btn--secondary"
              :disabled="saving"
              @click="saveSkill(category.id, skill.id, skill.nameZh, skill.nameEn)"
            >
              儲存
            </button>
            <button
              type="button"
              class="admin-danger-link"
              :disabled="saving"
              @click="removeSkill(skill.id)"
            >
              刪除
            </button>
          </li>
        </ul>

        <div class="admin-skill-item admin-skill-item--new">
          <input
            v-model="skillDraft(category.id).nameZh"
            type="text"
            placeholder="新技能（中文）"
          >
          <input
            v-model="skillDraft(category.id).nameEn"
            type="text"
            placeholder="新技能（英文）"
          >
          <button
            type="button"
            class="btn btn--secondary"
            :disabled="saving"
            @click="addSkill(category.id)"
          >
            新增技能
          </button>
        </div>
      </div>
    </div>

    <div class="admin-card admin-card--new">
      <h3>新增技能分類</h3>
      <div class="admin-form__grid">
        <label class="admin-form__field">
          <span>分類名稱（中文）</span>
          <input
            v-model="newCategory.nameZh"
            type="text"
          >
        </label>
        <label class="admin-form__field">
          <span>分類名稱（英文）</span>
          <input
            v-model="newCategory.nameEn"
            type="text"
          >
        </label>
      </div>
      <button
        type="button"
        class="btn btn--primary"
        :disabled="saving"
        @click="addCategory"
      >
        新增分類
      </button>
    </div>
  </div>
</template>
