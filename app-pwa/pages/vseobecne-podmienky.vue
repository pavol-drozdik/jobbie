<template>
  <MarketingContentPage :page="TRUST_TERMS_PAGE" />
</template>

<script setup lang="ts">
import MarketingContentPage from '~/components/marketing/MarketingContentPage.vue'
import { TRUST_TERMS_PAGE } from '~/utils/terms-content'
import { ROUTES } from '~/utils/app-routes'

definePageMeta({ layout: 'app', layoutMainFlushTop: true })

usePageSeo({
  title: TRUST_TERMS_PAGE.title,
  description: TRUST_TERMS_PAGE.intro,
  canonicalPath: ROUTES.terms,
  dateModified: TRUST_TERMS_PAGE.updatedAt,
})
</script>
