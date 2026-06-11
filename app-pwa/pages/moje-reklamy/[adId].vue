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
  <CompanyAdWizard v-else-if="adId" :ad-id="adId" @saved="onSaved" />
</template>

<script setup lang="ts">
import { ROUTES } from '~/utils/app-routes'
import { S } from '~/utils/strings'
import type { CompanyAd } from '~/utils/company-ad'
import CompanyAdWizard from '~/components/firmy/CompanyAdWizard.vue'
import LoggedOutFeatureHero from '~/components/marketing/LoggedOutFeatureHero.vue'

definePageMeta({ layout: 'app', middleware: ['provider-only'] })

const route = useRoute()
const redirectPath = computed(() => route.fullPath || ROUTES.myAds)
const { user, isProvider, loading: authLoading } = useAuth()

const adId = computed(() => String(route.params.adId ?? ''))

async function onSaved(ad: CompanyAd, published: boolean): Promise<void> {
  if (published) {
    await navigateTo(ROUTES.professionalDetail(ad.id))
  } else {
    await navigateTo(ROUTES.myAds)
  }
}
</script>
