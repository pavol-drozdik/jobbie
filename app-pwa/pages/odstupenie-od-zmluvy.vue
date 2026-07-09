<template>
  <AuthMarketingSplitShell
    :panel-title="S.contractWithdrawalPanelTitle"
    :panel-subtitle="S.contractWithdrawalPanelSubtitle"
    :back-to="ROUTES.terms"
    back-label="Späť"
  >
    <h1 class="m-0 text-4xl font-extrabold leading-[1.1] text-black">
      {{ S.contractWithdrawalHeading }}
      <span class="text-marketing-green">{{ S.contractWithdrawalHeadingAccent }}</span>
    </h1>
    <p class="mb-9 mt-2 text-[17px] font-normal leading-normal text-black/55">
      {{ S.contractWithdrawalSubtitle }}
    </p>

    <LegalContractWithdrawalForm />

    <template #footer>
      <AuthLegalFooter />
    </template>
  </AuthMarketingSplitShell>
</template>

<script setup lang="ts">
import { S } from '~/utils/strings'
import { ROUTES } from '~/utils/app-routes'

definePageMeta({ layout: 'app' })

usePageSeo({
  title: `${S.contractWithdrawalHeading} ${S.contractWithdrawalHeadingAccent}`,
  description: S.contractWithdrawalSubtitle,
  canonicalPath: ROUTES.contractWithdrawal,
})
</script>
