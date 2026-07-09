<template>
  <AuthMarketingSplitShell
    :panel-title="panelTitle"
    :panel-subtitle="panelSubtitle"
    :back-to="returnPath"
    :back-label="S.checkoutBackLink"
  >
    <template v-if="invalidParams">
      <h1 class="m-0 text-4xl font-extrabold leading-[1.1] text-black">
        {{ S.checkoutInvalidParams }}
      </h1>
    </template>

    <CheckoutCreditsPanel
      v-else-if="checkoutType === 'credits'"
      :pack-slug="packSlug"
      :return-path="returnPath"
      @cancel="navigateTo(returnPath)"
    />

    <CheckoutSubscriptionPanel
      v-else-if="checkoutType === 'subscription'"
      :plan-id="planId"
      :return-path="returnPath"
    />
  </AuthMarketingSplitShell>
</template>

<script setup lang="ts">
import { S } from '~/utils/strings'
import { ROUTES } from '~/utils/app-routes'
import { resolveSafeInternalPath } from '~/utils/safe-navigation'

definePageMeta({ layout: 'app', middleware: ['auth', 'billing-access'] })

const route = useRoute()

const returnPath = computed(() => {
  const raw = route.query.return
  const s = Array.isArray(raw) ? raw[0] : raw
  return resolveSafeInternalPath(s, ROUTES.pricing)
})

const checkoutType = computed(() => {
  const t = route.query.type
  return t === 'credits' || t === 'subscription' ? t : null
})

const packSlug = computed(() =>
  typeof route.query.pack === 'string' ? route.query.pack.trim() : '',
)

const planId = computed(() =>
  typeof route.query.plan_id === 'string' ? route.query.plan_id.trim() : '',
)

const invalidParams = computed(() => {
  if (checkoutType.value === 'credits') return !packSlug.value
  if (checkoutType.value === 'subscription') return !planId.value
  return true
})

const panelTitle = computed(() => {
  if (checkoutType.value === 'subscription') return S.checkoutPanelTitleSubscription
  return S.checkoutPanelTitleCredits
})

const panelSubtitle = computed(() => {
  if (checkoutType.value === 'subscription') return S.checkoutPanelSubtitleSubscription
  return S.checkoutPanelSubtitleCredits
})
</script>
