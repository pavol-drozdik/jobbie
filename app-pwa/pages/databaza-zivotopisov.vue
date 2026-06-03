<template>
  <div v-if="authLoading" class="mx-auto max-w-[1400px] px-5 py-16 text-center text-sm text-black/45">
    Načítavam…
  </div>
  <LoggedOutFeatureHero
    v-else-if="!user"
    title="Databáza životopisov"
    description="Vyhľadávaj kandidátov a prezeraj ich virtuálne životopisy. Prihlás sa ako zamestnávateľ a oslov správnych ľudí."
    :benefits="[
      'Prehľad verejných životopisov uchádzačov',
      'Filtre podľa zručností, jazykov a lokality',
      'Kontakt cez existujúcu prihlášku na tvoju ponuku',
    ]"
    image-src="/home-design/feature-employer.webp"
    image-alt="Databáza životopisov"
    :redirect-path="redirectPath"
  />
  <div
    v-else-if="!isCompany"
    class="mx-auto mt-[30px] max-w-[640px] px-5 pb-20 font-dmSans"
  >
    <div class="rounded-[20px] bg-white px-6 py-10 shadow-[0_0_12px_rgba(0,0,0,0.08)]">
      <h1 class="m-0 text-[22px] font-extrabold text-black">Nemáte oprávnenie</h1>
      <p class="mt-3 text-[15px] leading-relaxed text-black/65">
        Túto sekciu môžu používať len účty zamestnávateľa. Ak hľadáte prácu, prezrite si dostupné ponuky v aplikácii.
      </p>
    </div>
  </div>
  <CvDatabasePage v-else />
</template>

<script setup lang="ts">
import LoggedOutFeatureHero from '~/components/marketing/LoggedOutFeatureHero.vue'
import CvDatabasePage from '~/components/cv-database/CvDatabasePage.vue'
import { ROUTES } from '~/utils/app-routes'

definePageMeta({
  layout: 'app',
})

usePageSeo({
  title: 'Databáza životopisov',
  description:
    'Prehľadávajte životopisy uchádzačov podľa zručností a lokality. Pre zamestnávateľov na platforme JOBBIE.',
  canonicalPath: '/databaza-zivotopisov',
  noindex: true,
})

const route = useRoute()
const { user, profile, loading: authLoading } = useAuth()

const redirectPath = computed(() => (route.fullPath || '/databaza-zivotopisov').toString())

const isCompany = computed(() => {
  const r = profile.value?.role ?? user.value?.role
  return r === 'company'
})
</script>
