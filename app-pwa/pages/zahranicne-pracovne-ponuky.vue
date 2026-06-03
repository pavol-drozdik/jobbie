<template>
  <FindJobsCatalogPage
    :key="'foreign'"
    :is-foreign="true"
    :page-title="S.foreignJobOffers"
  />
</template>

<script setup lang="ts">
import { S } from '~/utils/strings'
import FindJobsCatalogPage from '~/components/find/FindJobsCatalogPage.vue'
import { ROUTES } from '~/utils/app-routes'

definePageMeta({ layout: 'app' })

usePageSeo({
  title: S.foreignJobOffers,
  description: S.seoCatalogForeignDescription,
  canonicalPath: ROUTES.foreignFind,
})
</script>
