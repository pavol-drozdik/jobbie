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
  <CvCreateWizard v-else-if="cvId" :cv-id="cvId" />
  <div v-else-if="err" class="px-5 py-20 text-center font-dmSans text-red-600">
    {{ err }}
  </div>
  <div v-else class="px-5 py-20 text-center font-dmSans text-black/50">
    Pripravujem nový životopis…
  </div>
</template>

<script setup lang="ts">
import { ROUTES } from '~/utils/app-routes'
import { S } from '~/utils/strings'
import LoggedOutFeatureHero from '~/components/marketing/LoggedOutFeatureHero.vue'

definePageMeta({ layout: 'app', middleware: ['worker-only'] })

const route = useRoute()
const redirectPath = computed(() => route.fullPath || ROUTES.cvNew)
const { user, loading: authLoading } = useAuth()
const { createCv } = useCv()
const cvId = ref<string | null>(null)
const err = ref<string | null>(null)

onMounted(async () => {
  if (!user.value) {
    return
  }
  try {
    const row = await createCv({})
    cvId.value = row.id
  } catch (e) {
    err.value = e instanceof Error ? e.message : 'Nepodarilo sa vytvoriť životopis.'
  }
})
</script>
