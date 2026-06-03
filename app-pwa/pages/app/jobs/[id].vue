<script setup lang="ts">
import { ROUTES } from '~/utils/app-routes'

const route = useRoute()
const jobId = computed(() => String(route.params.id ?? ''))

await navigateTo(() => ROUTES.jobDetail(jobId.value), {
  redirectCode: 301,
  replace: true,
})
</script>

<template>
  <div />
</template>
