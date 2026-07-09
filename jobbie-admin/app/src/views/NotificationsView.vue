<script setup lang="ts">
import { ref, watch } from 'vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Select from 'primevue/select'
import Textarea from 'primevue/textarea'
import { adminApi } from '../composables/adminApi'
import { useConfirm } from '../composables/useConfirm'
import AdminPageHeader from '../components/layout/AdminPageHeader.vue'

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

const audienceOptions = [
  { label: 'Všetci', value: 'all' as const },
  { label: 'Firmy', value: 'company' as const },
  { label: 'Fyzické osoby', value: 'individual' as const },
]

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
  <div class="admin-page max-w-xl">
    <AdminPageHeader
      title="Hromadné upozornenia"
      subtitle="In-app notifikácia admin_broadcast. Vyžaduje nedávne prihlásenie."
    />

    <section class="admin-section-card space-y-4">
      <div class="flex flex-col gap-1">
        <label for="audience" class="text-sm font-medium text-slate-700">Cieľová skupina</label>
        <Select
          id="audience"
          v-model="audience"
          :options="audienceOptions"
          option-label="label"
          option-value="value"
          class="w-full"
        />
        <p class="m-0 text-sm text-slate-500">
          <template v-if="counting">Počítam príjemcov…</template>
          <template v-else-if="recipientCount != null">
            Odhad príjemcov: <strong>{{ recipientCount.toLocaleString('sk-SK') }}</strong>
          </template>
        </p>
      </div>

      <div class="flex flex-col gap-1">
        <label for="broadcast-title" class="text-sm font-medium text-slate-700">Nadpis</label>
        <InputText id="broadcast-title" v-model="title" class="w-full" maxlength="200" />
      </div>

      <div class="flex flex-col gap-1">
        <label for="broadcast-body" class="text-sm font-medium text-slate-700">Text (voliteľný)</label>
        <Textarea id="broadcast-body" v-model="body" class="w-full" rows="4" maxlength="2000" />
      </div>

      <div class="flex flex-col gap-1">
        <label for="broadcast-link" class="text-sm font-medium text-slate-700">Odkaz v aplikácii</label>
        <InputText
          id="broadcast-link"
          v-model="linkPath"
          class="w-full font-mono"
          maxlength="500"
          placeholder="/pracovne-ponuky"
        />
      </div>

      <Button
        :label="sending ? 'Odosielam…' : 'Odoslať'"
        :loading="sending"
        @click="sendBroadcast"
      />

      <Message v-if="message" :severity="error ? 'error' : 'success'" :closable="false">
        {{ message }}
      </Message>
    </section>
  </div>
</template>
