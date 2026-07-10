<script setup lang="ts">
import { computed } from 'vue'
import Message from 'primevue/message'
import Button from 'primevue/button'
import AdminMfaBanner from '../AdminMfaBanner.vue'
import AdminTopbar from './AdminTopbar.vue'
import AdminStatusFooter from './AdminStatusFooter.vue'
import {
  formatApiLogExcerpt,
  useAdminApiBootstrap,
} from '../../composables/useAdminApiBootstrap'

const isDev = import.meta.env.DEV

defineProps<{
  apiReachable: boolean | null
  apiChecking: boolean
  apiMessage: string | null
  apiVersion: string | null
  recentLoginMinutes: number | null
  onApiRetry: () => void
}>()

const { status: bootstrapStatus, available: bootstrapAvailable, openUserDataFolder } =
  useAdminApiBootstrap()

const apiLogExcerpt = computed(() =>
  formatApiLogExcerpt(bootstrapStatus.value?.logTail ?? ''),
)

const missingEnvHint = computed(() => {
  const keys = bootstrapStatus.value?.missingEnvKeys ?? []
  if (keys.length === 0) return ''
  return `Chýbajúce premenné: ${keys.join(', ')}`
})
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
        <template v-else>
          <p class="m-0 text-xs opacity-90">
            Lokálne API by sa malo spustiť automaticky na
            <code>http://127.0.0.1:3099/health</code>. Ak ste preinštalovali aplikáciu a
            problém pretrváva, skontrolujte, či v
            <code>%APPDATA%\JOBBIE Admin\.env</code> nie je prázdna konfigurácia — tá môže
            prepísať tajomstvá z inštalátora. Vymažte prázdny súbor a reštartujte.
          </p>
          <p v-if="missingEnvHint" class="m-0 text-xs font-medium text-amber-900">
            {{ missingEnvHint }}
          </p>
          <pre
            v-if="bootstrapAvailable && apiLogExcerpt"
            class="m-0 max-h-32 overflow-auto rounded bg-slate-900/5 p-2 text-[0.7rem] leading-relaxed text-slate-700"
          >{{ apiLogExcerpt }}</pre>
        </template>
        <div class="flex flex-wrap gap-2">
          <Button
            :label="apiChecking ? 'Kontrolujem…' : 'Skúsiť znova'"
            size="small"
            severity="warn"
            :disabled="apiChecking"
            @click="onApiRetry"
          />
          <Button
            v-if="!isDev && bootstrapAvailable"
            label="Otvoriť priečinok konfigurácie"
            size="small"
            severity="secondary"
            outlined
            @click="openUserDataFolder"
          />
        </div>
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
