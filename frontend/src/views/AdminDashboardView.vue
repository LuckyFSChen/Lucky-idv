<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AdminExperienceManager from '@/components/admin/AdminExperienceManager.vue'
import AdminProfileForm from '@/components/admin/AdminProfileForm.vue'
import AdminProjectsManager from '@/components/admin/AdminProjectsManager.vue'
import AdminSkillsManager from '@/components/admin/AdminSkillsManager.vue'
import { useAdminAuthStore } from '@/stores/adminAuth'
import { usePortfolioStore } from '@/stores/portfolio'

type Tab = 'profile' | 'skills' | 'experience' | 'projects'

const tabs: { id: Tab; label: string }[] = [
  { id: 'profile', label: '個人資料' },
  { id: 'skills', label: '技能分類' },
  { id: 'experience', label: '工作經歷' },
  { id: 'projects', label: '專案作品' },
]

const portfolioStore = usePortfolioStore()
const authStore = useAdminAuthStore()
const router = useRouter()
const activeTab = ref<Tab>('profile')
const initialLoading = ref(true)

onMounted(async () => {
  await portfolioStore.fetchAll()
  initialLoading.value = false
})

function refresh() {
  portfolioStore.fetchAll()
}

function handleUnauthorized() {
  authStore.logout()
  router.push({ name: 'admin-login' })
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
        v-else
        :projects="portfolioStore.projects"
        @refresh="refresh"
        @unauthorized="handleUnauthorized"
      />
    </template>
  </div>
</template>
