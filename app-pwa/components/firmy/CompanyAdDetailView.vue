<template>
  <!-- Mobile -->
  <div class="flex w-full min-w-0 flex-col gap-5 marketing:hidden">
    <FirmyCompanyAdDetailMainColumn
      :ad="ad"
      :is-owner="isOwner"
      :has-user="hasUser"
      :hero-image-src="heroImageSrc"
      :category-label="categoryLabel"
      :is-new-ad="isNewAd"
      :meta-pills="metaPills"
      :owner-name="ownerName"
      :owner-avatar-src="ownerAvatarSrc"
      :gallery-items="galleryItems"
      :gallery-selected-index="gallerySelectedIndex"
      :description-uses-html="descriptionUsesHtml"
      :description-sanitized="descriptionSanitized"
      :description-plain="descriptionPlain"
      :location-display="locationDisplay"
      :service-areas-display="serviceAreasDisplay"
      :contact-person="contactPerson"
      :public-email="publicEmail"
      :public-phone="publicPhone"
      :public-phone-href="publicPhoneHref"
      :has-contact-block="hasContactBlock"
      show-contact-card
      @select-gallery="selectGalleryThumb"
    />
  </div>
  <!-- Desktop -->
  <div
    ref="desktopShellRef"
    class="hidden w-full min-w-0 marketing:grid marketing:grid-cols-[minmax(0,1fr)_380px] marketing:items-start marketing:gap-x-9"
  >
    <FirmyCompanyAdDetailMainColumn
      class="w-full min-w-0"
      :ad="ad"
      :is-owner="isOwner"
      :has-user="hasUser"
      :hero-image-src="heroImageSrc"
      :category-label="categoryLabel"
      :is-new-ad="isNewAd"
      :meta-pills="metaPills"
      :owner-name="ownerName"
      :owner-avatar-src="ownerAvatarSrc"
      :gallery-items="galleryItems"
      :gallery-selected-index="gallerySelectedIndex"
      :description-uses-html="descriptionUsesHtml"
      :description-sanitized="descriptionSanitized"
      :description-plain="descriptionPlain"
      :location-display="locationDisplay"
      :service-areas-display="serviceAreasDisplay"
      :contact-person="contactPerson"
      :public-email="publicEmail"
      :public-phone="publicPhone"
      :public-phone-href="publicPhoneHref"
      :has-contact-block="hasContactBlock"
      :show-contact-card="false"
      @select-gallery="selectGalleryThumb"
    />
    <aside ref="desktopAsideRef" class="relative w-full min-w-0">
      <div class="flex w-full min-w-0 flex-col gap-5 marketing:mt-[40px]">
        <FirmyCompanyAdSingularContactCard
          :ad="ad"
          :is-owner="isOwner"
          :has-user="hasUser"
        />
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { getCategoryLabel, JOB_CARD_PLACEHOLDER_PATH } from '~/utils/job'
import { resolvePublicImageUrl } from '~/utils/public-image-url'
import type { CompanyAd, CompanyAdGalleryItem } from '~/utils/company-ad'
import {
  getCompanyAdAvailabilityDisplay,
  getCompanyAdCardLocation,
  getCompanyAdLocationDisplay,
  getCompanyAdOwnerAvatarUrl,
  getCompanyAdOwnerDisplayName,
  getCompanyAdPriceDisplay,
  getCompanyAdServiceAreasFullDisplay,
} from '~/utils/company-ad-display'
import { type AppIconName } from '~/utils/app-icons'
import { S } from '~/utils/strings'
import {
  jobDescriptionLooksLikeHtml,
  sanitizeJobDescriptionForDisplay,
} from '~/utils/sanitize-job-description-html'

const props = defineProps<{
  ad: CompanyAd
  isOwner: boolean
  hasUser: boolean
}>()

const desktopShellRef = ref<HTMLElement | null>(null)
const desktopAsideRef = ref<HTMLElement | null>(null)
useCvPrototypeStickySidebar(desktopAsideRef, desktopShellRef, {
  mobileBreakpoint: 900,
  offset: 100,
})

const gallerySelectedIndex = ref(0)

const categoryLabel = computed(() => {
  const c = props.ad.category
  if (!c) return ''
  return getCategoryLabel(c)
})

const isNewAd = computed(() => {
  const c = props.ad.created_at
  if (!c) return false
  const created = new Date(c).getTime()
  if (Number.isNaN(created)) return false
  const days = (Date.now() - created) / (1000 * 60 * 60 * 24)
  return days <= 7
})

const heroImageSrc = computed(() =>
  resolvePublicImageUrl(props.ad.thumbnail_url?.trim() || JOB_CARD_PLACEHOLDER_PATH),
)

const ownerName = computed(() => getCompanyAdOwnerDisplayName(props.ad))

const ownerAvatarSrc = computed(() => {
  const raw = getCompanyAdOwnerAvatarUrl(props.ad)
  return raw ? resolvePublicImageUrl(raw) : ''
})

const metaPills = computed((): { icon: AppIconName; text: string }[] => {
  const pills: { icon: AppIconName; text: string }[] = []
  const loc = getCompanyAdCardLocation(props.ad).trim()
  if (loc && loc !== '—') pills.push({ icon: 'map-pin', text: loc })
  const avail = getCompanyAdAvailabilityDisplay(props.ad)
  if (avail) pills.push({ icon: 'calendar', text: avail })
  const price = getCompanyAdPriceDisplay(props.ad)
  if (price) pills.push({ icon: 'currency', text: price })
  if (props.ad.works_weekends) pills.push({ icon: 'calendar', text: S.firmyWorksWeekends })
  if (props.ad.evening_hours) pills.push({ icon: 'clock', text: S.firmyEveningHours })
  if (props.ad.emergency_service) pills.push({ icon: 'bolt', text: S.firmyEmergency })
  return pills
})

const galleryItems = computed((): CompanyAdGalleryItem[] => props.ad.gallery_items ?? [])

const locationDisplay = computed(() => getCompanyAdLocationDisplay(props.ad))

const serviceAreasDisplay = computed(() => getCompanyAdServiceAreasFullDisplay(props.ad))

const contactPerson = computed(() => props.ad.contact_person?.trim() || '')

const publicEmail = computed(() => props.ad.contact_email?.trim() || '')

const publicPhone = computed(() => props.ad.contact_phone?.trim() || '')

const publicPhoneHref = computed(() => {
  const raw = publicPhone.value
  if (!raw) return ''
  const digits = raw.replace(/[^\d+]/g, '')
  return digits ? `tel:${digits}` : ''
})

const hasContactBlock = computed(
  () => Boolean(contactPerson.value || publicEmail.value || publicPhone.value),
)

const descriptionUsesHtml = computed(() =>
  jobDescriptionLooksLikeHtml(props.ad.body ?? ''),
)

const descriptionSanitized = computed(() =>
  sanitizeJobDescriptionForDisplay(props.ad.body ?? ''),
)

const descriptionPlain = computed(() => {
  const raw = props.ad.body ?? ''
  if (!raw) return ''
  if (descriptionUsesHtml.value) {
    return raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  }
  return raw.trim()
})

function selectGalleryThumb(index: number): void {
  gallerySelectedIndex.value = index
}

watch(galleryItems, () => {
  gallerySelectedIndex.value = 0
})
</script>
