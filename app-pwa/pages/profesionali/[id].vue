<template>
  <div class="app-shell">
    <div class="frame-surface min-w-0">
      <div class="mx-auto box-border w-full min-w-0 max-w-full overflow-visible px-3.5 pb-16 pt-[30px] marketing:pb-20 sm:px-5">
        <AppDetailPageSkeleton v-if="loading" />
        <template v-else-if="ad">
          <AppBreadcrumbs :items="adBreadcrumbs" class="mb-4" />
          <PublicContentAeoSummary :facts="aeoFacts" heading="Súhrn služby" />
          <FirmyCompanyAdDetailView
            :ad="ad"
            :is-owner="isOwner"
            :has-user="hasUser"
          />
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ROUTES } from '~/utils/app-routes'
import { S } from '~/utils/strings'
import type { CompanyAd } from '~/utils/company-ad'
import { showNotFound } from '~/utils/not-found'
import { fetchPublicCompanyAd } from '~/composables/fetch-public-company-ad'
import { useProfessionalAdDetailSeo } from '~/composables/usePublicContentSeo'

definePageMeta({ layout: 'app' })

const route = useRoute()
const { user } = useAuth()

function normalizeCompanyAd(raw: CompanyAd): CompanyAd {
  return {
    ...raw,
    services: raw.services ?? [],
    specializations: raw.specializations ?? [],
    certifications: raw.certifications ?? [],
    service_areas: raw.service_areas ?? [],
    custom_service_areas: raw.custom_service_areas ?? [],
    gallery_items: raw.gallery_items ?? [],
  }
}

const id = computed(() => route.params.id as string)
const {
  data: initialAd,
  pending,
  refresh: refreshAd,
} = await useAsyncData(
  () => `company-ad-${id.value}`,
  async () => {
    const raw = await fetchPublicCompanyAd(id.value)
    return raw ? normalizeCompanyAd(raw) : null
  },
  { watch: [id] },
)

if (import.meta.server && id.value && !initialAd.value) {
  throw createError({ statusCode: 404, statusMessage: 'Company ad not found' })
}

const ad = ref<CompanyAd | null>(initialAd.value)
const loading = computed(() => pending.value && !ad.value)

const isOwner = computed(
  () => Boolean(user.value?.id && ad.value && ad.value.owner_id === user.value!.id),
)

const hasUser = computed(() => Boolean(user.value))

watch(initialAd, (value) => {
  ad.value = value
})

const { breadcrumbs: adBreadcrumbs, aeoFacts } = useProfessionalAdDetailSeo(ad, {
  fallbackTitle: S.firmyHubTitle,
})

watch(id, async () => {
  await refreshAd()
  if (!ad.value && import.meta.client) {
    showNotFound(S.firmyNotFound)
  }
})
</script>
