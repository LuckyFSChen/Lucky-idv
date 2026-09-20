<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { adminApi, AdminApiError } from '@/api/adminClient'
import AdminCertificationsManager from '@/components/admin/AdminCertificationsManager.vue'
import AdminEngineeringCasesManager from '@/components/admin/AdminEngineeringCasesManager.vue'
import AdminExperienceManager from '@/components/admin/AdminExperienceManager.vue'
import AdminProfileForm from '@/components/admin/AdminProfileForm.vue'
import AdminProjectsManager from '@/components/admin/AdminProjectsManager.vue'
import AdminSkillsManager from '@/components/admin/AdminSkillsManager.vue'
import { useAdminAuthStore } from '@/stores/adminAuth'
import { usePortfolioStore } from '@/stores/portfolio'
import type { EngineeringCase } from '@/types/api'

type Tab = 'profile' | 'skills' | 'experience' | 'projects' | 'engineering-cases' | 'certifications'

const tabs: { id: Tab; label: string }[] = [
  { id: 'profile', label: '個人資料' },
  { id: 'skills', label: '技能分類' },
  { id: 'experience', label: '工作經歷' },
  { id: 'projects', label: '專案作品' },
  { id: 'engineering-cases', label: '工程案例' },
  { id: 'certifications', label: '專業認證' },
]

const portfolioStore = usePortfolioStore()
const authStore = useAdminAuthStore()
const router = useRouter()
const activeTab = ref<Tab>('profile')
const initialLoading = ref(true)
// 工程案例含未發布項目，公開 portfolioStore 只回傳已發布資料，
// 後台需改用專屬的 admin 端點才能看到並管理下架中的案例。
const engineeringCases = ref<EngineeringCase[]>([])

function handleUnauthorized() {
  authStore.logout()
  router.push({ name: 'admin-login' })
}

async function loadEngineeringCases() {
  try {
    engineeringCases.value = await adminApi.listEngineeringCases(authStore.token)
  } catch (err) {
    if (err instanceof AdminApiError && err.status === 401) {
      handleUnauthorized()
      return
    }
    throw err
  }
}

onMounted(async () => {
  await Promise.all([portfolioStore.fetchAll(), loadEngineeringCases()])
  initialLoading.value = false
})

function refresh() {
  portfolioStore.fetchAll()
  loadEngineeringCases()
}

function logout() {
  authStore.logout()
  router.push({ name: 'admin-login' })
}
</script>

<template>
  <div class="admin">
    <header class="admin__header">
      <h1>後台管理</h1>
      <div class="admin__header-actions">
        <a
          href="/"
          target="_blank"
          rel="noopener"
          class="btn btn--secondary"
        >查看公開頁面</a>
        <button
          type="button"
          class="btn btn--secondary"
          @click="logout"
        >
          登出
        </button>
      </div>
    </header>

    <nav class="admin__tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        class="admin__tab"
        :class="{ 'admin__tab--active': activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </nav>

    <p
      v-if="initialLoading"
      class="admin__state"
    >
      資料載入中…
    </p>
    <p
      v-else-if="portfolioStore.status === 'error' && !portfolioStore.profile"
      class="admin__state admin__state--error"
    >
      {{ portfolioStore.error }}
    </p>

    <template v-else>
      <AdminProfileForm
        v-if="activeTab === 'profile'"
        :profile="portfolioStore.profile"
        @refresh="refresh"
        @unauthorized="handleUnauthorized"
      />
      <AdminSkillsManager
        v-else-if="activeTab === 'skills'"
        :categories="portfolioStore.skillCategories"
        @refresh="refresh"
        @unauthorized="handleUnauthorized"
      />
      <AdminExperienceManager
        v-else-if="activeTab === 'experience'"
        :experiences="portfolioStore.experiences"
        @refresh="refresh"
        @unauthorized="handleUnauthorized"
      />
      <AdminProjectsManager
        v-else-if="activeTab === 'projects'"
        :projects="portfolioStore.projects"
        @refresh="refresh"
        @unauthorized="handleUnauthorized"
      />
      <AdminEngineeringCasesManager
        v-else-if="activeTab === 'engineering-cases'"
        :cases="engineeringCases"
        @refresh="refresh"
        @unauthorized="handleUnauthorized"
      />
      <AdminCertificationsManager
        v-else
        :certifications="portfolioStore.certifications"
        @refresh="refresh"
        @unauthorized="handleUnauthorized"
      />
    </template>
  </div>
</template>
