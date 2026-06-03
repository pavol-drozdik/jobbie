<template>
  <div
    v-if="authLoading"
    class="flex min-h-[40vh] items-center justify-center px-5 py-20 font-dmSans text-black/50"
  >
    {{ S.loading }}
  </div>
  <LoggedOutFeatureHero
    v-else-if="!user"
    :title="S.navCvBuilderTitle"
    :description="S.navCvBuilderDescription"
    :benefits="[
      'Profesionálne šablóny životopisu',
      'Náhľad a úpravy kedykoľvek',
      'Zverejnenie pre zamestnávateľov na Jobbie',
    ]"
    image-src="/img/feature-job-search.webp"
    image-alt="Tvorba životopisu"
    :redirect-path="redirectPath"
  />
  <CvCreateWizard v-else :cv-id="cvId" />
</template>

<script setup lang="ts">
import { ROUTES } from '~/utils/app-routes'
import { S } from '~/utils/strings'
import LoggedOutFeatureHero from '~/components/marketing/LoggedOutFeatureHero.vue'

definePageMeta({ layout: 'app', middleware: ['worker-only'] })

const route = useRoute()
const redirectPath = computed(() => route.fullPath || ROUTES.cvHub)
const { user, loading: authLoading } = useAuth()
const cvId = computed(() => String(route.params.cvId || ''))
</script>
