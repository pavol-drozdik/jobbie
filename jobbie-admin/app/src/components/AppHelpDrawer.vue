<script setup lang="ts">
import { ref } from 'vue'
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
  <div class="help-root">
    <button type="button" class="help-trigger" title="Pomocník" @click="toggle">?</button>
    <aside v-if="open" class="help-drawer">
      <header class="help-drawer-head">
        <strong>Runbook</strong>
        <button type="button" class="btn btn-ghost btn-sm" @click="open = false">×</button>
      </header>
      <ul class="help-list">
        <li>
          <strong>Step-up:</strong>
          <code>ADMIN_RECENT_LOGIN_MINUTES</code>
          (default 120) — JWT <code>auth_time</code> / <code>iat</code>.
          <span v-if="recentLoginMinutes != null"> Aktuálne: {{ recentLoginMinutes }} min.</span>
        </li>
        <li>
          <strong>Env:</strong> <code>jobbie-admin/api/.env</code> (alebo
          <code>%APPDATA%\jobbie-admin\.env</code> po inštalácii).
        </li>
        <li>
          <strong>403 export:</strong> skontrolujte recent login; audit vyžaduje
          <code>AUDIT_CHAIN_SECRET</code>.
        </li>
        <li>
          <strong>API:</strong> {{ baseUrl }} —
          {{ reachable === false ? 'nedostupné' : reachable ? 'OK' : '…' }}
        </li>
        <li>
          <a
            href="https://github.com/jobbie-sk/jobbie/blob/main/docs/admin-desktop.md"
            target="_blank"
            rel="noopener noreferrer"
          >
            docs/admin-desktop.md
          </a>
        </li>
      </ul>
      <p class="muted help-note">
        Code signing / auto-update: manuálne — pozri README.
      </p>
    </aside>
  </div>
</template>

<style scoped>
.help-root {
  position: relative;
}

.help-trigger {
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  border: 1px solid var(--g300);
  background: #fff;
  font-weight: 700;
  cursor: pointer;
}

.help-drawer {
  position: absolute;
  right: 0;
  top: 2.5rem;
  width: min(360px, 92vw);
  background: #fff;
  border: 1px solid var(--g200);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgb(0 0 0 / 12%);
  padding: 0.75rem 1rem;
  z-index: 50;
}

.help-drawer-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.help-list {
  margin: 0;
  padding-left: 1.1rem;
  font-size: 0.85rem;
  line-height: 1.45;
}

.help-list li {
  margin-bottom: 0.5rem;
}

.help-note {
  margin-top: 0.75rem;
  font-size: 0.75rem;
}
</style>
