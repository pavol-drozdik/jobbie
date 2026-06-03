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
  <JobEmailAlertCreateWizard v-else mode="create" />
</template>

<script setup lang="ts">
import { S } from '~/utils/strings'
import JobEmailAlertCreateWizard from '~/components/job-alerts/JobEmailAlertCreateWizard.vue'
import LoggedOutFeatureHero from '~/components/marketing/LoggedOutFeatureHero.vue'

definePageMeta({ layout: 'app' })
usePageSeo({ noindex: true })

const route = useRoute()
const redirectPath = computed(() => route.fullPath || '/ponuky-na-email/novy')
const { user, loading: authLoading } = useAuth()

useHead({
  title: () => `${S.jobEmailAlertsNewAlert} · ${S.jobEmailAlertsPageTitle}`,
})
</script>
