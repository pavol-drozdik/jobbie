import { createRouter, createWebHashHistory } from 'vue-router'
import { useAdminAuth } from './composables/adminAuth'

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/overview' },
    {
      path: '/login',
      name: 'login',
      component: () => import('./views/LoginView.vue'),
    },
    {
      path: '/overview',
      name: 'overview',
      component: () => import('./views/OverviewView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/infrastructure',
      name: 'infrastructure',
      component: () => import('./views/InfrastructureView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/support',
      name: 'support',
      component: () => import('./views/SupportHubView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/support/jobs/:id',
      name: 'support-job',
      component: () => import('./views/SupportJobDetailView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/support/company-ads/:id',
      name: 'support-company-ad',
      component: () => import('./views/SupportCompanyAdDetailView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/support/users/:id',
      name: 'support-user',
      component: () => import('./views/SupportUserDetailView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/analytics',
      name: 'analytics',
      component: () => import('./views/AnalyticsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/audit',
      name: 'audit',
      component: () => import('./views/AuditView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/consent-log',
      name: 'consent-log',
      component: () => import('./views/ConsentLogView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/moderation',
      name: 'moderation',
      component: () => import('./views/ModerationView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/users',
      name: 'users',
      component: () => import('./views/UsersView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/notifications',
      name: 'notifications',
      component: () => import('./views/NotificationsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/blog',
      name: 'blog',
      component: () => import('./views/BlogListView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/blog/new',
      name: 'blog-new',
      component: () => import('./views/BlogEditView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/blog/:id',
      name: 'blog-edit',
      component: () => import('./views/BlogEditView.vue'),
      meta: { requiresAuth: true },
    },
  ],
})

router.beforeEach(async (to) => {
  const { isAuthenticated, init } = useAdminAuth()
  await init()
  if (to.meta.requiresAuth && !isAuthenticated.value) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.name === 'login' && isAuthenticated.value) {
    return { name: 'overview' }
  }
})
