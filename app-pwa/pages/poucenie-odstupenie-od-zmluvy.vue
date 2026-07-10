<template>
  <MarketingContentPage :page="WITHDRAWAL_RIGHTS_NOTICE_PAGE" />
</template>

<script setup lang="ts">
import MarketingContentPage from '~/components/marketing/MarketingContentPage.vue'
import { ROUTES } from '~/utils/app-routes'
import { WITHDRAWAL_RIGHTS_NOTICE_PAGE } from '~/utils/withdrawal-rights-notice-content'

definePageMeta({ layout: 'app', layoutMainFlushTop: true })

usePageSeo({
  title: WITHDRAWAL_RIGHTS_NOTICE_PAGE.title,
  description: WITHDRAWAL_RIGHTS_NOTICE_PAGE.intro,
  canonicalPath: ROUTES.withdrawalRightsNotice,
  dateModified: WITHDRAWAL_RIGHTS_NOTICE_PAGE.updatedAt,
})
</script>
