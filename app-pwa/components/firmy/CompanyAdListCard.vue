<template>

  <NuxtLink

    :to="ROUTES.professionalDetail(ad.id)"

    class="block min-w-0 overflow-hidden rounded-[15px] bg-marketing-surface no-underline shadow-[0px_0px_4px_0px_rgba(0,0,0,0.2)]"

  >

    <div class="relative aspect-[4/3]">

      <NuxtImg
        v-if="thumb"
        :src="thumb"
        :alt="ad.title"
        width="400"
        height="300"
        class="h-full w-full rounded-t-[15px] object-cover"
        loading="lazy"
        decoding="async"
        format="webp"
        quality="82"
      />

      <div v-else class="flex h-full w-full items-center justify-center rounded-t-[15px] bg-marketing-soft">

        <AppIcon name="building" :size="48" class="text-black/25" />

      </div>

      <div

        class="absolute left-2.5 top-2.5 inline-flex max-w-[calc(100%-5rem)] items-center gap-1.5 rounded-full bg-[rgba(249,252,250,0.95)] px-2.5 py-1 font-dmSans text-[13px] font-semibold text-gray-900"

      >

        <CategoryIcon :category="ad.category" :size="14" icon-class="shrink-0 text-black" />

        <span class="truncate">{{ getCategoryLabel(ad.category) }}</span>

      </div>

      <CatalogListingBadgeStack

        :show-top="Boolean(ad.show_top_badge)"

        :show-new="isNewAd"

        corner-class="right-[10px] top-[10px]"

        size="md"

      />

    </div>

    <div class="min-w-0 p-5">

      <h3 class="mb-5 mt-0 min-h-10 min-w-0 break-words font-dmSans text-xl font-extrabold leading-5 text-black line-clamp-2">

        {{ ad.title }}

      </h3>

      <div class="m-0 font-dmSans text-lg font-medium text-marketing-muted">

        <div class="flex min-w-0 items-center gap-2.5">

          <AppIcon name="map-pin" :size="18" class="shrink-0 text-marketing-muted" />

          <span class="min-w-0 truncate">{{ locationLine || '—' }}</span>

        </div>

        <div class="mt-2 flex items-center gap-2.5">

          <AppIcon name="calendar" :size="18" class="shrink-0 text-marketing-muted" />

          <span>{{ availabilityLine || '—' }}</span>

        </div>

        <div class="mt-2 flex items-center gap-2.5 text-marketing-green">

          <AppIcon name="currency" :size="18" class="shrink-0 text-marketing-green" />

          <span>{{ priceLine || '—' }}</span>

        </div>

      </div>

      <div class="my-2.5 h-px w-full bg-[rgba(177,178,181,0.3)]" />

      <div class="flex items-center justify-between text-marketing-green">

        <div class="flex min-w-0 items-center gap-2">

          <div

            class="flex size-10 min-w-10 shrink-0 items-center justify-center rounded-full bg-[#7c3aed] font-dmSans text-base font-bold text-white"

          >

            {{ ownerInitials }}

          </div>

          <span class="min-w-0 truncate font-dmSans text-base font-bold leading-tight text-black">

            {{ ownerName }}

          </span>

        </div>

        <AppIcon name="arrow-right" :size="20" class="shrink-0 text-marketing-green" />

      </div>

    </div>

  </NuxtLink>

</template>



<script setup lang="ts">

import { ROUTES } from '~/utils/app-routes'

import { S } from '~/utils/strings'

import { employerInitials, getCategoryLabel, JOB_CARD_PLACEHOLDER_PATH } from '~/utils/job'

import type { CompanyAdListItem } from '~/utils/company-ad'

import {

  getCompanyAdAvailabilityDisplay,

  getCompanyAdCardLocation,

  getCompanyAdOwnerDisplayName,

  getCompanyAdPriceDisplay,

} from '~/utils/company-ad-display'



const props = defineProps<{

  ad: CompanyAdListItem

}>()



const thumb = computed(() =>

  resolvePublicImageUrl(

    props.ad.thumbnail_url ||

      props.ad.owner_logo_url ||

      props.ad.owner_avatar_url ||

      JOB_CARD_PLACEHOLDER_PATH,

  ),

)

const locationLine = computed(() => getCompanyAdCardLocation(props.ad).trim())

const priceLine = computed(() => getCompanyAdPriceDisplay(props.ad).trim())

const availabilityLine = computed(() => getCompanyAdAvailabilityDisplay(props.ad).trim())

const ownerName = computed(() => getCompanyAdOwnerDisplayName(props.ad).trim() || S.firmyAdOwnerFallback)

const ownerInitials = computed(() => employerInitials(ownerName.value))

const isNewAd = computed(() => {

  const c = props.ad.created_at

  if (!c) return false

  const created = new Date(c).getTime()

  if (Number.isNaN(created)) return false

  const days = (Date.now() - created) / (1000 * 60 * 60 * 24)

  return days <= 7

})

</script>

