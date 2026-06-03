<template>
  <MarketingContentPage
    v-if="page"
    :page="page"
  />
</template>

<script setup lang="ts">
import MarketingContentPage from '~/components/marketing/MarketingContentPage.vue'
import { getGuidePageByPath } from '~/utils/guide-page-content'
import { normalizeSiteUrl } from '~/utils/seo-config'
import { buildWebPageJsonLd } from '~/utils/seo-json-ld'

definePageMeta({ layout: 'app', layoutMainFlushTop: true })

const route = useRoute()
const config = useRuntimeConfig()

const page = computed(() => getGuidePageByPath(route.path))

if (import.meta.server && !page.value) {
  throw createError({ statusCode: 404, statusMessage: 'Guide not found' })
}

usePageSeo(() => {
  const p = page.value
  const site = normalizeSiteUrl(String(config.public.siteUrl || ''))
  const jsonLd =
    p && site
      ? buildWebPageJsonLd({
          siteUrl: site,
          path: p.path,
          name: p.title,
          description: p.intro,
          dateModified: p.updatedAt,
        })
      : null
  return {
    title: p?.title ?? 'Návod',
    description: p?.intro ?? '',
    canonicalPath: p?.path ?? route.path,
    dateModified: p?.updatedAt,
    jsonLd,
  }
})
</script>
