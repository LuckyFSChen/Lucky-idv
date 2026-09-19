<script setup lang="ts">
import { reactive, ref } from 'vue'
import { adminApi, AdminApiError, type CertificationInput } from '@/api/adminClient'
import { useAdminAuthStore } from '@/stores/adminAuth'
import type { Certification } from '@/types/api'

const props = defineProps<{ certifications: Certification[] }>()
const emit = defineEmits<{ refresh: []; unauthorized: [] }>()

const authStore = useAdminAuthStore()

interface CertificationDraft {
  nameZh: string
  nameEn: string
  issuerZh: string
  issuerEn: string
  descriptionZh: string
  descriptionEn: string
  credential: string
  issuedAt: string
  link: string
  sortOrder: number
}

function toDateInput(value: string | null): string {
  return value ? value.slice(0, 10) : ''
}

function emptyDraft(): CertificationDraft {
  return {
    nameZh: '',
    nameEn: '',
    issuerZh: '',
    issuerEn: '',
    descriptionZh: '',
    descriptionEn: '',
    credential: '',
    issuedAt: '',
    link: '',
    sortOrder: 0,
  }
}

function draftFromCertification(item: Certification): CertificationDraft {
  return {
    nameZh: item.nameZh,
    nameEn: item.nameEn,
    issuerZh: item.issuerZh,
    issuerEn: item.issuerEn,
    descriptionZh: item.descriptionZh ?? '',
    descriptionEn: item.descriptionEn ?? '',
    credential: item.credential ?? '',
    issuedAt: toDateInput(item.issuedAt),
    link: item.link ?? '',
    sortOrder: item.sortOrder,
  }
}

function toInput(draft: CertificationDraft): CertificationInput {
  return {
    nameZh: draft.nameZh,
    nameEn: draft.nameEn,
    issuerZh: draft.issuerZh,
    issuerEn: draft.issuerEn,
    descriptionZh: draft.descriptionZh || null,
    descriptionEn: draft.descriptionEn || null,
    credential: draft.credential || null,
    issuedAt: draft.issuedAt ? `${draft.issuedAt}T00:00:00.000Z` : null,
    link: draft.link || null,
    sortOrder: draft.sortOrder,
  }
}

const editDrafts = reactive<Record<number, CertificationDraft>>({})
const newDraft = reactive<CertificationDraft>(emptyDraft())
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

function startEdit(item: Certification) {
  editDrafts[item.id] = draftFromCertification(item)
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
    await adminApi.updateCertification(authStore.token, id, toInput(draft))
    message.value = { type: 'success', text: '已更新認證。' }
    editingId.value = null
    emit('refresh')
  } catch (err) {
    handleError(err)
  } finally {
    saving.value = false
  }
}

async function removeCertification(id: number) {
  if (!window.confirm('確定要刪除此認證？')) return
  saving.value = true
  message.value = null
  try {
    await adminApi.deleteCertification(authStore.token, id)
    message.value = { type: 'success', text: '已刪除認證。' }
    emit('refresh')
  } catch (err) {
    handleError(err)
  } finally {
    saving.value = false
  }
}

async function addCertification() {
  if (!newDraft.nameZh || !newDraft.issuerZh) return
  saving.value = true
  message.value = null
  try {
    await adminApi.createCertification(authStore.token, toInput(newDraft))
    Object.assign(newDraft, emptyDraft())
    message.value = { type: 'success', text: '已新增認證。' }
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
      專業認證
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
        v-for="item in props.certifications"
        :key="item.id"
        class="admin-card"
      >
        <template v-if="editingId === item.id">
          <div class="admin-form__grid">
            <label class="admin-form__field">
              <span>名稱（中文）</span>
              <input
                v-model="editDrafts[item.id].nameZh"
                type="text"
              >
            </label>
            <label class="admin-form__field">
              <span>名稱（英文）</span>
              <input
                v-model="editDrafts[item.id].nameEn"
                type="text"
              >
            </label>
            <label class="admin-form__field">
              <span>發證機構（中文）</span>
              <input
                v-model="editDrafts[item.id].issuerZh"
                type="text"
              >
            </label>
            <label class="admin-form__field">
              <span>發證機構（英文）</span>
              <input
                v-model="editDrafts[item.id].issuerEn"
                type="text"
              >
            </label>
            <label class="admin-form__field">
              <span>證書編號</span>
              <input
                v-model="editDrafts[item.id].credential"
                type="text"
              >
            </label>
            <label class="admin-form__field">
              <span>取得日期</span>
              <input
                v-model="editDrafts[item.id].issuedAt"
                type="date"
              >
            </label>
            <label class="admin-form__field">
              <span>連結</span>
              <input
                v-model="editDrafts[item.id].link"
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
          </div>

          <label class="admin-form__field">
            <span>說明（中文）</span>
            <textarea
              v-model="editDrafts[item.id].descriptionZh"
              rows="3"
            />
          </label>
          <label class="admin-form__field">
            <span>說明（英文）</span>
            <textarea
              v-model="editDrafts[item.id].descriptionEn"
              rows="3"
            />
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
            <h3>{{ item.nameZh }}</h3>
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
                @click="removeCertification(item.id)"
              >
                刪除
              </button>
            </div>
          </div>
          <p class="admin-card__meta">
            {{ item.issuerZh }}
          </p>
        </template>
      </div>
    </div>

    <div class="admin-card admin-card--new">
      <h3>新增認證</h3>
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
          <span>發證機構（中文）</span>
          <input
            v-model="newDraft.issuerZh"
            type="text"
          >
        </label>
        <label class="admin-form__field">
          <span>發證機構（英文）</span>
          <input
            v-model="newDraft.issuerEn"
            type="text"
          >
        </label>
        <label class="admin-form__field">
          <span>證書編號</span>
          <input
            v-model="newDraft.credential"
            type="text"
          >
        </label>
        <label class="admin-form__field">
          <span>取得日期</span>
          <input
            v-model="newDraft.issuedAt"
            type="date"
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
          <span>排序</span>
          <input
            v-model.number="newDraft.sortOrder"
            type="number"
          >
        </label>
      </div>

      <label class="admin-form__field">
        <span>說明（中文）</span>
        <textarea
          v-model="newDraft.descriptionZh"
          rows="3"
        />
      </label>
      <label class="admin-form__field">
        <span>說明（英文）</span>
        <textarea
          v-model="newDraft.descriptionEn"
          rows="3"
        />
      </label>

      <button
        type="button"
        class="btn btn--primary"
        :disabled="saving"
        @click="addCertification"
      >
        新增認證
      </button>
    </div>
  </div>
</template>
