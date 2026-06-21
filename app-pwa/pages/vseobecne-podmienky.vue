<template>
  <MarketingContentPage :page="TRUST_TERMS_PAGE" />
</template>

<script setup lang="ts">
import MarketingContentPage from '~/components/marketing/MarketingContentPage.vue'
import { TRUST_TERMS_PAGE } from '~/utils/trust-page-content'
import { ROUTES } from '~/utils/app-routes'
import { S } from '~/utils/strings'

definePageMeta({ layout: 'app', layoutMainFlushTop: true })

usePageSeo({
  title: S.footerLinkTerms,
  description: TRUST_TERMS_PAGE.intro,
  canonicalPath: ROUTES.terms,
  dateModified: TRUST_TERMS_PAGE.updatedAt,
})
</script>
