<template>
  <div>
    <p v-if="successMessage" class="mb-4 rounded-xl border border-marketing-green/20 bg-white px-4 py-3 text-sm font-medium text-marketing-green shadow-[0px_0px_4px_0px_rgba(0,0,0,0.08)]">
      {{ successMessage }}
    </p>
    <p v-if="packsLoading" class="font-dmSans text-sm text-black/50">{{ S.loading }}</p>
    <p v-else-if="packsLoadError" class="text-sm text-red-600">{{ packsLoadError }}</p>
    <p v-else-if="packs.length === 0" class="text-sm leading-relaxed text-black/55">
      {{ packsLoadError || S.buyCreditsNoPacks }}
    </p>
    <template v-else>
      <p v-if="error" class="mb-4 text-sm text-red-600">{{ error }}</p>
      <div class="overflow-hidden rounded-[20px] bg-white shadow-[0px_0px_4px_0px_rgba(0,0,0,0.12)]">
        <div
          v-for="(pack, index) in packs"
          :key="pack.slug ?? pack.price_id"
          class="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-6"
          :class="[
            index > 0 ? 'border-t border-black/[0.06]' : '',
            pack.badge === 'popular' ? 'bg-[linear-gradient(90deg,rgba(240,253,244,0.95)_0%,rgba(255,255,255,1)_55%)]' : '',
          ]"
        >
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <p
                v-if="packLabel(pack)"
                class="m-0 font-dmSans text-[13px] font-bold uppercase tracking-wide text-marketing-green"
              >
                {{ packLabel(pack) }}
              </p>
            </div>
            <p class="m-0 mt-1 font-dmSans text-[clamp(1.75rem,4vw,2.25rem)] font-extrabold leading-none tracking-tight text-black">
              <span class="text-marketing-green">{{ pack.credits }}</span>
              {{ S.pricingCreditsUnit }}
            </p>
          </div>
          <div class="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-8">
            <p class="m-0 font-dmSans text-[clamp(1.5rem,3vw,2rem)] font-extrabold tabular-nums leading-none text-black">
              {{ formatPrice(pack.unit_amount, pack.currency) }}
            </p>
            <AppButton
              type="button"
              :variant="pack.badge === 'popular' ? 'primary' : 'outline'"
              class="!h-11 w-full shrink-0 !rounded-full !px-8 !text-[15px] !font-bold sm:!w-auto sm:min-w-[148px]"
              :disabled="loading && selectedPack?.slug === pack.slug"
              @click="selectAndBuy(pack)"
            >
              {{
                loading && selectedPack?.slug === pack.slug
                  ? S.loading
                  : S.pricingPackBuyCta
              }}
            </AppButton>
          </div>
        </div>
      </div>
      <p v-if="!session?.access_token" class="mt-5 text-sm text-black/55">{{ S.pleaseSignIn }}</p>
    </template>
  </div>
</template>

<script setup lang="ts">
import { S } from '~/utils/strings'
import type { PricingCreditPack } from '~/composables/usePricingCreditCheckout'

const props = withDefaults(
  defineProps<{
    returnBasePath?: string
  }>(),
  {
    returnBasePath: '/cennik',
  },
)

const emit = defineEmits<{
  creditsPurchased: []
}>()

const checkout = usePricingCreditCheckout({
  returnBasePath: props.returnBasePath,
  publicMode: true,
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
  init,
} = checkout

function packLabel(pack: PricingCreditPack): string | null {
  return pack.name_sk?.trim() || packBadgeLabel(pack)
}

const route = useRoute()
watch(
  () => route.fullPath,
  () => {
    void checkout.tryConfirmFromReturnUrl()
  },
)

onMounted(() => {
  void init()
})
</script>
