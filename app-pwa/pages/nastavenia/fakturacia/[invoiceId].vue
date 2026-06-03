<template>
  <SettingsPageShell
    content-layout="stacked"
    :title="pageTitle"
    :description="S.settingsCardFakturaciaDesc"
    back-to="/nastavenia/fakturacia"
    :back-label="S.settingsCardFakturacia"
    :flash="flash"
    :error="pageError"
  >
    <AppAsyncListState
      :loading="loading"
      :error="loadError"
      :empty="!loading && !loadError && !invoice"
      :empty-message="S.settingsInvoiceNotFound"
      @retry="load"
    >
      <SettingsInvoiceDetailPanel
        v-if="invoice"
        :invoice="invoice"
        :return-url="returnUrl"
        @paid="onPaid"
      />
    </AppAsyncListState>
  </SettingsPageShell>
</template>

<script setup lang="ts">
import type { InvoiceDetail } from '~/types/invoice-detail'
import { S } from '~/utils/strings'
import { parseApiErrorMessage } from '~/utils/api-errors'

definePageMeta({ layout: 'app', middleware: ['auth'] })

const route = useRoute()
const requestURL = useRequestURL()
const { api } = useApi()

const invoiceId = computed(() => String(route.params.invoiceId ?? '').trim())

const loading = ref(true)
const loadError = ref<string | null>(null)
const pageError = ref<string | null>(null)
const flash = ref<string | null>(null)
const invoice = ref<InvoiceDetail | null>(null)

const pageTitle = computed(() => {
  const n = invoice.value?.number
  if (n) {
    return `${S.settingsInvoiceDetailTitle} ${n}`
  }
  return S.settingsInvoiceDetailTitle
})

const returnUrl = computed(() => {
  if (import.meta.client && typeof window !== 'undefined') {
    return window.location.href
  }
  return `${requestURL.origin}/nastavenia/fakturacia/${encodeURIComponent(invoiceId.value)}`
})

async function load(): Promise<void> {
  const id = invoiceId.value
  if (!id.startsWith('in_')) {
    loadError.value = S.settingsInvoiceNotFound
    invoice.value = null
    loading.value = false
    return
  }

  loading.value = true
  loadError.value = null
  pageError.value = null
  try {
    const res = await api<InvoiceDetail>(`/api/payments/invoices/${id}`)
    if (res.ok && res.data) {
      invoice.value = res.data
      return
    }
    loadError.value = parseApiErrorMessage(res, S.settingsInvoiceNotFound)
    invoice.value = null
  } finally {
    loading.value = false
  }
}

async function onPaid(): Promise<void> {
  flash.value = S.settingsInvoicePaidSuccess
  await load()
}

watch(invoiceId, () => {
  void load()
})

onMounted(() => {
  void load()
})

useHead({
  title: () => pageTitle.value,
})
</script>
