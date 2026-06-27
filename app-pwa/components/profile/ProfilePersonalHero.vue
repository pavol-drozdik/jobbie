<template>
  <!-- profile-card: design uses lighter shadow than .p-card -->
  <div
    class="overflow-hidden rounded-[20px] bg-white shadow-[0_0_12px_rgba(0,0,0,0.07)]"
  >
    <!-- profile-card-banner -->
    <div
      class="relative h-[140px] bg-[linear-gradient(155deg,rgb(21,128,61)_0%,rgb(34,197,94)_100%)]"
      aria-hidden="true"
    >
      <div
        class="pointer-events-none absolute -right-10 -top-[60px] h-[200px] w-[200px] rounded-full bg-white/[0.08]"
      />
    </div>
    <!-- profile-card-body -->
    <div class="relative z-[3] px-7 pb-[26px] pt-0">
      <!-- profile-card-avatar-row -->
      <div class="-mt-[36px] mb-[14px] flex flex-wrap items-end justify-between gap-3">
        <div
          class="flex h-[84px] w-[84px] shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-marketing-green font-dmSans text-[28px] font-bold text-white shadow-card"
        >
          <img
            v-if="avatarSrc"
            :src="avatarSrc"
            alt=""
            class="h-full w-full object-cover"
          >
          <span v-else>{{ initials(titleName) }}</span>
        </div>
        <slot name="actions" />
      </div>
      <template v-if="isCompany">
        <div class="profile-card-name-row mb-2 flex flex-wrap items-center gap-2.5">
          <h2 class="font-dmSans text-[26px] font-extrabold leading-none text-black">
            {{ titleName }}
          </h2>
          <!-- verified-badge style (Firma) -->
          <span
            class="inline-flex shrink-0 items-center gap-1 rounded-full bg-marketing-panel px-3 py-1 font-dmSans text-[14px] font-bold text-marketing-green"
          >
            <AppIcon name="building" :size="14" class="text-marketing-green" />
            {{ S.roleCompany }}
          </span>
          <span
            v-if="detail?.profile.registry_verified"
            class="inline-flex shrink-0 items-center gap-1 rounded-full bg-marketing-panel px-3 py-1 font-dmSans text-[14px] font-bold text-marketing-green"
            :title="S.badgeRegistryVerifiedTitle"
          >
            <AppIcon name="check-circle" :size="14" class="text-marketing-green" />
            {{ S.badgeRegistryVerified }}
          </span>
        </div>
        <div v-if="sectorPill" class="mb-2.5 flex flex-wrap gap-2">
          <span
            class="info-pill inline-flex items-center gap-1.5 rounded-full bg-marketing-surface px-3.5 py-1.5 font-dmSans text-[15px] font-medium text-black/60"
          >
            <AppIcon name="briefcase" :size="12" class="text-marketing-green" />
            {{ sectorPill }}
          </span>
        </div>
        <div
          v-if="officeLine"
          class="profile-card-meta mb-4 flex flex-wrap items-center gap-[18px] font-dmSans text-base font-medium text-black/50"
        >
          <span class="inline-flex items-center gap-1.5">
            <AppIcon name="map-pin" :size="14" class="text-marketing-green" />
            {{ officeLine }}
          </span>
        </div>
        <p
          class="profile-card-bio mb-4 font-dmSans text-[17px] font-normal leading-[1.6] text-black/65"
          :class="{ 'italic !text-black/25': !bioText }"
        >
          {{ bioText || S.profileHeroCompanyBioEmpty }}
        </p>
      </template>
      <template v-else>
        <div class="profile-card-name-row mb-2 flex flex-wrap items-center gap-2.5">
          <h2 class="font-dmSans text-[26px] font-extrabold leading-none text-black">
            {{ titleName }}
          </h2>
        </div>
        <div
          class="profile-card-meta mb-4 flex flex-wrap items-center gap-[18px] font-dmSans text-base font-medium text-black/50"
        >
          <div class="profile-card-stars inline-flex items-center gap-1">
            <AppIcon
              v-for="i in 5"
              :key="i"
              name="star"
              :size="15"
              :class="i <= starsFilled ? 'text-marketing-green' : 'text-black/15'"
            />
            <span class="stars-label ml-1 font-dmSans text-[15px] text-black/40">{{ ratingSummary }}</span>
          </div>
          <span v-if="locationLine" class="inline-flex items-center gap-1.5">
            <AppIcon name="map-pin" :size="14" class="text-marketing-green" />
            {{ locationLine }}
          </span>
        </div>
        <p
          class="profile-card-bio mb-4 font-dmSans text-[17px] font-normal leading-[1.6] text-black/65"
          :class="{ 'italic !text-black/25': !bioText }"
        >
          {{ bioText || S.profileHeroBioEmpty }}
        </p>
        <div v-if="skillPills.length" class="pills-row mb-3 flex flex-wrap gap-2">
          <span
            v-for="pill in skillPills"
            :key="pill"
            class="info-pill inline-flex items-center gap-1.5 rounded-full bg-marketing-surface px-3.5 py-1.5 font-dmSans text-[15px] font-medium text-black/60"
          >
            {{ pill }}
          </span>
        </div>
      </template>
      <div v-if="rolePills.length" class="pills-row flex flex-wrap gap-2">
        <span
          v-for="r in rolePills"
          :key="r.key"
          class="info-pill-green inline-flex items-center gap-1.5 rounded-full bg-marketing-panel px-3.5 py-1.5 font-dmSans text-[15px] font-semibold text-marketing-green"
        >
          <AppIcon
            :name="r.icon"
            :size="12"
            class="text-marketing-green"
          />
          {{ r.label }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { S } from '~/utils/strings'
import type { ProfileDetailPayload } from '~/components/profile/PublicProfileCard.vue'
import type { AppIconName } from '~/utils/app-icons'

const props = defineProps<{
  detail: ProfileDetailPayload | null
  headerName: string
  avatarSrc: string
}>()

function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?'
}

