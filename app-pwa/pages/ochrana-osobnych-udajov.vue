<template>
  <MarketingContentPage
    :page="TRUST_PRIVACY_PAGE"
    :show-legal-review-banner="!brand.legalPublished"
  />
</template>

<script setup lang="ts">
import MarketingContentPage from '~/components/marketing/MarketingContentPage.vue'
import { TRUST_PRIVACY_PAGE } from '~/utils/trust-page-content'
import { ROUTES } from '~/utils/app-routes'
import { S } from '~/utils/strings'
import { useBrandSeoConfig } from '~/utils/brand-seo'

definePageMeta({ layout: 'app', layoutMainFlushTop: true })

const brand = useBrandSeoConfig()

usePageSeo({
  title: S.footerLinkPrivacy,
  description: TRUST_PRIVACY_PAGE.intro,
  canonicalPath: ROUTES.privacy,
  dateModified: TRUST_PRIVACY_PAGE.updatedAt,
})
</script>
