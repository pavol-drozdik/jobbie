<script setup lang="ts">
import { ref, watch } from 'vue'
import { adminApi } from '../composables/adminApi'
import { useConfirm } from '../composables/useConfirm'

type Audience = 'all' | 'company' | 'individual'

const title = ref('')
const body = ref('')
const linkPath = ref('')
const audience = ref<Audience>('all')
const recipientCount = ref<number | null>(null)
const counting = ref(false)
const sending = ref(false)
const message = ref<string | null>(null)
const error = ref(false)

const { confirm } = useConfirm()

async function refreshCount() {
  counting.value = true
  const res = await adminApi<{ count: number }>('/admin/notifications/broadcast/count', {
    query: { audience: audience.value },
  })
  counting.value = false
  recipientCount.value = res.ok ? (res.data?.count ?? null) : null
}

watch(audience, () => void refreshCount(), { immediate: true })

async function sendBroadcast() {
  message.value = null
  error.value = false
  if (!title.value.trim()) {
    message.value = 'Zadajte nadpis.'
    error.value = true
    return
  }
  const label =
    audience.value === 'all'
      ? 'všetkým používateľom'
      : audience.value === 'company'
        ? 'firemným účtom'
        : 'fyzickým osobám'
  const ok = await confirm({
    title: 'Hromadné upozornenie',
    message: `Odoslať in-app upozornenie (${label}, ~${recipientCount.value ?? '?'} príjemcov)?`,
    confirmLabel: 'Odoslať',
    danger: true,
  })
  if (!ok) return
  sending.value = true
  const res = await adminApi<{ sent: number; broadcast_id: string }>(
    '/admin/notifications/broadcast',
    {
      method: 'POST',
      body: {
        title: title.value.trim(),
        body: body.value.trim() || null,
        link_path: linkPath.value.trim() || undefined,
        audience: audience.value,
      },
    },
  )
  sending.value = false
  if (res.ok && res.data) {
    message.value = `Odoslané ${res.data.sent} používateľom (${res.data.broadcast_id}).`
    title.value = ''
    body.value = ''
    linkPath.value = ''
  } else {
    error.value = true
    message.value = res.ok ? 'Odoslanie zlyhalo.' : `Chyba ${res.status}: ${res.body}`
  }
}
</script>

<template>
  <div class="notifications-page">
    <header>
      <h1 class="page-title">Hromadné upozornenia</h1>
      <p class="page-subtitle">
        In-app notifikácia <code>admin_broadcast</code>. Vyžaduje nedávne prihlásenie.
      </p>
    </header>

    <section class="section-card">
      <label class="field-label" for="audience">Cieľová skupina</label>
      <select id="audience" v-model="audience" class="field-input analytics-select">
        <option value="all">Všetci</option>
        <option value="company">Firmy</option>
        <option value="individual">Fyzické osoby</option>
      </select>
      <p class="muted recipient-hint">
        <template v-if="counting">Počítam príjemcov…</template>
        <template v-else-if="recipientCount != null">
          Odhad príjemcov: <strong>{{ recipientCount.toLocaleString('sk-SK') }}</strong>
        </template>
      </p>

      <label class="field-label" for="broadcast-title">Nadpis</label>
      <input id="broadcast-title" v-model="title" class="field-input" maxlength="200" />

      <label class="field-label" for="broadcast-body">Text (voliteľný)</label>
      <textarea id="broadcast-body" v-model="body" class="field-input" rows="4" maxlength="2000" />

      <label class="field-label" for="broadcast-link">Odkaz v aplikácii</label>
      <input
        id="broadcast-link"
        v-model="linkPath"
        class="field-input mono"
        maxlength="500"
        placeholder="/pracovne-ponuky"
      />

      <button type="button" class="btn btn-primary" :disabled="sending" @click="sendBroadcast">
        {{ sending ? 'Odosielam…' : 'Odoslať' }}
      </button>
      <p v-if="message" class="action-msg" :class="{ 'action-msg--err': error }">{{ message }}</p>
    </section>
  </div>
</template>

<style scoped>
.notifications-page {
  max-width: 560px;
}

.section-card label.field-label {
  display: block;
  margin-top: 0.75rem;
}

.recipient-hint {
  margin: 0.35rem 0 0;
  font-size: 0.85rem;
}

.action-msg {
  margin-top: 0.75rem;
  font-size: 0.875rem;
  color: var(--g700);
}

.action-msg--err {
  color: var(--danger);
}
</style>
