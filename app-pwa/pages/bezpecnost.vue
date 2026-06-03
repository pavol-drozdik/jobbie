<template>
  <MarketingContentPage :page="TRUST_SECURITY_PAGE" />
</template>

<script setup lang="ts">
import MarketingContentPage from '~/components/marketing/MarketingContentPage.vue'
import { TRUST_SECURITY_PAGE } from '~/utils/trust-page-content'
import { ROUTES } from '~/utils/app-routes'
import { S } from '~/utils/strings'
import { normalizeSiteUrl } from '~/utils/seo-config'
import { buildWebPageJsonLd } from '~/utils/seo-json-ld'

definePageMeta({ layout: 'app', layoutMainFlushTop: true })

const config = useRuntimeConfig()

usePageSeo(() => {
  const site = normalizeSiteUrl(String(config.public.siteUrl || ''))
  return {
    title: S.seoSecurityPageTitle,
    description: TRUST_SECURITY_PAGE.intro,
    canonicalPath: ROUTES.security,
    dateModified: TRUST_SECURITY_PAGE.updatedAt,
    jsonLd: site
      ? buildWebPageJsonLd({
          siteUrl: site,
          path: ROUTES.security,
          name: S.seoSecurityPageTitle,
          description: TRUST_SECURITY_PAGE.intro,
          dateModified: TRUST_SECURITY_PAGE.updatedAt,
        })
      : null,
  }
})
</script>
