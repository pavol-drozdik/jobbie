<script setup lang="ts">
import Message from 'primevue/message'
import Button from 'primevue/button'
import AdminMfaBanner from '../AdminMfaBanner.vue'
import AdminTopbar from './AdminTopbar.vue'
import AdminStatusFooter from './AdminStatusFooter.vue'

const isDev = import.meta.env.DEV

defineProps<{
  apiReachable: boolean | null
  apiChecking: boolean
  apiMessage: string | null
  apiVersion: string | null
  recentLoginMinutes: number | null
  onApiRetry: () => void
}>()
</script>

<template>
  <div class="flex min-h-screen flex-col bg-slate-50">
    <Message
      v-if="apiReachable === false"
      severity="warn"
      :closable="false"
      class="!rounded-none !border-x-0 !border-t-0"
    >
      <div class="space-y-2 text-sm">
        <p class="m-0 font-semibold">Admin API nedostupné.</p>
        <p class="m-0">{{ apiMessage }}</p>
        <p v-if="isDev" class="m-0 text-xs opacity-90">
          Spustite API: <code>cd jobbie-admin</code> → <code>npm run dev:api</code>
          (alebo celý stack <code>npm run dev</code>). Skontrolujte
          <code>api/.env</code> a <code>app/.env</code>
          (<code>VITE_ADMIN_API_URL=http://127.0.0.1:3099</code>).
        </p>
        <p v-else class="m-0 text-xs opacity-90">
          Lokálne API by sa malo spustiť automaticky. Reštartujte aplikáciu; pri pretrvávajúcom
          probléme preinštalujte najnovší build. Očakávaná adresa:
          <code>http://127.0.0.1:3099/health</code>.
        </p>
        <Button
          :label="apiChecking ? 'Kontrolujem…' : 'Skúsiť znova'"
          size="small"
          severity="warn"
          :disabled="apiChecking"
          @click="onApiRetry"
        />
      </div>
    </Message>

    <div class="flex min-h-0 flex-1">
      <slot name="sidebar" />

      <div class="flex min-w-0 flex-1 flex-col">
        <AdminMfaBanner />
        <AdminTopbar />
        <main class="flex-1 overflow-auto px-6 py-6">
          <slot />
        </main>
        <AdminStatusFooter
          :api-version="apiVersion"
          :recent-login-minutes="recentLoginMinutes"
        />
      </div>
    </div>
  </div>
</template>
