<template>
  <div
    v-if="authLoading"
    class="flex min-h-[40vh] items-center justify-center px-5 py-20 font-dmSans text-black/50"
  >
    {{ S.loading }}
  </div>
  <LoggedOutFeatureHero
    v-else-if="!user"
    title="Dostávaj pracovné ponuky na email"
    :description="S.jobAlertsNavMenuDescription"
    :benefits="[
      'Nové ponuky podľa tvojich preferencií',
      'Upozornenia priamo do emailu',
      'Jednoduché zapnutie alebo vypnutie upozornení',
    ]"
    image-src="/home-design/feature-newsletter.webp"
    image-alt="Upozornenia na pracovné ponuky"
    :redirect-path="redirectPath"
  />
  <div v-else-if="loading" class="min-h-screen bg-marketing-mint px-5 py-20 text-center font-dmSans text-black/50">
    Načítavam…
  </div>
  <JobEmailAlertCreateWizard
    v-else-if="alert"
    mode="edit"
    :alert-id="alert.id"
    :initial-alert="alert"
  />
</template>

<script setup lang="ts">
import { S } from '~/utils/strings'
import { showNotFound } from '~/utils/not-found'
import JobEmailAlertCreateWizard from '~/components/job-alerts/JobEmailAlertCreateWizard.vue'
import { useJobEmailAlerts, type JobEmailAlertDto } from '~/composables/useJobEmailAlerts'
import LoggedOutFeatureHero from '~/components/marketing/LoggedOutFeatureHero.vue'

definePageMeta({ layout: 'app', middleware: ['worker-only'] })
usePageSeo({ noindex: true })

const route = useRoute()
const redirectPath = computed(() => route.fullPath || '/ponuky-na-email')
const { user, loading: authLoading } = useAuth()
const { list, loading, refresh } = useJobEmailAlerts()

const alert = computed<JobEmailAlertDto | null>(() => {
  const id = String(route.params.id ?? '')
  return list.value.find((a) => a.id === id) ?? null
})

onMounted(async () => {
  if (!user.value) {
    return
  }
  await refresh()
  if (!alert.value) {
    showNotFound(S.jobEmailAlertsWizardNotFound)
  }
})

useHead({
  title: () => S.jobEmailAlertsEditSection,
})
</script>
