import { createRouter, createWebHistory } from 'vue-router'
import { useAdminAuthStore } from '@/stores/adminAuth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue'),
    },
    {
      path: '/cases/:slug',
      name: 'case-detail',
      component: () => import('@/views/CaseDetailView.vue'),
    },
    {
      path: '/admin/login',
      name: 'admin-login',
      component: () => import('@/views/AdminLoginView.vue'),
    },
    {
      path: '/admin',
      name: 'admin-dashboard',
      component: () => import('@/views/AdminDashboardView.vue'),
      meta: { requiresAuth: true },
    },
  ],
})

router.beforeEach((to) => {
  if (to.meta.requiresAuth) {
    const authStore = useAdminAuthStore()
    if (!authStore.isAuthenticated) {
      return { name: 'admin-login', query: { redirect: to.fullPath } }
    }
  }
  return true
})

export default router
