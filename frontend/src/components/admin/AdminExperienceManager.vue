<script setup lang="ts">
import { reactive, ref } from 'vue'
import { adminApi, AdminApiError, type ExperienceInput } from '@/api/adminClient'
import { useAdminAuthStore } from '@/stores/adminAuth'
import type { Experience } from '@/types/api'

const props = defineProps<{ experiences: Experience[] }>()
const emit = defineEmits<{ refresh: []; unauthorized: [] }>()

const authStore = useAdminAuthStore()

interface ExperienceDraft {
  companyZh: string
  companyEn: string
  roleZh: string
  roleEn: string
  locationZh: string
  locationEn: string
  startDate: string
  endDate: string
  summaryZh: string
  summaryEn: string
  highlightsZhText: string
  highlightsEnText: string
  sortOrder: number
}

function toDateInput(value: string | null): string {
  return value ? value.slice(0, 10) : ''
}

function linesToArray(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

function emptyDraft(): ExperienceDraft {
  return {
    companyZh: '',
    companyEn: '',
    roleZh: '',
    roleEn: '',
    locationZh: '',
    locationEn: '',
    startDate: '',
    endDate: '',
    summaryZh: '',
    summaryEn: '',
    highlightsZhText: '',
    highlightsEnText: '',
    sortOrder: 0,
  }
}

function draftFromExperience(experience: Experience): ExperienceDraft {
  return {
    companyZh: experience.companyZh,
    companyEn: experience.companyEn,
    roleZh: experience.roleZh,
    roleEn: experience.roleEn,
    locationZh: experience.locationZh ?? '',
    locationEn: experience.locationEn ?? '',
    startDate: toDateInput(experience.startDate),
    endDate: toDateInput(experience.endDate),
    summaryZh: experience.summaryZh,
    summaryEn: experience.summaryEn,
    highlightsZhText: experience.highlightsZh.join('\n'),
    highlightsEnText: experience.highlightsEn.join('\n'),
    sortOrder: experience.sortOrder,
  }
}

function toInput(draft: ExperienceDraft): ExperienceInput {
  return {
    companyZh: draft.companyZh,
    companyEn: draft.companyEn,
    roleZh: draft.roleZh,
    roleEn: draft.roleEn,
    locationZh: draft.locationZh || null,
    locationEn: draft.locationEn || null,
    startDate: `${draft.startDate}T00:00:00.000Z`,
    endDate: draft.endDate ? `${draft.endDate}T00:00:00.000Z` : null,
    summaryZh: draft.summaryZh,
    summaryEn: draft.summaryEn,
    highlightsZh: linesToArray(draft.highlightsZhText),
    highlightsEn: linesToArray(draft.highlightsEnText),
    sortOrder: draft.sortOrder,
  }
}

const editDrafts = reactive<Record<number, ExperienceDraft>>({})
const newDraft = reactive<ExperienceDraft>(emptyDraft())
const editingId = ref<number | null>(null)
const saving = ref(false)
const message = ref<{ type: 'success' | 'error'; text: string } | null>(null)

function handleError(err: unknown) {
  if (err instanceof AdminApiError && err.status === 401) {
    emit('unauthorized')
    return
  }
  message.value = { type: 'error', text: err instanceof Error ? err.message : '操作失敗，請稍後再試。' }
}

function startEdit(experience: Experience) {
  editDrafts[experience.id] = draftFromExperience(experience)
  editingId.value = experience.id
}

function cancelEdit() {
  editingId.value = null
}

async function saveEdit(id: number) {
  const draft = editDrafts[id]
  if (!draft) return
  saving.value = true
  message.value = null
  try {
    await adminApi.updateExperience(authStore.token, id, toInput(draft))
    message.value = { type: 'success', text: '已更新工作經歷。' }
    editingId.value = null
    emit('refresh')
  } catch (err) {
    handleError(err)
  } finally {
    saving.value = false
  }
}

async function removeExperience(id: number) {
  if (!window.confirm('確定要刪除此工作經歷？')) return
  saving.value = true
  message.value = null
  try {
    await adminApi.deleteExperience(authStore.token, id)
    message.value = { type: 'success', text: '已刪除工作經歷。' }
    emit('refresh')
  } catch (err) {
    handleError(err)
  } finally {
    saving.value = false
  }
}

async function addExperience() {
  if (!newDraft.companyZh || !newDraft.roleZh || !newDraft.startDate) return
  saving.value = true
  message.value = null
  try {
    await adminApi.createExperience(authStore.token, toInput(newDraft))
    Object.assign(newDraft, emptyDraft())
    message.value = { type: 'success', text: '已新增工作經歷。' }
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
      工作經歷
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
        v-for="experience in props.experiences"
        :key="experience.id"
        class="admin-card"
      >
        <template v-if="editingId === experience.id">
          <div class="admin-form__grid">
            <label class="admin-form__field">
              <span>公司（中文）</span>
              <input
                v-model="editDrafts[experience.id].companyZh"
                type="text"
              >
            </label>
            <label class="admin-form__field">
              <span>公司（英文）</span>
              <input
                v-model="editDrafts[experience.id].companyEn"
                type="text"
              >
            </label>
            <label class="admin-form__field">
              <span>職稱（中文）</span>
              <input
                v-model="editDrafts[experience.id].roleZh"
                type="text"
              >
            </label>
            <label class="admin-form__field">
              <span>職稱（英文）</span>
              <input
                v-model="editDrafts[experience.id].roleEn"
                type="text"
              >
            </label>
            <label class="admin-form__field">
              <span>地點（中文）</span>
              <input
                v-model="editDrafts[experience.id].locationZh"
                type="text"
              >
            </label>
            <label class="admin-form__field">
              <span>地點（英文）</span>
              <input
                v-model="editDrafts[experience.id].locationEn"
                type="text"
              >
            </label>
            <label class="admin-form__field">
              <span>開始日期</span>
              <input
                v-model="editDrafts[experience.id].startDate"
                type="date"
              >
            </label>
            <label class="admin-form__field">
              <span>結束日期（留空表示至今）</span>
              <input
                v-model="editDrafts[experience.id].endDate"
                type="date"
              >
            </label>
          </div>

          <label class="admin-form__field">
            <span>摘要（中文）</span>
            <textarea
              v-model="editDrafts[experience.id].summaryZh"
              rows="3"
            />
          </label>
          <label class="admin-form__field">
            <span>摘要（英文）</span>
            <textarea
              v-model="editDrafts[experience.id].summaryEn"
              rows="3"
            />
          </label>
          <label class="admin-form__field">
            <span>重點（中文，每行一項）</span>
            <textarea
              v-model="editDrafts[experience.id].highlightsZhText"
              rows="4"
            />
          </label>
          <label class="admin-form__field">
            <span>重點（英文，每行一項）</span>
            <textarea
              v-model="editDrafts[experience.id].highlightsEnText"
              rows="4"
            />
          </label>

          <div class="admin-card__actions">
            <button
              type="button"
              class="btn btn--primary"
              :disabled="saving"
              @click="saveEdit(experience.id)"
            >
              儲存
            </button>
            <button
              type="button"
              class="btn btn--secondary"
              @click="cancelEdit"
            >
              取消
            </button>
          </div>
        </template>

        <template v-else>
          <div class="admin-card__header">
            <h3>{{ experience.companyZh }} · {{ experience.roleZh }}</h3>
            <div class="admin-card__actions">
              <button
                type="button"
                class="btn btn--secondary"
                @click="startEdit(experience)"
              >
                編輯
              </button>
              <button
                type="button"
                class="admin-danger-link"
                :disabled="saving"
                @click="removeExperience(experience.id)"
              >
                刪除
              </button>
            </div>
          </div>
          <p class="admin-card__meta">
            {{ toDateInput(experience.startDate) }} ~ {{ experience.endDate ? toDateInput(experience.endDate) : '至今' }}
          </p>
        </template>
      </div>
    </div>

    <div class="admin-card admin-card--new">
      <h3>新增工作經歷</h3>
      <div class="admin-form__grid">
        <label class="admin-form__field">
          <span>公司（中文）</span>
          <input
            v-model="newDraft.companyZh"
            type="text"
          >
        </label>
        <label class="admin-form__field">
          <span>公司（英文）</span>
          <input
            v-model="newDraft.companyEn"
            type="text"
          >
        </label>
        <label class="admin-form__field">
          <span>職稱（中文）</span>
          <input
            v-model="newDraft.roleZh"
            type="text"
          >
        </label>
        <label class="admin-form__field">
          <span>職稱（英文）</span>
          <input
            v-model="newDraft.roleEn"
            type="text"
          >
        </label>
        <label class="admin-form__field">
          <span>地點（中文）</span>
          <input
            v-model="newDraft.locationZh"
            type="text"
          >
        </label>
        <label class="admin-form__field">
          <span>地點（英文）</span>
          <input
            v-model="newDraft.locationEn"
            type="text"
          >
        </label>
        <label class="admin-form__field">
          <span>開始日期</span>
          <input
            v-model="newDraft.startDate"
            type="date"
          >
        </label>
        <label class="admin-form__field">
          <span>結束日期（留空表示至今）</span>
          <input
            v-model="newDraft.endDate"
            type="date"
          >
        </label>
      </div>
      <label class="admin-form__field">
        <span>摘要（中文）</span>
        <textarea
          v-model="newDraft.summaryZh"
          rows="3"
        />
      </label>
      <label class="admin-form__field">
        <span>摘要（英文）</span>
        <textarea
          v-model="newDraft.summaryEn"
          rows="3"
        />
      </label>
      <label class="admin-form__field">
        <span>重點（中文，每行一項）</span>
        <textarea
          v-model="newDraft.highlightsZhText"
          rows="4"
        />
      </label>
      <label class="admin-form__field">
        <span>重點（英文，每行一項）</span>
        <textarea
          v-model="newDraft.highlightsEnText"
          rows="4"
        />
      </label>
      <button
        type="button"
        class="btn btn--primary"
        :disabled="saving"
        @click="addExperience"
      >
        新增工作經歷
      </button>
    </div>
  </div>
</template>
