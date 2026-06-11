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
  <div v-else class="min-h-screen bg-marketing-mint font-dmSans text-black">
    <JobPostWizard v-if="jobId" :job-id="jobId" />
  </div>
</template>

<script setup lang="ts">
import { ROUTES } from '~/utils/app-routes'
import { S } from '~/utils/strings'
import LoggedOutFeatureHero from '~/components/marketing/LoggedOutFeatureHero.vue'

definePageMeta({ layout: 'app', middleware: ['customer-only'] })

const route = useRoute()
const redirectPath = computed(() => route.fullPath || ROUTES.jobHub)
const { user, loading: authLoading } = useAuth()
const jobId = computed(() => String(route.params.jobId || ''))
</script>
