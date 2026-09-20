<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { adminApi, AdminApiError } from '@/api/adminClient'
import { resolveAssetUrl } from '@/api/client'
import AvatarCropperDialog from '@/components/admin/AvatarCropperDialog.vue'
import { useAdminAuthStore } from '@/stores/adminAuth'
import type { ContactLink, Profile } from '@/types/api'

const props = defineProps<{ profile: Profile | null }>()
const emit = defineEmits<{ refresh: []; unauthorized: [] }>()

const authStore = useAdminAuthStore()

const form = reactive({
  displayName: '',
  preferredName: '',
  titleZh: '',
  titleEn: '',
  introZh: '',
  introEn: '',
  contactEmail: '',
  contactLinks: [] as ContactLink[],
})

watch(
  () => props.profile,
  (profile) => {
    form.displayName = profile?.displayName ?? ''
    form.preferredName = profile?.preferredName ?? ''
    form.titleZh = profile?.titleZh ?? ''
    form.titleEn = profile?.titleEn ?? ''
    form.introZh = profile?.introZh ?? ''
    form.introEn = profile?.introEn ?? ''
    form.contactEmail = profile?.contactEmail ?? ''
    form.contactLinks = profile ? profile.contactLinks.map((link) => ({ ...link })) : []
  },
  { immediate: true },
)

const saving = ref(false)
const uploading = ref(false)
const message = ref<{ type: 'success' | 'error'; text: string } | null>(null)
const avatarPreview = ref<string | null>(null)
/** 待裁切的原始檔案；不為 null 時顯示裁切對話框。 */
const pendingAvatarFile = ref<File | null>(null)

/** 原始檔案的大小上限。裁切後一律輸出 512×512，因此這裡可以放寬，只擋明顯過大的檔案。 */
const MAX_SOURCE_SIZE_MB = 20

function handleError(err: unknown) {
  if (err instanceof AdminApiError && err.status === 401) {
    emit('unauthorized')
    return
  }
  message.value = { type: 'error', text: err instanceof Error ? err.message : '操作失敗，請稍後再試。' }
}

function addContactLink() {
  form.contactLinks.push({ label: '', url: '' })
}

function removeContactLink(index: number) {
  form.contactLinks.splice(index, 1)
}

async function handleSubmit() {
  saving.value = true
  message.value = null
  try {
    await adminApi.updateProfile(authStore.token, {
      displayName: form.displayName,
      preferredName: form.preferredName,
      titleZh: form.titleZh,
      titleEn: form.titleEn,
      introZh: form.introZh,
      introEn: form.introEn,
      contactEmail: form.contactEmail || null,
      contactLinks: form.contactLinks.filter((link) => link.label && link.url),
    })
    message.value = { type: 'success', text: '個人資料已儲存。' }
    emit('refresh')
  } catch (err) {
    handleError(err)
  } finally {
    saving.value = false
  }
}

function handleAvatarChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  // 先清掉 input，否則選擇同一個檔案兩次不會再觸發 change。
  input.value = ''
  if (!file) return

  if (file.size > MAX_SOURCE_SIZE_MB * 1024 * 1024) {
    message.value = { type: 'error', text: `圖片檔案過大，請選擇 ${MAX_SOURCE_SIZE_MB} MB 以內的圖片。` }
    return
  }

  message.value = null
  // 不直接上傳，先進裁切對話框；實際上傳由 handleAvatarCropped 處理。
  pendingAvatarFile.value = file
}

async function handleAvatarCropped(file: File) {
  pendingAvatarFile.value = null

  if (avatarPreview.value) URL.revokeObjectURL(avatarPreview.value)
  avatarPreview.value = URL.createObjectURL(file)

  uploading.value = true
  message.value = null
  try {
    await adminApi.uploadAvatar(authStore.token, file)
    message.value = { type: 'success', text: '大頭貼已更新。' }
    emit('refresh')
  } catch (err) {
    handleError(err)
  } finally {
    uploading.value = false
  }
}
</script>

<template>
  <div class="admin-panel">
    <h2 class="admin-panel__title">
      個人資料
    </h2>

    <div class="admin-avatar">
      <div class="admin-avatar__preview">
        <img
          v-if="avatarPreview || resolveAssetUrl(props.profile?.avatarUrl)"
          :src="avatarPreview ?? resolveAssetUrl(props.profile?.avatarUrl) ?? ''"
          alt="大頭貼預覽"
        >
        <span v-else>無</span>
      </div>
      <label class="btn btn--secondary admin-avatar__upload">
        {{ uploading ? '上傳中…' : '更換大頭貼' }}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          class="admin-avatar__input"
          :disabled="uploading"
          @change="handleAvatarChange"
        >
      </label>
    </div>

    <AvatarCropperDialog
      v-if="pendingAvatarFile"
      :file="pendingAvatarFile"
      @cancel="pendingAvatarFile = null"
      @apply="handleAvatarCropped"
    />

    <form
      class="admin-form"
      @submit.prevent="handleSubmit"
    >
      <div class="admin-form__grid">
        <label class="admin-form__field">
          <span>公開姓名</span>
          <input
            v-model="form.displayName"
            type="text"
            required
          >
        </label>
        <label class="admin-form__field">
          <span>常用稱呼</span>
          <input
            v-model="form.preferredName"
            type="text"
            required
          >
        </label>
        <label class="admin-form__field">
          <span>職稱（中文）</span>
          <input
            v-model="form.titleZh"
            type="text"
            required
          >
        </label>
        <label class="admin-form__field">
          <span>職稱（英文）</span>
          <input
            v-model="form.titleEn"
            type="text"
            required
          >
        </label>
        <label class="admin-form__field">
          <span>聯絡 Email</span>
          <input
            v-model="form.contactEmail"
            type="email"
          >
        </label>
      </div>

      <label class="admin-form__field">
        <span>自我介紹（中文）</span>
        <textarea
          v-model="form.introZh"
          rows="4"
          required
        />
      </label>

      <label class="admin-form__field">
        <span>自我介紹（英文）</span>
        <textarea
          v-model="form.introEn"
          rows="4"
          required
        />
      </label>

      <div class="admin-form__field">
        <span>聯絡連結</span>
        <div
          v-for="(link, index) in form.contactLinks"
          :key="index"
          class="admin-contact-link"
        >
          <input
            v-model="link.label"
            type="text"
            placeholder="名稱，例如 GitHub"
          >
          <input
            v-model="link.url"
            type="url"
            placeholder="https://..."
          >
          <button
            type="button"
            class="admin-contact-link__remove"
            @click="removeContactLink(index)"
          >
            移除
          </button>
        </div>
        <button
          type="button"
          class="btn btn--secondary admin-form__add"
          @click="addContactLink"
        >
          新增聯絡連結
        </button>
      </div>

      <p
        v-if="message"
        class="admin-message"
        :class="`admin-message--${message.type}`"
      >
        {{ message.text }}
      </p>

      <button
        type="submit"
        class="btn btn--primary"
        :disabled="saving"
      >
        {{ saving ? '儲存中…' : '儲存個人資料' }}
      </button>
    </form>
  </div>
</template>
