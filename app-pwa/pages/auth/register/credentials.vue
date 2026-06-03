<template>
  <div class="flex min-h-screen items-center justify-center">
    <p class="text-gray-500">{{ S.loading }}</p>
  </div>
</template>

<script setup lang="ts">
import { S } from '~/utils/strings'

definePageMeta({ layout: 'app' })

onMounted(() => {
  navigateTo('/auth/register', { replace: true })
})
</script>
