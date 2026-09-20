<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAdminAuthStore } from '@/stores/adminAuth'

const authStore = useAdminAuthStore()
const router = useRouter()
const route = useRoute()

const form = reactive({ email: '', password: '' })
const submitting = ref(false)

async function handleSubmit() {
  submitting.value = true
  const ok = await authStore.login(form.email, form.password)
  submitting.value = false
  if (ok) {
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/admin'
    router.push(redirect)
  }
}
</script>

<template>
  <div class="admin-login">
    <form
      class="admin-login__card"
      @submit.prevent="handleSubmit"
    >
      <h1 class="admin-login__title">
        後台登入
      </h1>
      <p class="admin-login__subtitle">
        僅限管理者登入以編輯個人網站內容。
      </p>

      <label class="admin-login__field">
        <span>Email</span>
        <input
          v-model="form.email"
          type="email"
          autocomplete="username"
          required
        >
      </label>

      <label class="admin-login__field">
        <span>密碼</span>
        <input
          v-model="form.password"
          type="password"
          autocomplete="current-password"
          required
        >
      </label>

      <p
        v-if="authStore.error"
        class="admin-login__error"
      >
        {{ authStore.error }}
      </p>

      <button
        type="submit"
        class="btn btn--primary admin-login__submit"
        :disabled="submitting"
      >
        {{ submitting ? '登入中…' : '登入' }}
      </button>
    </form>
  </div>
</template>

<style scoped>
.admin-login {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--gradient-hero);
  padding: 1.5rem;
}

.admin-login__card {
  width: 100%;
  max-width: 380px;
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  padding: 2.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.admin-login__title {
  font-size: 1.6rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.admin-login__subtitle {
  color: var(--color-text-secondary);
  font-size: 0.95rem;
  margin-bottom: 0.5rem;
}

.admin-login__field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-size: 0.9rem;
  font-weight: 500;
}

.admin-login__field input {
  padding: 0.7rem 0.9rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  font-size: 1rem;
  font-family: inherit;
}

.admin-login__field input:focus {
  outline: 2px solid var(--color-accent);
  outline-offset: 1px;
}

.admin-login__error {
  color: var(--color-danger);
  font-size: 0.9rem;
}

.admin-login__submit {
  margin-top: 0.5rem;
  width: 100%;
}
</style>
