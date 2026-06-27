<template>
  <component
    :is="wrapperTag"
    :class="wrapperClass"
  >
    <div class="mb-2 flex items-center gap-3">
      <component
        :is="avatarLinkTag"
        v-bind="avatarLinkAttrs"
        class="flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold text-white no-underline"
        :class="variant === 'panel' ? 'size-11 text-[15px]' : 'size-10 text-sm'"
        :style="avatarImageSrc ? undefined : { backgroundColor: avatarColor }"
      >
        <img
          v-if="avatarImageSrc"
          :src="avatarImageSrc"
          alt=""
          class="size-full object-cover"
          loading="lazy"
          decoding="async"
        >
        <span v-else>{{ initials }}</span>
      </component>
      <div class="min-w-0 flex-1">
        <component
          :is="nameLinkTag"
          v-bind="nameLinkAttrs"
          :class="nameClass"
        >
          {{ displayLabel }}
        </component>
        <span
          v-if="variant === 'panel' || (variant === 'public' && showActions)"
          class="mt-0.5 block text-[13px] text-black/40"
        >{{ dateLabel }}</span>
      </div>
      <span
        v-if="variant === 'public' && !showActions"
        class="shrink-0 text-sm text-black/35"
      >{{ dateLabel }}</span>
      <details
        v-if="showActions"
        ref="moreDetailsRef"
        class="relative shrink-0"
      >
        <summary
          class="inline-flex size-9 is-clickable list-none items-center justify-center rounded-full border border-black/10 bg-white text-black/55 hover:bg-neutral-50 hover:text-black/75 [&::-webkit-details-marker]:hidden"
        >
          <span class="sr-only">{{ S.profileReviewMoreOptions }}</span>
          <span
            aria-hidden="true"
            class="select-none text-[1.05rem] leading-none tracking-[-0.1em] text-black/40"
          >⋮</span>
        </summary>
        <div
          class="absolute right-0 top-[calc(100%+6px)] z-20 min-w-[11rem] overflow-hidden rounded-xl border border-black/[0.08] bg-white py-1 shadow-md"
        >
          <button
            type="button"
            class="flex w-full is-clickable px-4 py-2.5 text-left text-[14px] font-semibold text-black/80 hover:bg-black/[0.04]"
            @click="onEditClick"
          >
            {{ S.profileReviewEditAction }}
          </button>
          <button
            type="button"
            class="flex w-full is-clickable px-4 py-2.5 text-left text-[14px] font-semibold text-red-700 hover:bg-red-50"
            @click="onDeleteClick"
          >
            {{ S.firmyReviewDeleteTitle }}
          </button>
        </div>
      </details>
      <div
        v-if="variant === 'panel'"
        class="flex shrink-0 items-center gap-1 rounded-full bg-marketing-panel px-2.5 py-1"
        :aria-label="`${review.rating} z 5`"
      >
        <AppIcon name="star" :size="12" class="text-marketing-green" />
        <span class="text-[14px] font-bold text-marketing-green">{{ review.rating }}</span>
      </div>
    </div>
    <div class="mb-2 flex gap-0.5" aria-hidden="true">
      <span
        v-for="i in 5"
        :key="`rs-${review.id}-${i}`"
        class="leading-none"
        :class="[
          variant === 'panel' ? 'text-[14px]' : 'text-sm',
          i <= Math.round(review.rating) ? 'text-marketing-green' : 'text-black/15',
        ]"
      >★</span>
    </div>
    <p
      v-if="review.comment?.trim()"
      class="m-0 leading-relaxed text-black/[0.68]"
      :class="variant === 'panel' ? 'text-[16px]' : 'text-base font-normal'"
    >{{ review.comment }}</p>
    <p
      v-else-if="variant === 'panel'"
      class="m-0 text-[14px] italic text-black/35"
    >{{ S.profileReviewNoComment }}</p>
  </component>
</template>