const isCompany = computed((): boolean => props.detail?.profile.role === 'company')

const titleName = computed((): string => {
  const p = props.detail?.profile
  if (!p) return props.headerName
  if (p.role === 'company') {
    return p.company_name?.trim() || p.display_name?.trim() || props.headerName
  }
  return p.display_name?.trim() || props.headerName
})

const bioText = computed((): string | null => {
  const p = props.detail?.profile
  if (!p) return null
  if (p.role === 'company') {
    const t = (p.description ?? '').trim() || (p.bio ?? '').trim()
    return t || null
  }
  const t = (p.bio ?? '').trim()
  return t || null
})

const starsFilled = computed((): number => {
  const n = Number(props.detail?.profile.rating_average ?? 0)
  return Math.min(5, Math.max(0, Math.round(n)))
})

const ratingSummary = computed((): string => {
  const c = Number(props.detail?.profile.rating_count ?? 0)
  return S.profileHeroRatingCount.replace('{n}', String(c))
})

const locationLine = computed((): string => {
  return props.detail?.profile.location?.trim() || ''
})

const officeLine = computed((): string => {
  return props.detail?.profile.registered_office?.trim() || ''
})

const sectorPill = computed((): string => {
  return props.detail?.profile.sector?.trim() || ''
})

const skillPills = computed((): string[] => {
  const s = props.detail?.profile.skills?.trim()
  if (!s) return []
  return s.split(',').map((x) => x.trim()).filter(Boolean)
})

const rolePills = computed((): { label: string; key: string; icon: AppIconName }[] => {
  const p = props.detail?.profile
  if (!p) return []
  const out: { label: string; key: string; icon: AppIconName }[] = []
  if (p.customer_role) {
    out.push({ key: 'c', label: S.roleCustomerCard, icon: 'wrench' })
  }
  if (p.worker_role) {
    out.push({ key: 'w', label: S.roleWorkerCard, icon: 'briefcase' })
  }
  if (p.provider_role) {
    out.push({ key: 'p', label: S.roleProviderCard, icon: 'building' })
  }
  return out
})
</script>
