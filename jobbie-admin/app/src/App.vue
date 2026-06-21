<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAdminAuth } from './composables/adminAuth'
import { useAdminApiHealth } from './composables/useAdminApiHealth'
import { useModerationCount } from './composables/useModerationCount'
import AppConfirmDialog from './components/AppConfirmDialog.vue'
import AdminMfaBanner from './components/AdminMfaBanner.vue'
import AppHelpDrawer from './components/AppHelpDrawer.vue'

const route = useRoute()
const router = useRouter()
const { signOut } = useAdminAuth()
const { reachable, checking, message, checkWithRetry } = useAdminApiHealth()
const {
  count: moderationCount,
  canAccess: moderationCanAccess,
  refresh: refreshModerationCount,
} = useModerationCount()
const { baseUrl } = useAdminApiHealth()
const apiVersion = ref<string | null>(null)
const recentLoginMinutes = ref<number | null>(null)

const navItems = [
  { to: '/overview', label: 'Prehľad' },
  { to: '/infrastructure', label: 'Infra' },
  { to: '/support', label: 'Podpora' },
  { to: '/analytics', label: 'Analytics' },
  { to: '/audit', label: 'Audit' },
  { to: '/consent-log', label: 'Cookie súhlas' },
  { to: '/moderation', label: 'Moderácia', badge: true, requiresModeration: true },
  { to: '/users', label: 'Účty' },
  { to: '/notifications', label: 'Upozornenia' },
  { to: '/blog', label: 'Blog' },
]

const visibleNavItems = computed(() =>
  navItems.filter((item) => !item.requiresModeration || moderationCanAccess.value),
)

async function logout() {
  await signOut()
  await router.push({ name: 'login' })
}

async function loadFooterHealth() {
  try {
    const res = await fetch(`${baseUrl}/health`, { cache: 'no-store' })
    const data = (await res.json()) as { version?: string; recentLoginMinutes?: number }
    apiVersion.value = data.version ?? null
    recentLoginMinutes.value = data.recentLoginMinutes ?? null
  } catch {
    apiVersion.value = null
  }
}

onMounted(() => {
  void loadFooterHealth()
  if (route.name !== 'login') {
    void refreshModerationCount()
  }
})

watch(
  () => route.path,
  () => {
    if (route.name !== 'login') {
      void refreshModerationCount()
    }
  },
)
</script>

<template>
  <div class="shell">
    <div
      v-if="reachable === false"
      class="admin-api-banner"
      role="alert"
    >
      <strong>Admin API nedostupné.</strong>
      {{ message }}
      <p class="admin-api-banner-hint">
        Spustite API: <code>cd jobbie-admin</code> → <code>npm run dev:api</code>
        (alebo celý stack <code>npm run dev</code>). Skontrolujte
        <code>api/.env</code> a <code>app/.env</code> (<code>VITE_ADMIN_API_URL=http://127.0.0.1:3099</code>).
      </p>
      <button
        type="button"
        class="admin-api-banner-retry"
        :disabled="checking"
        @click="checkWithRetry()"
      >
        {{ checking ? 'Kontrolujem…' : 'Skúsiť znova' }}
      </button>
    </div>
    <template v-if="route.name === 'login'">
      <RouterView />
    </template>
    <div v-else class="admin-layout">
      <aside class="admin-sidebar">
        <div class="admin-brand">
          JOBBIE <span>Admin</span>
        </div>
        <RouterLink
          v-for="item in visibleNavItems"
          :key="item.to"
          :to="item.to"
          class="admin-nav-link"
        >
          {{ item.label }}
          <span
            v-if="item.badge && moderationCount > 0"
            class="nav-badge"
            :title="`${moderationCount} otvorených nahlásení`"
          >
            {{ moderationCount > 99 ? '99+' : moderationCount }}
          </span>
        </RouterLink>
        <div style="flex: 1" />
        <button type="button" class="admin-nav-link" style="border: none; background: transparent; width: 100%; text-align: left; cursor: pointer" @click="logout">
          Odhlásiť
        </button>
      </aside>
      <div class="admin-main">
        <AdminMfaBanner />
        <header class="admin-topbar">
          <div>
            <slot name="header" />
          </div>
          <AppHelpDrawer />
        </header>
        <main class="admin-content">
          <RouterView />
        </main>
        <footer v-if="apiVersion" class="admin-footer muted">
          Admin API v{{ apiVersion }}
          <span v-if="recentLoginMinutes != null"> · step-up {{ recentLoginMinutes }} min</span>
        </footer>
      </div>
    </div>
    <AppConfirmDialog />
  </div>
</template>

<style scoped>
.admin-nav-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.admin-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.admin-footer {
  padding: 0.5rem 1.25rem 1rem;
  font-size: 0.75rem;
}

.nav-badge {
  background: var(--danger);
  color: #fff;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.1rem 0.4rem;
  border-radius: 999px;
  min-width: 1.25rem;
  text-align: center;
}
</style>
