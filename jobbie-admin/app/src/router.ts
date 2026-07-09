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
      meta: { requiresAuth: true, title: 'Prehľad' },
    },
    {
      path: '/infrastructure',
      name: 'infrastructure',
      component: () => import('./views/InfrastructureView.vue'),
      meta: { requiresAuth: true, title: 'Infra' },
    },
    {
      path: '/support',
      name: 'support',
      component: () => import('./views/SupportHubView.vue'),
      meta: { requiresAuth: true, title: 'Podpora' },
    },
    {
      path: '/support/jobs/:id',
      name: 'support-job',
      component: () => import('./views/SupportJobDetailView.vue'),
      meta: { requiresAuth: true, title: 'Podpora · Ponuka' },
    },
    {
      path: '/support/company-ads/:id',
      name: 'support-company-ad',
      component: () => import('./views/SupportCompanyAdDetailView.vue'),
      meta: { requiresAuth: true, title: 'Podpora · Inzerát' },
    },
    {
      path: '/support/users/:id',
      name: 'support-user',
      component: () => import('./views/SupportUserDetailView.vue'),
      meta: { requiresAuth: true, title: 'Podpora · Účet' },
    },
    {
      path: '/analytics',
      name: 'analytics',
      component: () => import('./views/AnalyticsView.vue'),
      meta: { requiresAuth: true, title: 'Analytics' },
    },
    {
      path: '/audit',
      name: 'audit',
      component: () => import('./views/AuditView.vue'),
      meta: { requiresAuth: true, title: 'Audit' },
    },
    {
      path: '/consent-log',
      name: 'consent-log',
      component: () => import('./views/ConsentLogView.vue'),
      meta: { requiresAuth: true, title: 'Cookie súhlas' },
    },
    {
      path: '/contract-withdrawals',
      name: 'contract-withdrawals',
      component: () => import('./views/ContractWithdrawalsView.vue'),
      meta: { requiresAuth: true, title: 'Odstúpenie od zmluvy' },
    },
    {
      path: '/moderation',
      name: 'moderation',
      component: () => import('./views/ModerationView.vue'),
      meta: { requiresAuth: true, title: 'Moderácia' },
    },
    {
      path: '/users',
      name: 'users',
      component: () => import('./views/UsersView.vue'),
      meta: { requiresAuth: true, title: 'Účty' },
    },
    {
      path: '/notifications',
      name: 'notifications',
      component: () => import('./views/NotificationsView.vue'),
      meta: { requiresAuth: true, title: 'Upozornenia' },
    },
    {
      path: '/registration-promo',
      name: 'registration-promo',
      component: () => import('./views/RegistrationPromoView.vue'),
      meta: { requiresAuth: true, title: 'Promo kódy' },
    },
    {
      path: '/blog',
      name: 'blog',
      component: () => import('./views/BlogListView.vue'),
      meta: { requiresAuth: true, title: 'Blog' },
    },
    {
      path: '/blog/new',
      name: 'blog-new',
      component: () => import('./views/BlogEditView.vue'),
      meta: { requiresAuth: true, title: 'Blog · Nový' },
    },
    {
      path: '/blog/:id',
      name: 'blog-edit',
      component: () => import('./views/BlogEditView.vue'),
      meta: { requiresAuth: true, title: 'Blog · Úprava' },
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
