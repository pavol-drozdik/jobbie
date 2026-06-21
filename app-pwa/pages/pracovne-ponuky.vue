<template>
  <FindJobsCatalogPage
    :key="'domestic'"
    :is-foreign="false"
    :page-title="S.jobOffers"
    :seo-title="S.seoCatalogJobsTitle"
  />
</template>

<script setup lang="ts">
import { S } from '~/utils/strings'
import FindJobsCatalogPage from '~/components/find/FindJobsCatalogPage.vue'

definePageMeta({ layout: 'app' })
</script>
