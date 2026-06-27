<template>
  <div
    v-if="authLoading"
    class="flex min-h-[40vh] items-center justify-center px-5 py-20 font-dmSans text-black/50"
  >
    {{ S.loading }}
  </div>
  <LoggedOutFeatureHero
    v-else-if="!user"
    title="Vytvor pracovnú ponuku"
    description="Pridaj pracovnú ponuku a oslov vhodných kandidátov."
    :benefits="[
      'Rýchle vytvorenie pracovnej ponuky',
      'Zobrazenie ponuky relevantným uchádzačom',
      'Jednoduchá správa inzerátu',
    ]"
    image-src="/home-design/feature-employer.webp"
    image-alt="Vytvorenie pracovnej ponuky"
    :redirect-path="redirectPath"
  />
  <div v-else-if="err" class="min-h-screen bg-marketing-mint px-5 py-20 text-center font-dmSans text-red-600">
    {{ err }}
  </div>
  <div v-else class="min-h-screen bg-marketing-mint px-5 py-20 text-center font-dmSans text-black/50">
    {{ S.loading }}
  </div>
</template>

<script setup lang="ts">
import { ROUTES } from '~/utils/app-routes'
import { S } from '~/utils/strings'
import type { Job } from '~/utils/job'
import { waitForAuthReady } from '~/utils/wait-for-auth'
import { primeJobWizardBootstrap } from '~/utils/job-post-hub'
import LoggedOutFeatureHero from '~/components/marketing/LoggedOutFeatureHero.vue'

definePageMeta({ layout: 'app', middleware: ['customer-only'] })

const route = useRoute()
const redirectPath = computed(() => route.fullPath || ROUTES.jobNew)
const { user, loading: authLoading } = useAuth()
const { api } = useApi()
const err = ref<string | null>(null)
const started = ref(false)

function apiErrorMessage(body: string | undefined, fallback: string): string {
  if (!body) return fallback
  try {
    const parsed = JSON.parse(body) as { message?: string }
    if (typeof parsed.message === 'string' && parsed.message.trim()) {
      return parsed.message
    }
  } catch {
    /* plain text */
  }
  return body.slice(0, 240) || fallback
}

onMounted(async () => {
  if (started.value) return
  await waitForAuthReady()
  if (!user.value) {
    return
  }
  started.value = true
  try {
    const res = await api<Job>('/api/jobs', {
      method: 'POST',
      body: {
        is_draft: true,
        title: S.jobHubDefaultTitle,
      },
    })
    if (!res.ok || !res.data?.id) {
      err.value = apiErrorMessage(res.body, 'Nepodarilo sa vytvoriť inzerát.')
      started.value = false
      return
    }
    primeJobWizardBootstrap(res.data as Job)
    await navigateTo(ROUTES.jobWizard(res.data.id), { replace: true })
  } catch (e) {
    err.value = e instanceof Error ? e.message : 'Nepodarilo sa vytvoriť inzerát.'
    started.value = false
  }
})
</script>
