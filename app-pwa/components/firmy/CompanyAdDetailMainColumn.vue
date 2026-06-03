<template>
  <div class="flex w-full min-w-0 flex-col gap-5">
    <div class="mb-1">
      <AppBackLink :to="ROUTES.professionalsCatalog" :label="S.firmyBackToCatalog" />
    </div>
    <div class="relative aspect-[4/3] w-full min-w-0 overflow-hidden rounded-[20px] bg-marketing-panel">
      <img
        class="size-full min-h-0 min-w-0 max-w-full object-cover"
        :src="heroImageSrc"
        :alt="ad.title"
        width="1200"
        height="900"
        fetchpriority="high"
      >
      <div class="absolute left-[18px] top-[18px] flex flex-wrap gap-2">
        <div
          v-if="categoryLabel"
          class="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3.5 py-1.5 text-sm font-semibold text-black backdrop-blur-sm"
        >
          <CategoryIcon :category="ad.category" :size="13" icon-class="shrink-0 text-marketing-green" />
          {{ categoryLabel }}
        </div>
      </div>
      <div v-if="isNewAd" class="absolute right-[18px] top-[18px]">
        <div class="rounded-full bg-marketing-green px-3.5 py-1.5 text-sm font-bold text-white">Nové</div>
      </div>
    </div>
    <div class="rounded-[20px] bg-white px-6 py-6 shadow-[0_0_12px_rgba(0,0,0,0.07)] marketing:px-9 marketing:py-8">
      <h1 class="m-0 mb-2 text-[26px] font-extrabold leading-snug text-black marketing:text-4xl">{{ ad.title }}</h1>
      <p v-if="ad.tagline" class="m-0 mb-5 text-base font-medium text-black/55">{{ ad.tagline }}</p>
      <div v-else class="mb-5" />
      <div class="flex flex-wrap gap-2.5">
        <div
          v-for="(pill, idx) in metaPills"
          :key="idx"
          class="inline-flex items-center gap-1.5 rounded-full bg-marketing-soft px-4 py-2 text-[15px] font-medium text-black/70"
        >
          <AppIcon :name="pill.icon" :size="14" class="shrink-0 text-marketing-green" />
          {{ pill.text }}
        </div>
      </div>
    </div>
    <div
      v-if="showPlatformMessageCta"
      class="rounded-[20px] bg-white p-5 shadow-[0_0_12px_rgba(0,0,0,0.07)] marketing:p-7"
    >
      <CompanyAdOwnerOpenChatActions :owner-id="ad.owner_id" variant="primary" />
    </div>
    <FirmyCompanyAdSingularContactCard
      v-if="showContactCard"
      :ad="ad"
      :is-owner="isOwner"
      :has-user="hasUser"
    />
    <div class="flex flex-col gap-4 rounded-[20px] bg-white px-7 py-6 shadow-[0_0_12px_rgba(0,0,0,0.07)] sm:flex-row sm:items-center sm:gap-[18px]">
      <div
        class="flex size-[58px] min-h-[58px] min-w-[58px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-violet-600 text-xl font-bold text-white"
      >
        <img
          v-if="ownerAvatarSrc"
          :src="ownerAvatarSrc"
          alt=""
          class="size-full object-cover"
        >
        <span v-else>{{ employerInitials(ownerName || S.firmyAdOwnerFallback) }}</span>
      </div>
      <div class="min-w-0 flex-1">
        <div class="mb-0.5 text-[13px] font-medium text-black/40">{{ S.firmyAdPostedBy }}</div>
        <div class="mb-1 text-[19px] font-bold text-black">{{ ownerName || S.firmyAdOwnerFallback }}</div>
        <div
          v-if="ad.owner_registry_verified"
          class="text-sm font-semibold text-marketing-green"
        >{{ S.badgeRegistryVerified }}</div>
        <div v-else class="text-sm font-semibold text-black/50">{{ S.jobNoRatingsYet }}</div>
      </div>
      <div
        v-if="ad.owner_id"
        class="flex w-full shrink-0 flex-col gap-2 sm:w-auto"
      >
        <NuxtLink
          :to="ROUTES.publicProfile(ad.owner_id)"
          class="inline-flex w-full cursor-pointer items-center justify-center whitespace-nowrap rounded-full border-[1.5px] border-gray-200 bg-marketing-soft px-5 py-2.5 text-[15px] font-semibold text-black no-underline transition-colors hover:border-marketing-green hover:text-marketing-green sm:w-auto"
        >{{ S.firmyViewProfile }}</NuxtLink>
      </div>
    </div>
    <div
      v-if="descriptionPlain || descriptionUsesHtml"
      class="rounded-[20px] bg-white px-6 py-8 shadow-[0_0_12px_rgba(0,0,0,0.07)] marketing:px-9"
    >
      <h2 class="m-0 mb-[18px] text-[22px] font-extrabold text-black">{{ S.firmyAdBody }}</h2>
      <div
        v-if="descriptionUsesHtml"
        class="rich-html-content job-desc-html min-w-0 overflow-x-auto text-[17px] font-normal leading-[1.7] text-black/75"
        v-html="descriptionSanitized"
      />
      <div
        v-else
        class="min-w-0 whitespace-pre-wrap text-[17px] font-normal leading-[1.7] text-black/75"
      >{{ descriptionPlain }}</div>
    </div>
    <div
      v-if="ad.services.length > 0"
      class="rounded-[20px] bg-white px-6 py-8 shadow-[0_0_12px_rgba(0,0,0,0.07)] marketing:px-9"
    >
      <h2 class="m-0 mb-[18px] text-[22px] font-extrabold text-black">{{ S.firmySectionServices }}</h2>
      <ul class="m-0 flex list-none flex-wrap gap-2 p-0">
        <li
          v-for="(service, i) in ad.services"
          :key="i"
          class="rounded-full bg-marketing-soft px-4 py-2 text-[15px] font-medium text-black/70"
        >{{ service }}</li>
      </ul>
    </div>
    <div
      v-if="(ad.specializations?.length ?? 0) > 0"
      class="rounded-[20px] bg-white px-6 py-8 shadow-[0_0_12px_rgba(0,0,0,0.07)] marketing:px-9"
    >
      <h2 class="m-0 mb-[18px] text-[22px] font-extrabold text-black">{{ S.firmySpecializations }}</h2>
      <ul class="m-0 flex list-none flex-wrap gap-2 p-0">
        <li
          v-for="(item, i) in ad.specializations"
          :key="i"
          class="rounded-full bg-marketing-soft px-4 py-2 text-[15px] font-medium text-black/70"
        >{{ item }}</li>
      </ul>
    </div>
    <div
      v-if="(ad.certifications?.length ?? 0) > 0"
      class="rounded-[20px] bg-white px-6 py-8 shadow-[0_0_12px_rgba(0,0,0,0.07)] marketing:px-9"
    >
      <h2 class="m-0 mb-[18px] text-[22px] font-extrabold text-black">{{ S.firmyCertifications }}</h2>
      <ul class="m-0 flex list-none flex-wrap gap-2 p-0">
        <li
          v-for="(item, i) in ad.certifications"
          :key="i"
          class="rounded-full bg-marketing-soft px-4 py-2 text-[15px] font-medium text-black/70"
        >{{ item }}</li>
      </ul>
    </div>
    <div
      v-if="locationDisplay || serviceAreasDisplay"
      class="rounded-[20px] bg-white px-6 py-8 shadow-[0_0_12px_rgba(0,0,0,0.07)] marketing:px-9"
    >
      <h2 class="m-0 mb-[18px] text-[22px] font-extrabold text-black">{{ S.firmySectionLocation }}</h2>
      <p v-if="locationDisplay" class="m-0 text-[17px] leading-relaxed text-black/75">{{ locationDisplay }}</p>
      <p
        v-if="serviceAreasDisplay"
        class="m-0 text-[17px] leading-relaxed text-black/75"
        :class="locationDisplay ? 'mt-2' : ''"
      >{{ serviceAreasDisplay }}</p>
    </div>
    <div
      v-if="hasContactBlock"
      class="rounded-[20px] bg-white px-6 py-8 shadow-[0_0_12px_rgba(0,0,0,0.07)] marketing:px-9"
    >
      <h2 class="m-0 mb-[18px] text-[22px] font-extrabold text-black">{{ S.firmySectionContact }}</h2>
      <dl class="m-0 flex flex-col gap-3 text-base text-black/70">
        <div v-if="contactPerson" class="flex flex-wrap gap-x-2">
          <dt class="m-0 font-semibold text-black/55">{{ S.firmyContactPerson }}</dt>
          <dd class="m-0">{{ contactPerson }}</dd>
        </div>
        <div v-if="publicEmail" class="flex flex-wrap gap-x-2">
          <dt class="m-0 font-semibold text-black/55">{{ S.firmyContactEmail }}</dt>
          <dd class="m-0">
            <a :href="`mailto:${publicEmail}`" class="font-medium text-marketing-green no-underline hover:underline">{{ publicEmail }}</a>
          </dd>
        </div>
        <div v-if="publicPhone" class="flex flex-wrap gap-x-2">
          <dt class="m-0 font-semibold text-black/55">{{ S.firmyContactPhone }}</dt>
          <dd class="m-0">
            <a :href="publicPhoneHref" class="font-medium text-marketing-green no-underline hover:underline">{{ publicPhone }}</a>
          </dd>
        </div>
      </dl>
    </div>
    <div
      v-if="galleryItems.length > 0"
      class="rounded-[20px] bg-white px-6 py-8 shadow-[0_0_12px_rgba(0,0,0,0.07)] marketing:px-9"
    >
      <h2 class="m-0 mb-[18px] text-[22px] font-extrabold text-black">{{ S.jobGalleryTitle }}</h2>
      <div class="flex flex-col gap-3">
        <div class="aspect-[4/3] w-full min-w-0 overflow-hidden rounded-[14px] bg-marketing-soft">
          <img
            :key="gallerySelectedIndex"
            :src="galleryItems[gallerySelectedIndex]?.url"
            :alt="galleryItems[gallerySelectedIndex]?.caption || ad.title"
            class="size-full min-h-0 min-w-0 max-w-full object-cover"
            width="800"
            height="600"
            loading="lazy"
            decoding="async"
          >
        </div>
        <div v-if="galleryItems.length > 1" class="flex min-w-0 gap-2.5">
          <button
            v-for="(item, i) in galleryItems"
            :key="i"
            type="button"
            class="relative aspect-[4/3] w-20 shrink-0 cursor-pointer overflow-hidden rounded-[10px] border-[2.5px] border-transparent transition-all hover:opacity-85"
            :class="i === gallerySelectedIndex ? 'border-marketing-green opacity-100' : 'opacity-60'"
            :aria-label="`${S.jobGalleryTitle} ${i + 1}`"
            @click="emit('selectGallery', i)"
          >
            <img
              :src="item.url"
              :alt="item.caption || ad.title"
              class="size-full min-h-0 min-w-0 max-w-full object-cover"
              width="80"
              height="60"
              loading="lazy"
              decoding="async"
            >
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ROUTES } from '~/utils/app-routes'
import { S } from '~/utils/strings'
import { employerInitials } from '~/utils/job'
import type { CompanyAd, CompanyAdGalleryItem } from '~/utils/company-ad'
import { type AppIconName } from '~/utils/app-icons'
import CompanyAdOwnerOpenChatActions from '~/components/firmy/CompanyAdOwnerOpenChatActions.vue'
const props = defineProps<{
  ad: CompanyAd
  isOwner: boolean
  hasUser: boolean
  heroImageSrc: string
  categoryLabel: string
  isNewAd: boolean
  metaPills: { icon: AppIconName; text: string }[]
  ownerName: string
  ownerAvatarSrc: string
  galleryItems: CompanyAdGalleryItem[]
  gallerySelectedIndex: number
  descriptionUsesHtml: boolean
  descriptionSanitized: string
  descriptionPlain: string
  locationDisplay: string
  serviceAreasDisplay: string
  contactPerson: string
  publicEmail: string
  publicPhone: string
  publicPhoneHref: string
  hasContactBlock: boolean
  showContactCard?: boolean
}>()

const showPlatformMessageCta = computed(
  () => !props.isOwner && Boolean(props.ad.owner_id?.trim()),
)

const emit = defineEmits<{
  selectGallery: [index: number]
}>()
</script>
