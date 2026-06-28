<template>
  <div>
    <div v-if="!embedded" class="section-row px-0 pt-0">
      <div class="section-title">{{ S.buyCredits }}</div>
    </div>
    <p
      v-if="successMessage"
      class="mb-3 rounded-lg border border-marketing-green/25 bg-marketing-mint px-3 py-2 text-sm font-medium text-marketing-green"
    >
      {{ successMessage }}
    </p>
    <p v-if="packsLoading" class="text-sm" style="color: var(--ink3)">{{ S.loading }}</p>
    <p v-else-if="packsLoadError" class="text-sm text-red-600">{{ packsLoadError }}</p>
    <p v-else-if="packs.length === 0" class="text-sm leading-relaxed" style="color: var(--ink2)">
      {{ S.buyCreditsNoPacks }}
    </p>
    <template v-else>
      <template v-if="embedded">
        <p v-if="error" class="mb-2 text-sm text-red-500">{{ error }}</p>
        <div class="grid grid-cols-1 gap-4 min-[600px]:grid-cols-2 min-[960px]:grid-cols-4">
          <div
            v-for="pack in packs"
            :key="pack.slug ?? pack.price_id"
            class="relative flex flex-col gap-2 rounded-2xl border-2 px-5 py-[22px] transition-colors"
            :class="
              pack.badge === 'popular'
                ? 'border-marketing-green bg-marketing-mint'
                : selectedPack?.slug === pack.slug
                  ? 'border-marketing-green bg-marketing-mint/60'
                  : 'border-[#e5e7eb] bg-white hover:border-marketing-green hover:bg-marketing-mint/30'
            "
          >
            <span
              v-if="packBadgeLabel(pack)"
              class="absolute -top-3 left-1/2 z-[1] -translate-x-1/2 whitespace-nowrap rounded-full bg-marketing-green px-3.5 py-1 font-dmSans text-[13px] font-bold text-white"
            >
              {{ packBadgeLabel(pack) }}
            </span>
            <span class="font-dmSans text-[32px] font-extrabold leading-none text-marketing-green sm:text-[36px]">
              {{ pack.credits }}
            </span>
            <span class="font-dmSans text-[15px] text-black/40">{{ S.pricingCreditsUnit }}</span>
            <span class="font-dmSans text-lg font-bold text-black">
              {{ formatPrice(pack.unit_amount, pack.currency) }}
            </span>
            <button
              type="button"
              class="mt-2 inline-flex h-[38px] w-full items-center justify-center rounded-full border-[1.5px] font-dmSans text-[15px] font-bold transition-colors disabled:opacity-50"
              :class="
                pack.badge === 'popular'
                  ? 'border-marketing-green bg-marketing-green text-white hover:bg-marketing-green/90'
                  : 'border-marketing-green bg-white text-marketing-green hover:bg-marketing-green hover:text-white'
              "
              :disabled="loading && selectedPack?.slug === pack.slug"
              @click="selectAndBuy(pack)"
            >
              {{
                loading && selectedPack?.slug === pack.slug
                  ? S.loading
                  : S.pricingPackBuyCta
              }}
            </button>
          </div>
        </div>
        <p v-if="!session?.access_token" class="mt-4 text-sm text-amber-700">{{ S.pleaseSignIn }}</p>
      </template>
      <template v-else>
        <div class="chip-row mb-4">
          <button
            v-for="pack in packs"
            :key="pack.slug ?? pack.price_id"
            type="button"
            class="chip text-sm transition-colors"
            :class="{ on: selectedPack?.slug === pack.slug }"
            @click="selectedPack = pack"
          >
            {{ pack.credits }} {{ S.credits }} – {{ formatPrice(pack.unit_amount, pack.currency) }}
          </button>
        </div>
        <p v-if="error" class="mb-2 text-sm text-red-500">{{ error }}</p>
        <button
          type="button"
          class="btn-green disabled:opacity-50"
          :disabled="loading || !selectedPack || !session?.access_token"
          @click="handleBuy"
        >
          {{ loading ? S.loading : S.buyCredits }}
        </button>
        <p v-if="!session?.access_token" class="mt-2 text-sm text-amber-700">{{ S.pleaseSignIn }}</p>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { S } from '~/utils/strings'

const props = withDefaults(
  defineProps<{
    embedded?: boolean
    publicMode?: boolean
    returnBasePath?: string
    balanceCredits?: number | null
  }>(),
  {
    embedded: false,
    publicMode: false,
    returnBasePath: '/app/buy-credits',
    balanceCredits: null,
  },
)

const emit = defineEmits<{
  creditsPurchased: []
}>()

const checkout = usePricingCreditCheckout({
  returnBasePath: props.returnBasePath,
  publicMode: props.publicMode,
  embedded: props.embedded,
  onCreditsPurchased: () => emit('creditsPurchased'),
})

const {
  session,
  packs,
  packsLoading,
  packsLoadError,
  selectedPack,
  loading,
  error,
  successMessage,
  packBadgeLabel,
  formatPrice,
  selectAndBuy,
  handleBuy,
  init,
} = checkout

onMounted(() => {
  void init()
})
</script>
