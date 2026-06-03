<script setup lang="ts">
import { ROUTES } from '~/utils/app-routes'
import { S } from '~/utils/strings'

definePageMeta({ layout: 'app', middleware: ['auth'] })

const route = useRoute()
const id = computed(() => String(route.params.id ?? ''))

await navigateTo(
  { path: ROUTES.jobWizard(id.value) },
  { replace: true },
)
</script>

<template>
  <p class="p-8 font-dmSans text-black/60">{{ S.loading }}</p>
</template>