<script setup lang="ts">
import { ROUTES } from '~/utils/app-routes'
import { S } from '~/utils/strings'
import { CHAT_AVATAR_PALETTE } from '~/utils/avatar-palette'
import { employerInitials } from '~/utils/job'
import type { ProfileReviewRow } from '~/components/profile/PublicProfileCard.vue'
import type { CurrentProfile } from '~/composables/useAuth'

const REVIEWER_PALETTE = CHAT_AVATAR_PALETTE

function displayNameFromAuthProfile(p: CurrentProfile | null): string | null {
  if (!p) return null
  const dn = p.display_name?.trim()
  if (dn) return dn
  const full = [p.first_name, p.last_name].filter(Boolean).join(' ').trim()
  if (full) return full
  return p.company_name?.trim() || null
}

function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i += 1) {
    h = (h << 5) - h + s.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

const props = withDefaults(
  defineProps<{
    review: ProfileReviewRow
    dateLabel: string
    variant?: 'public' | 'panel'
    showActions?: boolean
  }>(),
  { variant: 'public', showActions: false },
)

const emit = defineEmits<{
  edit: []
  delete: []
}>()

const moreDetailsRef = ref<HTMLDetailsElement | null>(null)

const { user, profile } = useAuth()

function closeMenu(): void {
  if (moreDetailsRef.value) {
    moreDetailsRef.value.open = false
  }
}

function onEditClick(): void {
  closeMenu()
  emit('edit')
}

function onDeleteClick(): void {
  closeMenu()
  emit('delete')
}

const resolvedReviewerName = computed((): string | null => {
  const fromApi = props.review.reviewer_display_name?.trim()
  if (fromApi) return fromApi
  if (user.value?.id === props.review.reviewer_id) {
    return displayNameFromAuthProfile(profile.value)
  }
  return null
})

const displayLabel = computed(() => {
  return resolvedReviewerName.value || S.profileReviewAnonymousReviewer
})

const canLinkToProfile = computed(
  () =>
    Boolean(resolvedReviewerName.value) &&
    props.review.reviewer_public_profile_enabled !== false &&
    Boolean(props.review.reviewer_id),
)

const profileHref = computed(() => ROUTES.publicProfile(props.review.reviewer_id))

const avatarImageSrc = computed((): string => {
  const r = props.review
  if (r.reviewer_role === 'company') {
    return r.reviewer_logo_url?.trim() || r.reviewer_avatar_url?.trim() || ''
  }
  return r.reviewer_avatar_url?.trim() || r.reviewer_logo_url?.trim() || ''
})

const initials = computed(() => employerInitials(displayLabel.value))

const avatarColor = computed(
  () => REVIEWER_PALETTE[hashStr(props.review.reviewer_id) % REVIEWER_PALETTE.length],
)

const wrapperTag = computed(() => (props.variant === 'panel' ? 'li' : 'div'))
const wrapperClass = computed(() =>
  props.variant === 'panel'
    ? 'rounded-2xl bg-marketing-surface px-5 py-5 max-[480px]:px-4'
    : 'border-b border-black/[0.06] py-5 first:pt-0 last:border-b-0 last:pb-0',
)

const nameClass = computed(() => {
  const base =
    props.variant === 'panel'
      ? 'm-0 truncate text-[16px] font-bold text-black'
      : 'min-w-0 flex-1 truncate text-base font-bold text-black'
  if (canLinkToProfile.value) {
    return `${base} text-marketing-green no-underline hover:underline`
  }
  return base
})

const nameLinkTag = computed(() => (canLinkToProfile.value ? 'NuxtLink' : 'span'))
const nameLinkAttrs = computed(() =>
  canLinkToProfile.value
    ? { to: profileHref.value, 'aria-label': S.profileReviewViewProfile }
    : {},
)

const avatarLinkTag = computed(() => (canLinkToProfile.value ? 'NuxtLink' : 'div'))
const avatarLinkAttrs = computed(() =>
  canLinkToProfile.value
    ? { to: profileHref.value, 'aria-label': S.profileReviewViewProfile }
    : {},
)
</script>
