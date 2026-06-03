<template>
  <FindJobsCatalogPage
    :key="'domestic'"
    :is-foreign="false"
    :page-title="S.jobOffers"
  />
</template>

<script setup lang="ts">
import { S } from '~/utils/strings'
import FindJobsCatalogPage from '~/components/find/FindJobsCatalogPage.vue'
import { ROUTES } from '~/utils/app-routes'

definePageMeta({ layout: 'app' })

usePageSeo({
  title: S.jobOffers,
  description: S.seoCatalogJobsDescription,
  canonicalPath: ROUTES.find,
})
</script>
