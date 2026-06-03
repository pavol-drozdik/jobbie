<template>
  <SettingsPageShell
    :title="S.settingsCardKredity"
    :description="S.settingsCardKredityDesc"
    :flash="flash"
    :error="error"
  >
    <SettingsCreditsPanel />
  </SettingsPageShell>
</template>

<script setup lang="ts">
import { S } from '~/utils/strings'
import {
  readStripeReturnQuery,
  stripStripeReturnQueryFromBrowserUrl,
} from '~/utils/stripe-return-query'

definePageMeta({ layout: 'app', middleware: ['auth'] })

const route = useRoute()
const { flash, error } = useSettingsFeedback()
const { api } = useApi()
const { refreshUser } = useAuth()
const confirmPending = ref(false)

async function tryConfirmCreditsFromQuery(): Promise<void> {
  if (!import.meta.client) return
  stripStripeReturnQueryFromBrowserUrl()
  const { paymentIntent, redirectStatus } = readStripeReturnQuery(window.location.search)
  if (!paymentIntent) return
  if (redirectStatus === 'failed') {
    error.value = S.checkoutPaymentFailed
    return
  }
  confirmPending.value = true
  flash.value = null
  try {
    const res = await api<{ message?: string }>('/api/payments/confirm-credits', {
      method: 'POST',
      body: { payment_intent_id: paymentIntent },
    })
    if (!res.ok) {
      error.value = S.checkoutPaymentFailed
      return
    }
    await refreshUser()
    flash.value = S.settingsCreditsPurchaseSuccess
    error.value = null
  } catch {
    error.value = S.checkoutPaymentFailed
  } finally {
    confirmPending.value = false
  }
}

onMounted(() => {
  void tryConfirmCreditsFromQuery()
})

useHead({ title: () => S.settingsCardKredity })
</script>
