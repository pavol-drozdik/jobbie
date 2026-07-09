<script setup lang="ts">
import { ref } from 'vue'
import Button from 'primevue/button'
import Drawer from 'primevue/drawer'
import { useAdminApiHealth } from '../composables/useAdminApiHealth'

const open = ref(false)
const { baseUrl, reachable } = useAdminApiHealth()
const recentLoginMinutes = ref<number | null>(null)

async function loadHealthMeta() {
  try {
    const res = await fetch(`${baseUrl}/health`, { cache: 'no-store' })
    const data = (await res.json()) as {
      recentLoginMinutes?: number
      version?: string
    }
    recentLoginMinutes.value = data.recentLoginMinutes ?? null
  } catch {
    recentLoginMinutes.value = null
  }
}

function toggle() {
  open.value = !open.value
  if (open.value) void loadHealthMeta()
}
</script>

<template>
  <Button
    icon="pi pi-question-circle"
    severity="secondary"
    text
    rounded
    aria-label="Pomocník"
    title="Pomocník"
    @click="toggle"
  />

  <Drawer v-model:visible="open" position="right" header="Runbook" class="!w-full sm:!w-96">
    <ul class="m-0 list-none space-y-4 p-0 text-sm text-slate-600">
      <li>
        <strong class="text-slate-900">Step-up:</strong>
        <code>ADMIN_RECENT_LOGIN_MINUTES</code>
        (default 120) — JWT <code>auth_time</code> / <code>iat</code>.
        <span v-if="recentLoginMinutes != null"> Aktuálne: {{ recentLoginMinutes }} min.</span>
      </li>
      <li>
        <strong class="text-slate-900">Env:</strong> <code>jobbie-admin/api/.env</code> (alebo
        <code>%APPDATA%\jobbie-admin\.env</code> po inštalácii).
      </li>
      <li>
        <strong class="text-slate-900">403 export:</strong> skontrolujte recent login; audit vyžaduje
        <code>AUDIT_CHAIN_SECRET</code>.
      </li>
      <li>
        <strong class="text-slate-900">API:</strong> {{ baseUrl }} —
        {{ reachable === false ? 'nedostupné' : reachable ? 'OK' : '…' }}
      </li>
      <li>
        <a
          href="https://github.com/jobbie-sk/jobbie/blob/main/docs/admin-desktop.md"
          target="_blank"
          rel="noopener noreferrer"
          class="text-primary-600 hover:underline"
        >
          docs/admin-desktop.md
        </a>
      </li>
    </ul>
    <p class="mt-6 text-xs text-slate-500">
      Code signing / auto-update: manuálne — pozri README.
    </p>
  </Drawer>
</template>
