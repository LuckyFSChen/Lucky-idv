<script setup lang="ts">
import { reactive, ref } from 'vue'
import { adminApi, AdminApiError, type EngineeringCaseInput } from '@/api/adminClient'
import { useAdminAuthStore } from '@/stores/adminAuth'
import type { ArchitectureStep, EngineeringCase } from '@/types/api'

const props = defineProps<{ cases: EngineeringCase[] }>()
const emit = defineEmits<{ refresh: []; unauthorized: [] }>()

const authStore = useAdminAuthStore()

interface EngineeringCaseDraft {
  slug: string
  titleZh: string
  titleEn: string
  categoryZh: string
  categoryEn: string
  summaryZh: string
  summaryEn: string
  problemZh: string
  problemEn: string
  contextZh: string
  contextEn: string
  investigationZh: string
  investigationEn: string
  solutionZh: string
  solutionEn: string
  validationZh: string
  validationEn: string
  resultZh: string
  resultEn: string
  architectureText: string
  techStackText: string
  githubUrl: string
  projectUrl: string
  featured: boolean
  sortOrder: number
}

function csvToArray(text: string): string[] {
  return text
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function architectureToText(steps: ArchitectureStep[]): string {
  return steps.map((step) => `${step.labelZh}|${step.labelEn}`).join('\n')
}

function textToArchitecture(text: string): ArchitectureStep[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [labelZh, labelEn] = line.split('|').map((part) => part.trim())
      return { labelZh: labelZh ?? '', labelEn: labelEn ?? labelZh ?? '' }
    })
}

function emptyDraft(): EngineeringCaseDraft {
  return {
    slug: '',
    titleZh: '',
    titleEn: '',
    categoryZh: '',
    categoryEn: '',
    summaryZh: '',
    summaryEn: '',
    problemZh: '',
    problemEn: '',
    contextZh: '',
    contextEn: '',
    investigationZh: '',
    investigationEn: '',
    solutionZh: '',
    solutionEn: '',
    validationZh: '',
    validationEn: '',
    resultZh: '',
    resultEn: '',
    architectureText: '',
    techStackText: '',
    githubUrl: '',
    projectUrl: '',
    featured: false,
    sortOrder: 0,
  }
}

function draftFromCase(item: EngineeringCase): EngineeringCaseDraft {
  return {
    slug: item.slug,
    titleZh: item.titleZh,
    titleEn: item.titleEn,
    categoryZh: item.categoryZh,
    categoryEn: item.categoryEn,
    summaryZh: item.summaryZh,
    summaryEn: item.summaryEn,
    problemZh: item.problemZh,
    problemEn: item.problemEn,
    contextZh: item.contextZh,
    contextEn: item.contextEn,
    investigationZh: item.investigationZh,
    investigationEn: item.investigationEn,
    solutionZh: item.solutionZh,
    solutionEn: item.solutionEn,
    validationZh: item.validationZh,
    validationEn: item.validationEn,
    resultZh: item.resultZh,
    resultEn: item.resultEn,
    architectureText: architectureToText(item.architecture),
    techStackText: item.techStack.join(', '),
    githubUrl: item.githubUrl ?? '',
    projectUrl: item.projectUrl ?? '',
    featured: item.featured,
    sortOrder: item.sortOrder,
  }
}

function toInput(draft: EngineeringCaseDraft): EngineeringCaseInput {
  return {
    slug: draft.slug,
    titleZh: draft.titleZh,
    titleEn: draft.titleEn,
    categoryZh: draft.categoryZh,
    categoryEn: draft.categoryEn,
    summaryZh: draft.summaryZh,
    summaryEn: draft.summaryEn,
    problemZh: draft.problemZh,
    problemEn: draft.problemEn,
    contextZh: draft.contextZh,
    contextEn: draft.contextEn,
    investigationZh: draft.investigationZh,
    investigationEn: draft.investigationEn,
    solutionZh: draft.solutionZh,
    solutionEn: draft.solutionEn,
    validationZh: draft.validationZh,
    validationEn: draft.validationEn,
    resultZh: draft.resultZh,
    resultEn: draft.resultEn,
    architecture: textToArchitecture(draft.architectureText),
    techStack: csvToArray(draft.techStackText),
    githubUrl: draft.githubUrl || null,
    projectUrl: draft.projectUrl || null,
    featured: draft.featured,
    sortOrder: draft.sortOrder,
  }
}

const editDrafts = reactive<Record<number, EngineeringCaseDraft>>({})
const newDraft = reactive<EngineeringCaseDraft>(emptyDraft())
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

function startEdit(item: EngineeringCase) {
  editDrafts[item.id] = draftFromCase(item)
  editingId.value = item.id
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
    await adminApi.updateEngineeringCase(authStore.token, id, toInput(draft))
    message.value = { type: 'success', text: '已更新工程案例。' }
    editingId.value = null
    emit('refresh')
  } catch (err) {
    handleError(err)
  } finally {
    saving.value = false
  }
}

