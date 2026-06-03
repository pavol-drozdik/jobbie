<template>
  <div class="mx-auto max-w-md px-4 py-12 font-dmSans text-center">
    <h1 class="mb-3 text-2xl font-extrabold text-gray-900">{{ S.unsubscribeTitle }}</h1>
    <p v-if="working" class="text-sm text-gray-600">{{ S.loading }}</p>
    <template v-else>
      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
      <p v-else class="text-sm text-gray-700">{{ S.unsubscribeDone }}</p>
    </template>
  </div>
</template>

<script setup lang="ts">
// Token-based public route — api() uses skipSessionExpiry so 401 does not force logout.
import { S } from '~/utils/strings'

definePageMeta({ layout: 'default', ssr: false })

const VALID: readonly string[] = [
  'messages',
  'applications',
  'marketing',
  'digest',
  'job_updates',
  'job_email_alerts',
  'payments',
  'reviews',
]

const route = useRoute()
const config = useRuntimeConfig()
const token = computed(() => String(route.params.token ?? ''))
const category = computed(() => {
  const q = String(route.query.category ?? 'marketing').trim()
  return VALID.includes(q) ? q : 'marketing'
})

const working = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    const base = config.public.apiBaseUrl.replace(/\/$/, '')
    const res = await fetch(
      `${base}/api/public/notification-preferences/unsubscribe?token=${encodeURIComponent(token.value)}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: category.value }),
      },
    )
    if (!res.ok) {
      error.value = S.preferencesTokenInvalid
    }
  } catch {
    error.value = S.preferencesTokenInvalid
  } finally {
    working.value = false
  }
})
</script>
