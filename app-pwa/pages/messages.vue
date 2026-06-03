<script setup lang="ts">
import { ROUTES } from '~/utils/app-routes'

definePageMeta({ layout: 'app', middleware: ['auth'] })

await navigateTo(ROUTES.chat, { replace: true })
</script>

<template>
  <div />
</template>
