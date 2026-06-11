<template>
  <div
    v-if="authLoading"
    class="flex min-h-[40vh] items-center justify-center px-5 py-20 font-dmSans text-black/50"
  >
    {{ S.loading }}
  </div>
  <LoggedOutFeatureHero
    v-else-if="!user"
    title="Pridaj svoju službu medzi profesionálov"
    description="Vytvor reklamu pre svoju firmu alebo ponúkanú službu."
    :benefits="[
      'Predstav svoju firmu alebo službu zákazníkom',
      'Získaj nové dopyty z tvojho okolia',
      'Spravuj svoju reklamu jednoducho online',
    ]"
    image-src="/home-design/feature-employer.webp"
    image-alt="Pridanie služby medzi profesionálov"
    :redirect-path="redirectPath"
  />
  <div v-else-if="!isProvider" class="min-h-screen bg-marketing-mint px-5 py-16 font-dmSans">
    <div class="mx-auto max-w-lg rounded-[20px] bg-white p-6 shadow-[0px_3px_6px_1px_rgba(0,0,0,0.1)]">
      <p class="m-0 text-sm text-black/70">{{ S.firmyProviderRequired }}</p>
      <AppButton
        variant="primary"
        size="lg"
        class="mt-4 max-w-xs"
        :to="ROUTES.settingsProfilDenied('provider')"
      >
        {{ S.firmyGoToProfile }}
      </AppButton>
    </div>
  </div>
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
import type { CompanyAd } from '~/utils/company-ad'
import { useFirmyWizardBootstrap } from '~/utils/company-ad-hub'
import { waitForAuthReady } from '~/utils/wait-for-auth'
import LoggedOutFeatureHero from '~/components/marketing/LoggedOutFeatureHero.vue'

definePageMeta({ layout: 'app', middleware: ['provider-only'] })

const route = useRoute()
const redirectPath = computed(() => route.fullPath || ROUTES.myAdsNew)
const { user, isProvider, loading: authLoading } = useAuth()
const { api } = useApi()
const wizardBootstrap = useFirmyWizardBootstrap()
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
  if (!user.value || !isProvider.value) return
  started.value = true
  try {
    const res = await api<CompanyAd>('/api/company-ads', {
      method: 'POST',
      body: {
        is_draft: true,
        title: S.firmyHubDefaultTitle,
        body: ' ',
        category: 'stavba',
      },
    })
    if (!res.ok || !res.data?.id) {
      err.value = apiErrorMessage(res.body, 'Nepodarilo sa vytvoriť reklamu.')
      started.value = false
      return
    }
    wizardBootstrap.value = res.data as CompanyAd
    await navigateTo(ROUTES.myAdWizard(res.data.id), { replace: true })
  } catch (e) {
    err.value = e instanceof Error ? e.message : 'Nepodarilo sa vytvoriť reklamu.'
    started.value = false
  }
})
</script>
