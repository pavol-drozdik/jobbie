<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ConfirmDialog from 'primevue/confirmdialog'
import { useAdminAuth } from './composables/adminAuth'
import { useAdminApiHealth } from './composables/useAdminApiHealth'
import { useModerationCount } from './composables/useModerationCount'
import AdminShell from './components/layout/AdminShell.vue'
import AdminSidebar from './components/layout/AdminSidebar.vue'

const SIDEBAR_COLLAPSED_KEY = 'jb_admin_sidebar_collapsed'

const route = useRoute()
const router = useRouter()
const { signOut } = useAdminAuth()
const { reachable, checking, message, checkWithRetry, baseUrl } = useAdminApiHealth()
const { refresh: refreshModerationCount } = useModerationCount()

const apiVersion = ref<string | null>(null)
const recentLoginMinutes = ref<number | null>(null)
const sidebarCollapsed = ref(false)

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
  sidebarCollapsed.value = localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1'
  void loadFooterHealth()
  if (route.name !== 'login') {
    void refreshModerationCount()
  }
})

watch(sidebarCollapsed, (value) => {
  localStorage.setItem(SIDEBAR_COLLAPSED_KEY, value ? '1' : '0')
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
  <template v-if="route.name === 'login'">
    <RouterView />
  </template>

  <AdminShell
    v-else
    :api-reachable="reachable"
    :api-checking="checking"
    :api-message="message"
    :api-version="apiVersion"
    :recent-login-minutes="recentLoginMinutes"
    :on-api-retry="checkWithRetry"
  >
    <template #sidebar>
      <AdminSidebar
        :collapsed="sidebarCollapsed"
        :on-logout="logout"
        @update:collapsed="sidebarCollapsed = $event"
      />
    </template>

    <RouterView />
  </AdminShell>

  <ConfirmDialog />
</template>
