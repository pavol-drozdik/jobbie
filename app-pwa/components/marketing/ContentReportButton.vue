<script setup lang="ts">
import type { ContentReportTargetType } from '~/composables/useContentReport'
import ContentReportMenu from '~/components/marketing/ContentReportMenu.vue'

/** @deprecated Prefer ContentReportMenu on public detail pages. */
defineProps<{
  targetType: ContentReportTargetType
  targetId: string
  label?: string
}>()
</script>

<template>
  <ContentReportMenu
    :target-type="targetType"
    :target-id="targetId"
    :report-label="label"
  />
</template>
