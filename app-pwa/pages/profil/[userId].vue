<!--
  Public profile by UUID. Static sibling routes (e.g. settings) live under this folder.
  take precedence; invalid segments should 404 via API when not a valid profile id.
-->
<template>
  <ProfilePublicProfileCard
    v-if="userId && !invalidId"
    :profile-id="userId"
    :initial-detail="initialDetail"
  />
</template>

<script setup lang="ts">
import { S } from '~/utils/strings'
import { showNotFound } from '~/utils/not-found'
import { ROUTES } from '~/utils/app-routes'
import { fetchPublicProfileDetail } from '~/composables/fetch-public-profile'

definePageMeta({ layout: 'app' })

const route = useRoute()

const uuidRe =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const userId = computed(() => {
  const raw = route.params.userId
  return typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : ''
})

const invalidId = computed(() => Boolean(userId.value && !uuidRe.test(userId.value)))

watch(
  invalidId,
  (bad) => {
    if (bad) showNotFound(S.profileInvalidId)
  },
  { immediate: true },
)

const { data: initialDetail } = await useAsyncData(
  () => `public-profile-detail-${userId.value}`,
  () =>
    userId.value && !invalidId.value
      ? fetchPublicProfileDetail(userId.value)
      : Promise.resolve(null),
  { watch: [userId, invalidId] },
)

if (import.meta.server && userId.value && !invalidId.value && !initialDetail.value) {
  throw createError({ statusCode: 404, statusMessage: 'Profile not found' })
}

const profileSeoTitle = computed(() => {
  const p = initialDetail.value?.profile
  if (!p) return 'Profil'
  if (p.role === 'company') {
    return p.company_name?.trim() || p.display_name?.trim() || 'Profil firmy'
  }
  return p.display_name?.trim() || 'Profil'
})

const profileSeoDescription = computed(() => {
  const p = initialDetail.value?.profile
  const text = p?.bio?.trim() || p?.description?.trim()
  if (text) return text.slice(0, 320)
  return 'Verejný profil na platforme JOBBIE.'
})

usePageSeo(() => ({
  title: profileSeoTitle.value,
  description: profileSeoDescription.value,
  canonicalPath: ROUTES.publicProfile(userId.value),
  indexable: Boolean(initialDetail.value),
  noindex: !initialDetail.value,
}))
</script>
