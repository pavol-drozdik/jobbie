<template>
  <div class="relative flex flex-col gap-3.5 overflow-visible rounded-[20px] bg-white p-7 shadow-[0_0_12px_rgba(0,0,0,0.07)]">
    <div v-if="priceDisplay">
      <div class="text-[13px] font-medium text-black/40">{{ S.firmyAdPriceLabel }}</div>
      <div class="text-[42px] font-extrabold leading-none text-marketing-green">{{ priceDisplay }}</div>
      <p v-if="ad.price_note" class="m-0 mt-0.5 text-base font-medium text-black/40">{{ ad.price_note }}</p>
    </div>
    <hr v-if="priceDisplay" class="m-0 border-0 border-t border-black/[0.07]">
    <div
      v-if="validUntilFormatted"
      class="flex items-center gap-2 text-sm font-medium text-black/50"
    >
      <AppIcon name="clock" :size="14" class="shrink-0 text-marketing-green" />
      <span>{{ S.firmyValidUntil }} <strong class="font-semibold text-black">{{ validUntilFormatted }}</strong></span>
    </div>
    <template v-if="showMessageCta">
      <div v-if="lastVisitorAction !== 'message'">
        <CompanyAdOwnerOpenChatActions :company-ad-id="ad.id" variant="primary" />
      </div>
      <div v-else class="flex items-center gap-2">
        <CompanyAdOwnerOpenChatActions
          wrapper-class="min-w-0 flex-1"
          :company-ad-id="ad.id"
          variant="primary"
        />
        <ContentReportMenu
          class="shrink-0"
          target-type="company_ad"
          :target-id="ad.id"
        />
      </div>
    </template>
    <template v-if="showPhone">
      <a
        v-if="lastVisitorAction !== 'phone'"
        :href="publicPhoneHref"
        :class="actionLinkWideClass"
      >
        <AppIcon name="smartphone" :size="18" class="shrink-0" />
        {{ publicPhone }}
      </a>
      <div v-else class="flex items-center gap-2">
        <a :href="publicPhoneHref" :class="actionLinkFlexClass">
          <AppIcon name="smartphone" :size="18" class="shrink-0" />
          {{ publicPhone }}
        </a>
        <ContentReportMenu
          class="shrink-0"
          target-type="company_ad"
          :target-id="ad.id"
        />
      </div>
    </template>
    <template v-if="showEmail">
      <a
        v-if="lastVisitorAction !== 'email'"
        :href="`mailto:${publicEmail}`"
        :class="actionLinkWideClass"
      >
        <AppIcon name="send" :size="18" class="shrink-0" />
        {{ publicEmail }}
      </a>
      <div v-else class="flex items-center gap-2">
        <a :href="`mailto:${publicEmail}`" :class="actionLinkFlexClass">
          <AppIcon name="send" :size="18" class="shrink-0" />
          {{ publicEmail }}
        </a>
        <ContentReportMenu
          class="shrink-0"
          target-type="company_ad"
          :target-id="ad.id"
        />
      </div>
    </template>
    <template v-if="showWebsite">
      <a
        v-if="lastVisitorAction !== 'website'"
        :href="publicWebsite"
        target="_blank"
        rel="noopener noreferrer"
        :class="websiteLinkWideClass"
      >{{ S.website }}</a>
      <div v-else class="flex items-center gap-2">
        <a
          :href="publicWebsite"
          target="_blank"
          rel="noopener noreferrer"
          :class="websiteLinkFlexClass"
        >{{ S.website }}</a>
        <ContentReportMenu
          class="shrink-0"
          target-type="company_ad"
          :target-id="ad.id"
        />
      </div>
    </template>
    <NuxtLink
      v-if="isOwner"
      :to="ROUTES.myAdWizard(ad.id)"
      class="flex h-12 w-full items-center justify-center rounded-full border-[1.5px] border-gray-200 bg-marketing-surface text-[15px] font-bold text-black/60 no-underline transition-colors hover:border-marketing-green hover:text-marketing-green"
    >{{ S.firmyEdit }} →</NuxtLink>
    <div v-if="lastVisitorAction === null && !isOwner" class="flex justify-end">
      <ContentReportMenu target-type="company_ad" :target-id="ad.id" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ROUTES } from '~/utils/app-routes'
import { S } from '~/utils/strings'
import { normalizeWebsiteHref } from '~/utils/safe-navigation'
import type { CompanyAd } from '~/utils/company-ad'
import { getCompanyAdPriceDisplay } from '~/utils/company-ad-display'
import CompanyAdOwnerOpenChatActions from '~/components/firmy/CompanyAdOwnerOpenChatActions.vue'
import ContentReportMenu from '~/components/marketing/ContentReportMenu.vue'

type VisitorAction = 'message' | 'phone' | 'email' | 'website'

const actionLinkWideClass =
  'flex h-12 w-full items-center justify-center gap-2 rounded-full border-[1.5px] border-gray-200 bg-white text-base font-semibold text-black/65 no-underline transition-colors hover:border-marketing-green hover:text-marketing-green'
const actionLinkFlexClass =
  'flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-full border-[1.5px] border-gray-200 bg-white text-base font-semibold text-black/65 no-underline transition-colors hover:border-marketing-green hover:text-marketing-green'
const websiteLinkWideClass =
  'flex h-12 w-full items-center justify-center rounded-full border-[1.5px] border-gray-200 bg-marketing-surface text-base font-bold text-black/60 no-underline transition-colors hover:border-marketing-green hover:text-marketing-green'
const websiteLinkFlexClass =
  'flex h-12 min-w-0 flex-1 items-center justify-center rounded-full border-[1.5px] border-gray-200 bg-marketing-surface text-base font-bold text-black/60 no-underline transition-colors hover:border-marketing-green hover:text-marketing-green'

const props = defineProps<{
  ad: CompanyAd
  isOwner: boolean
  hasUser: boolean
}>()

const priceDisplay = computed(() => getCompanyAdPriceDisplay(props.ad))
const publicEmail = computed(() => props.ad.contact_email?.trim() || '')
const publicPhone = computed(() => props.ad.contact_phone?.trim() || '')
const publicPhoneHref = computed(() => {
  const raw = publicPhone.value
  if (!raw) return ''
  const digits = raw.replace(/[^\d+]/g, '')
  return digits ? `tel:${digits}` : ''
})
const publicWebsite = computed(() => normalizeWebsiteHref(props.ad.website))
const validUntilFormatted = computed(() => {
  const e = props.ad.ends_at
  if (!e) return ''
  try {
    return new Date(e).toLocaleDateString('sk-SK', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return e
  }
})
const showMessageCta = computed(
  () => !props.isOwner && Boolean(props.ad.owner_id?.trim()),
)
const showPhone = computed(() => Boolean(publicPhone.value && publicPhoneHref.value))
const showEmail = computed(() => Boolean(publicEmail.value))
const showWebsite = computed(() => Boolean(publicWebsite.value))
const lastVisitorAction = computed((): VisitorAction | null => {
  if (props.isOwner) return null
  const actions: VisitorAction[] = []
  if (showMessageCta.value) actions.push('message')
  if (showPhone.value) actions.push('phone')
  if (showEmail.value) actions.push('email')
  if (showWebsite.value) actions.push('website')
  return actions.at(-1) ?? null
})
</script>
