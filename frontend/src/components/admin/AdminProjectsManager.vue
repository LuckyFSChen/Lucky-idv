<script setup lang="ts">
import { reactive, ref } from 'vue'
import { adminApi, AdminApiError, type ProjectInput } from '@/api/adminClient'
import { useAdminAuthStore } from '@/stores/adminAuth'
import type { Project } from '@/types/api'

const props = defineProps<{ projects: Project[] }>()
const emit = defineEmits<{ refresh: []; unauthorized: [] }>()

const authStore = useAdminAuthStore()

interface ProjectDraft {
  nameZh: string
  nameEn: string
  categoryZh: string
  categoryEn: string
  subtitleZh: string
  subtitleEn: string
  summaryZh: string
  summaryEn: string
  highlightsZhText: string
  highlightsEnText: string
  techStackText: string
  link: string
  githubUrl: string
  imageUrl: string
  featured: boolean
  sortOrder: number
}

function linesToArray(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

function csvToArray(text: string): string[] {
  return text
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function emptyDraft(): ProjectDraft {
  return {
    nameZh: '',
    nameEn: '',
    categoryZh: '',
    categoryEn: '',
    subtitleZh: '',
    subtitleEn: '',
    summaryZh: '',
    summaryEn: '',
    highlightsZhText: '',
    highlightsEnText: '',
    techStackText: '',
    link: '',
    githubUrl: '',
    imageUrl: '',
    featured: false,
    sortOrder: 0,
  }
}

function draftFromProject(project: Project): ProjectDraft {
  return {
    nameZh: project.nameZh,
    nameEn: project.nameEn,
    categoryZh: project.categoryZh ?? '',
    categoryEn: project.categoryEn ?? '',
    subtitleZh: project.subtitleZh ?? '',
    subtitleEn: project.subtitleEn ?? '',
    summaryZh: project.summaryZh,
    summaryEn: project.summaryEn,
    highlightsZhText: project.highlightsZh.join('\n'),
    highlightsEnText: project.highlightsEn.join('\n'),
    techStackText: project.techStack.join(', '),
    link: project.link ?? '',
    githubUrl: project.githubUrl ?? '',
    imageUrl: project.imageUrl ?? '',
    featured: project.featured,
    sortOrder: project.sortOrder,
  }
}

function toInput(draft: ProjectDraft): ProjectInput {
  return {
    nameZh: draft.nameZh,
    nameEn: draft.nameEn,
    categoryZh: draft.categoryZh || null,
    categoryEn: draft.categoryEn || null,
    subtitleZh: draft.subtitleZh || null,
    subtitleEn: draft.subtitleEn || null,
    summaryZh: draft.summaryZh,
    summaryEn: draft.summaryEn,
    highlightsZh: linesToArray(draft.highlightsZhText),
    highlightsEn: linesToArray(draft.highlightsEnText),
    techStack: csvToArray(draft.techStackText),
    link: draft.link || null,
    githubUrl: draft.githubUrl || null,
    imageUrl: draft.imageUrl || null,
    featured: draft.featured,
    sortOrder: draft.sortOrder,
  }
}

const editDrafts = reactive<Record<number, ProjectDraft>>({})
const newDraft = reactive<ProjectDraft>(emptyDraft())
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

function startEdit(project: Project) {
  editDrafts[project.id] = draftFromProject(project)
  editingId.value = project.id
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
    await adminApi.updateProject(authStore.token, id, toInput(draft))
    message.value = { type: 'success', text: '已更新專案。' }
    editingId.value = null
    emit('refresh')
  } catch (err) {
    handleError(err)
  } finally {
    saving.value = false
  }
}

async function removeProject(id: number) {
  if (!window.confirm('確定要刪除此專案？')) return
  saving.value = true
  message.value = null
  try {
    await adminApi.deleteProject(authStore.token, id)
    message.value = { type: 'success', text: '已刪除專案。' }
    emit('refresh')
  } catch (err) {
    handleError(err)
  } finally {
    saving.value = false
  }
}

async function addProject() {
  if (!newDraft.nameZh || !newDraft.summaryZh) return
  saving.value = true
  message.value = null
  try {
    await adminApi.createProject(authStore.token, toInput(newDraft))
    Object.assign(newDraft, emptyDraft())
    message.value = { type: 'success', text: '已新增專案。' }
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
      專案作品
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
        v-for="project in props.projects"
        :key="project.id"
        class="admin-card"
      >
        <template v-if="editingId === project.id">
          <div class="admin-form__grid">
            <label class="admin-form__field">
              <span>名稱（中文）</span>
              <input
                v-model="editDrafts[project.id].nameZh"
                type="text"
              >
            </label>
            <label class="admin-form__field">
              <span>名稱（英文）</span>
              <input
                v-model="editDrafts[project.id].nameEn"
                type="text"
              >
            </label>
            <label class="admin-form__field">
              <span>分類（中文）</span>
              <input
                v-model="editDrafts[project.id].categoryZh"
                type="text"
              >
            </label>
            <label class="admin-form__field">
              <span>分類（英文）</span>
              <input
                v-model="editDrafts[project.id].categoryEn"
                type="text"
              >
            </label>
            <label class="admin-form__field">
              <span>副標題（中文）</span>
              <input
                v-model="editDrafts[project.id].subtitleZh"
                type="text"
              >
            </label>
            <label class="admin-form__field">
              <span>副標題（英文）</span>
              <input
                v-model="editDrafts[project.id].subtitleEn"
                type="text"
              >
            </label>
            <label class="admin-form__field">
              <span>連結</span>
              <input
                v-model="editDrafts[project.id].link"
                type="url"
              >
            </label>
            <label class="admin-form__field">
              <span>GitHub 連結</span>
              <input
                v-model="editDrafts[project.id].githubUrl"
                type="url"
              >
            </label>
            <label class="admin-form__field">
              <span>圖片網址</span>
              <input
                v-model="editDrafts[project.id].imageUrl"
                type="text"
              >
            </label>
            <label class="admin-form__field admin-form__field--checkbox">
              <input
                v-model="editDrafts[project.id].featured"
                type="checkbox"
              >
              <span>精選（Featured）</span>
            </label>
          </div>
          <label class="admin-form__field">
            <span>摘要（中文）</span>
            <textarea
              v-model="editDrafts[project.id].summaryZh"
              rows="3"
            />
          </label>
          <label class="admin-form__field">
            <span>摘要（英文）</span>
            <textarea
              v-model="editDrafts[project.id].summaryEn"
              rows="3"
            />
          </label>
          <label class="admin-form__field">
            <span>重點（中文，每行一項）</span>
            <textarea
              v-model="editDrafts[project.id].highlightsZhText"
              rows="4"
            />
          </label>
          <label class="admin-form__field">
            <span>重點（英文，每行一項）</span>
            <textarea
              v-model="editDrafts[project.id].highlightsEnText"
              rows="4"
            />
          </label>
          <label class="admin-form__field">
            <span>技術堆疊（以逗號分隔）</span>
            <input
              v-model="editDrafts[project.id].techStackText"
              type="text"
            >
          </label>

          <div class="admin-card__actions">
            <button
              type="button"
              class="btn btn--primary"
              :disabled="saving"
              @click="saveEdit(project.id)"
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
            <h3>{{ project.nameZh }}</h3>
            <div class="admin-card__actions">
              <button
                type="button"
                class="btn btn--secondary"
                @click="startEdit(project)"
              >
                編輯
              </button>
              <button
                type="button"
                class="admin-danger-link"
                :disabled="saving"
                @click="removeProject(project.id)"
              >
                刪除
              </button>
            </div>
          </div>
          <p class="admin-card__meta">
            {{ project.techStack.join('、') }}
          </p>
        </template>
      </div>
    </div>

    <div class="admin-card admin-card--new">
      <h3>新增專案</h3>
      <div class="admin-form__grid">
        <label class="admin-form__field">
          <span>名稱（中文）</span>
          <input
            v-model="newDraft.nameZh"
            type="text"
          >
        </label>
        <label class="admin-form__field">
          <span>名稱（英文）</span>
          <input
            v-model="newDraft.nameEn"
            type="text"
          >
        </label>
        <label class="admin-form__field">
          <span>分類（中文）</span>
          <input
            v-model="newDraft.categoryZh"
            type="text"
          >
        </label>
        <label class="admin-form__field">
          <span>分類（英文）</span>
          <input
            v-model="newDraft.categoryEn"
            type="text"
          >
        </label>
        <label class="admin-form__field">
          <span>副標題（中文）</span>
          <input
            v-model="newDraft.subtitleZh"
            type="text"
          >
        </label>
        <label class="admin-form__field">
          <span>副標題（英文）</span>
          <input
            v-model="newDraft.subtitleEn"
            type="text"
          >
        </label>
        <label class="admin-form__field">
          <span>連結</span>
          <input
            v-model="newDraft.link"
            type="url"
          >
        </label>
        <label class="admin-form__field">
          <span>GitHub 連結</span>
          <input
            v-model="newDraft.githubUrl"
            type="url"
          >
        </label>
        <label class="admin-form__field">
          <span>圖片網址</span>
          <input
            v-model="newDraft.imageUrl"
            type="text"
          >
        </label>
        <label class="admin-form__field admin-form__field--checkbox">
          <input
            v-model="newDraft.featured"
            type="checkbox"
          >
          <span>精選（Featured）</span>
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
      <label class="admin-form__field">
        <span>技術堆疊（以逗號分隔）</span>
        <input
          v-model="newDraft.techStackText"
          type="text"
        >
      </label>
      <button
        type="button"
        class="btn btn--primary"
        :disabled="saving"
        @click="addProject"
      >
        新增專案
      </button>
    </div>
  </div>
</template>
