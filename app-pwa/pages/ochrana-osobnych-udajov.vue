<template>
  <MarketingContentPage :page="TRUST_PRIVACY_PAGE" />
</template>

<script setup lang="ts">
import MarketingContentPage from '~/components/marketing/MarketingContentPage.vue'
import { TRUST_PRIVACY_PAGE } from '~/utils/privacy-policy-content'
import { ROUTES } from '~/utils/app-routes'
import { GDPR_PRIVACY_POLICY_UPDATED_AT } from '~/utils/legal-documents'

definePageMeta({ layout: 'app', layoutMainFlushTop: true })

usePageSeo({
  title: TRUST_PRIVACY_PAGE.title,
  description: TRUST_PRIVACY_PAGE.intro,
  canonicalPath: ROUTES.privacy,
  dateModified: GDPR_PRIVACY_POLICY_UPDATED_AT,
})
</script>
