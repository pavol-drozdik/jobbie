<template>
  <div>
    <div class="mb-10 overflow-hidden rounded-[20px] bg-white shadow-[0px_0px_4px_0px_rgba(0,0,0,0.12)]">
      <article
        v-for="(service, index) in PRICING_ADDON_SERVICES"
        :key="service.id"
        class="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:gap-8 sm:px-8 sm:py-6"
        :class="index > 0 ? 'border-t border-black/[0.06]' : ''"
      >
        <div class="min-w-0 flex-1">
          <h3 class="m-0 font-dmSans text-lg font-extrabold text-black sm:text-xl">
            {{ service.title }}
          </h3>
          <p class="m-0 mt-2 font-dmSans text-[15px] leading-relaxed text-black/65">
            {{ service.description }}
          </p>
          <p v-if="service.spec" class="m-0 mt-1.5 font-dmSans text-sm font-semibold text-black/45">
            {{ service.spec }}
          </p>
          <p class="m-0 mt-2 font-dmSans text-xs text-black/45">
            {{ S.pricingAddonsPriceNote }}
          </p>
        </div>
        <div class="flex shrink-0 flex-col gap-3 sm:items-end sm:pt-0.5">
          <p class="m-0 text-right font-dmSans text-[clamp(1.35rem,3vw,1.75rem)] font-extrabold leading-none text-black">
            <span class="text-marketing-green">{{ service.priceLabel }}</span>
            <span class="text-[14px] font-semibold text-black/40">{{ service.pricePeriod }}</span>
          </p>
          <AppButton
            type="button"
            variant="outline"
            class="!h-11 w-full shrink-0 !rounded-full !px-8 !text-[15px] !font-bold sm:!w-auto sm:min-w-[168px]"
            @click="emit('contact', service.id)"
          >
            {{ S.pricingAddonsContactCta }}
          </AppButton>
        </div>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
import { S } from '~/utils/strings'
import { PRICING_ADDON_SERVICES } from '~/utils/pricing-addon-services'
import type { PricingAddonServiceId } from '~/utils/pricing-addon-services'

const emit = defineEmits<{
  contact: [serviceId: PricingAddonServiceId]
}>()
</script>
