<template>
  <FindJobsCatalogPage
    :key="'foreign'"
    :is-foreign="true"
    :page-title="S.foreignJobOffers"
    :seo-title="S.seoCatalogForeignTitle"
  />
</template>

<script setup lang="ts">
import { S } from '~/utils/strings'
import FindJobsCatalogPage from '~/components/find/FindJobsCatalogPage.vue'

definePageMeta({ layout: 'app' })
</script>
