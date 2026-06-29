<template>
  <div
    v-if="authLoading"
    class="flex min-h-[40vh] items-center justify-center px-5 py-20 font-dmSans text-black/50"
  >
    {{ S.loading }}
  </div>
  <LoggedOutFeatureHero
    v-else-if="!user"
    title="Vytvoriť zahraničnú pracovnú ponuku"
    description="Pridaj zahraničnú pracovnú ponuku a oslov vhodných kandidátov."
    :benefits="[
      'Rýchle vytvorenie zahraničnej ponuky',
      'Zobrazenie ponuky relevantným uchádzačom',
      'Jednoduchá správa inzerátu',
    ]"
    image-src="/home-design/feature-employer.webp"
    image-alt="Vytvorenie zahraničnej pracovnej ponuky"
    :redirect-path="redirectPath"
  />
  <JobPostWizard
    v-else-if="canEditJob"
    :key="jobId"
    :job-id="jobId"
    variant="foreign"
    :hub-route="ROUTES.foreignJobHub"
    :hub-back-label="S.foreignJobHubBackToHub"
    :wizard-page-title="S.foreignAddJobPageTitle"
  />
</template>

<script setup lang="ts">
import { ROUTES } from '~/utils/app-routes'
import { S } from '~/utils/strings'
import LoggedOutFeatureHero from '~/components/marketing/LoggedOutFeatureHero.vue'
import { isReservedJobWizardSegment } from '~/utils/job-post-hub'

definePageMeta({ layout: 'app', middleware: ['customer-only'] })

const route = useRoute()
const redirectPath = computed(() => route.fullPath || ROUTES.foreignJobHub)
const { user, loading: authLoading } = useAuth()
const jobId = computed(() => String(route.params.jobId || ''))
const canEditJob = computed(
  () => Boolean(jobId.value) && !isReservedJobWizardSegment(jobId.value),
)

if (import.meta.client && isReservedJobWizardSegment(jobId.value)) {
  await navigateTo(ROUTES.foreignJobNew, { replace: true })
}
</script>