async function removeCase(id: number) {
  if (!window.confirm('確定要刪除此工程案例？')) return
  saving.value = true
  message.value = null
  try {
    await adminApi.deleteEngineeringCase(authStore.token, id)
    message.value = { type: 'success', text: '已刪除工程案例。' }
    emit('refresh')
  } catch (err) {
    handleError(err)
  } finally {
    saving.value = false
  }
}

async function addCase() {
  if (!newDraft.slug || !newDraft.titleZh || !newDraft.summaryZh) return
  saving.value = true
  message.value = null
  try {
    await adminApi.createEngineeringCase(authStore.token, toInput(newDraft))
    Object.assign(newDraft, emptyDraft())
    message.value = { type: 'success', text: '已新增工程案例。' }
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
      工程案例
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
        v-for="item in props.cases"
        :key="item.id"
        class="admin-card"
      >
        <template v-if="editingId === item.id">
          <div class="admin-form__grid">
            <label class="admin-form__field">
              <span>Slug</span>
              <input
                v-model="editDrafts[item.id].slug"
                type="text"
              >
            </label>
            <label class="admin-form__field">
              <span>標題（中文）</span>
              <input
                v-model="editDrafts[item.id].titleZh"
                type="text"
              >
            </label>
            <label class="admin-form__field">
              <span>標題（英文）</span>
              <input
                v-model="editDrafts[item.id].titleEn"
                type="text"
              >
            </label>
            <label class="admin-form__field">
              <span>分類（中文）</span>
              <input
                v-model="editDrafts[item.id].categoryZh"
                type="text"
              >
            </label>
            <label class="admin-form__field">
              <span>分類（英文）</span>
              <input
                v-model="editDrafts[item.id].categoryEn"
                type="text"
              >
            </label>
            <label class="admin-form__field">
              <span>GitHub 連結</span>
              <input
                v-model="editDrafts[item.id].githubUrl"
                type="url"
              >
            </label>
            <label class="admin-form__field">
              <span>專案連結</span>
              <input
                v-model="editDrafts[item.id].projectUrl"
                type="url"
              >
            </label>
            <label class="admin-form__field">
              <span>排序</span>
              <input
                v-model.number="editDrafts[item.id].sortOrder"
                type="number"
              >
            </label>
            <label class="admin-form__field admin-form__field--checkbox">
              <input
                v-model="editDrafts[item.id].featured"
                type="checkbox"
              >
              <span>精選（Featured）</span>
            </label>
          </div>

          <label class="admin-form__field">
            <span>摘要（中文）</span>
            <textarea
              v-model="editDrafts[item.id].summaryZh"
              rows="2"
            />
          </label>
          <label class="admin-form__field">
            <span>摘要（英文）</span>
            <textarea
              v-model="editDrafts[item.id].summaryEn"
              rows="2"
            />
          </label>
          <label class="admin-form__field">
            <span>問題（中文）</span>
            <textarea
              v-model="editDrafts[item.id].problemZh"
              rows="3"
            />
          </label>
          <label class="admin-form__field">
            <span>問題（英文）</span>
            <textarea
              v-model="editDrafts[item.id].problemEn"
              rows="3"
            />
          </label>
          <label class="admin-form__field">
            <span>背景（中文）</span>
            <textarea
              v-model="editDrafts[item.id].contextZh"
              rows="3"
            />
          </label>
          <label class="admin-form__field">
            <span>背景（英文）</span>
            <textarea
              v-model="editDrafts[item.id].contextEn"
              rows="3"
            />
          </label>
          <label class="admin-form__field">
            <span>調查過程（中文）</span>
            <textarea
              v-model="editDrafts[item.id].investigationZh"
              rows="3"
            />
          </label>
          <label class="admin-form__field">
            <span>調查過程（英文）</span>
            <textarea
              v-model="editDrafts[item.id].investigationEn"
              rows="3"
            />
          </label>
          <label class="admin-form__field">
            <span>解決方案（中文）</span>
            <textarea
              v-model="editDrafts[item.id].solutionZh"
              rows="3"
            />
          </label>
          <label class="admin-form__field">
            <span>解決方案（英文）</span>
            <textarea
              v-model="editDrafts[item.id].solutionEn"
              rows="3"
            />
          </label>
          <label class="admin-form__field">
            <span>驗證（中文）</span>
            <textarea
              v-model="editDrafts[item.id].validationZh"
              rows="3"
            />
          </label>
          <label class="admin-form__field">
            <span>驗證（英文）</span>
            <textarea
              v-model="editDrafts[item.id].validationEn"
              rows="3"
            />
          </label>
          <label class="admin-form__field">
            <span>成果（中文）</span>
            <textarea
              v-model="editDrafts[item.id].resultZh"
              rows="3"
            />
          </label>
          <label class="admin-form__field">
            <span>成果（英文）</span>
            <textarea
              v-model="editDrafts[item.id].resultEn"
              rows="3"
            />
          </label>
          <label class="admin-form__field">
            <span>架構流程（每行一步，格式：中文標籤|英文標籤）</span>
            <textarea
              v-model="editDrafts[item.id].architectureText"
              rows="4"
            />
          </label>
          <label class="admin-form__field">
            <span>技術堆疊（以逗號分隔）</span>
            <input
              v-model="editDrafts[item.id].techStackText"
              type="text"
            >
          </label>

          <div class="admin-card__actions">
            <button
              type="button"
              class="btn btn--primary"
              :disabled="saving"
              @click="saveEdit(item.id)"
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
            <h3>{{ item.titleZh }}</h3>
            <div class="admin-card__actions">
              <button
                type="button"
                class="btn btn--secondary"
                @click="startEdit(item)"
              >
                編輯
              </button>
              <button
                type="button"
                class="admin-danger-link"
                :disabled="saving"
                @click="removeCase(item.id)"
              >
                刪除
              </button>
            </div>
          </div>
          <p class="admin-card__meta">
            {{ item.slug }} · {{ item.categoryZh }}<span v-if="item.featured"> · 精選</span>
          </p>
        </template>
      </div>
    </div>

    <div class="admin-card admin-card--new">
      <h3>新增工程案例</h3>
      <div class="admin-form__grid">
        <label class="admin-form__field">
          <span>Slug</span>
          <input
            v-model="newDraft.slug"
            type="text"
          >
        </label>
        <label class="admin-form__field">
          <span>標題（中文）</span>
          <input
            v-model="newDraft.titleZh"
            type="text"
          >
        </label>
        <label class="admin-form__field">
          <span>標題（英文）</span>
          <input
            v-model="newDraft.titleEn"
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
          <span>GitHub 連結</span>
          <input
            v-model="newDraft.githubUrl"
            type="url"
          >
        </label>
        <label class="admin-form__field">
          <span>專案連結</span>
          <input
            v-model="newDraft.projectUrl"
            type="url"
          >
        </label>
        <label class="admin-form__field">
          <span>排序</span>
          <input
            v-model.number="newDraft.sortOrder"
            type="number"
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
          rows="2"
        />
      </label>
      <label class="admin-form__field">
        <span>摘要（英文）</span>
        <textarea
          v-model="newDraft.summaryEn"
          rows="2"
        />
      </label>
      <label class="admin-form__field">
        <span>問題（中文）</span>
        <textarea
          v-model="newDraft.problemZh"
          rows="3"
        />
      </label>
      <label class="admin-form__field">
        <span>問題（英文）</span>
        <textarea
          v-model="newDraft.problemEn"
          rows="3"
        />
      </label>
      <label class="admin-form__field">
        <span>背景（中文）</span>
        <textarea
          v-model="newDraft.contextZh"
          rows="3"
        />
      </label>
      <label class="admin-form__field">
        <span>背景（英文）</span>
        <textarea
          v-model="newDraft.contextEn"
          rows="3"
        />
      </label>
      <label class="admin-form__field">
        <span>調查過程（中文）</span>
        <textarea
          v-model="newDraft.investigationZh"
          rows="3"
        />
      </label>
      <label class="admin-form__field">
        <span>調查過程（英文）</span>
        <textarea
          v-model="newDraft.investigationEn"
          rows="3"
        />
      </label>
      <label class="admin-form__field">
        <span>解決方案（中文）</span>
        <textarea
          v-model="newDraft.solutionZh"
          rows="3"
        />
      </label>
      <label class="admin-form__field">
        <span>解決方案（英文）</span>
        <textarea
          v-model="newDraft.solutionEn"
          rows="3"
        />
      </label>
      <label class="admin-form__field">
        <span>驗證（中文）</span>
        <textarea
          v-model="newDraft.validationZh"
          rows="3"
        />
      </label>
      <label class="admin-form__field">
        <span>驗證（英文）</span>
        <textarea
          v-model="newDraft.validationEn"
          rows="3"
        />
      </label>
      <label class="admin-form__field">
        <span>成果（中文）</span>
        <textarea
          v-model="newDraft.resultZh"
          rows="3"
        />
      </label>
      <label class="admin-form__field">
        <span>成果（英文）</span>
        <textarea
          v-model="newDraft.resultEn"
          rows="3"
        />
      </label>
      <label class="admin-form__field">
        <span>架構流程（每行一步，格式：中文標籤|英文標籤）</span>
        <textarea
          v-model="newDraft.architectureText"
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
        @click="addCase"
      >
        新增工程案例
      </button>
    </div>
  </div>
</template>
