<template>

  <div v-if="authLoading" class="mx-auto max-w-[1400px] px-5 py-16 text-center text-sm text-black/45">

    Načítavam…

  </div>

  <LoggedOutFeatureHero

    v-else-if="!user"

    title="Databáza životopisov"

    description="Vyhľadávaj kandidátov a prezeraj ich virtuálne životopisy. Zapni rolu „Potrebujem pomoc s prácou“ v profile a oslov správnych ľudí."

    :benefits="[

      'Prehľad verejných životopisov uchádzačov',

      'Filtre podľa zručností, jazykov a lokality',

      'Kontakt cez existujúcu prihlášku na tvoju ponuku',

    ]"

    image-src="/home-design/cv-database-illustration.png"

    image-alt="Databáza životopisov"

    :redirect-path="redirectPath"

  />

  <CvDatabasePage v-else />

</template>



<script setup lang="ts">

import LoggedOutFeatureHero from '~/components/marketing/LoggedOutFeatureHero.vue'

import CvDatabasePage from '~/components/cv-database/CvDatabasePage.vue'



definePageMeta({

  layout: 'app',

  middleware: ['customer-only'],

})



usePageSeo({

  title: 'Databáza životopisov',

  description:

    'Prehľadávajte životopisy uchádzačov podľa zručností a lokality. Pre zamestnávateľov na platforme JOBBIE.',

  canonicalPath: '/databaza-zivotopisov',

  noindex: true,

})



const route = useRoute()

const { user, loading: authLoading } = useAuth()



const redirectPath = computed(() => (route.fullPath || '/databaza-zivotopisov').toString())

</script>

