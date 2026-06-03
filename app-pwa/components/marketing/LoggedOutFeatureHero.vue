<template>
  <section class="mt-[32px] w-full px-5 pb-12 font-dmSans">
    <div class="mx-auto flex w-full max-w-[1400px] flex-col gap-8 marketing:flex-row marketing:items-center marketing:gap-10">
      <div class="w-full marketing:w-1/2">
        <h1 class="m-0 font-dmSans text-[34px] font-extrabold leading-[1.08] text-black marketing:text-[54px] marketing:leading-[1.02]">
          {{ title }}
        </h1>
        <p class="mt-4 text-lg font-medium text-black/75 marketing:text-2xl">
          {{ description }}
        </p>
        <div class="mt-6 flex flex-col gap-3">
          <div v-for="(benefit, index) in safeBenefits" :key="benefit" class="flex items-start gap-3">
            <div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-marketing-green font-dmSans text-lg font-bold text-white">
              {{ index + 1 }}
            </div>
            <p class="m-0 pt-1 text-[17px] font-medium text-black/80 marketing:text-[22px]">
              {{ benefit }}
            </p>
          </div>
        </div>
        <div class="mt-8 flex flex-wrap gap-3">
          <NuxtLink
            :to="loginHref"
            class="inline-flex h-12 items-center justify-center rounded-full bg-marketing-green px-6 font-dmSans text-[17px] font-bold text-white no-underline transition-opacity hover:opacity-90"
          >
            {{ primaryActionLabel }}
          </NuxtLink>
          <NuxtLink
            :to="registerHref"
            class="inline-flex h-12 items-center justify-center rounded-full border-2 border-marketing-green bg-white px-6 font-dmSans text-[17px] font-bold text-marketing-green no-underline transition-colors hover:bg-marketing-green hover:text-white"
          >
            {{ secondaryActionLabel }}
          </NuxtLink>
        </div>
      </div>
      <div class="w-full marketing:w-1/2">
        <img
          :src="imageSrc"
          :alt="imageAlt"
          class="mx-auto block w-full rounded-[22px] object-cover"
          loading="lazy"
          width="900"
          height="640"
        >
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  title: string
  description: string
  benefits: string[]
  imageSrc: string
  imageAlt: string
  primaryActionLabel?: string
  secondaryActionLabel?: string
  redirectPath: string
}>(), {
  primaryActionLabel: 'Prihlásiť sa',
  secondaryActionLabel: 'Registrovať sa',
})

const safeBenefits = computed(() => props.benefits.slice(0, 3))
const encodedRedirect = computed(() => encodeURIComponent(props.redirectPath))
const loginHref = computed(() => `/auth/login?redirect=${encodedRedirect.value}`)
const registerHref = computed(() => `/auth/register?redirect=${encodedRedirect.value}`)
</script>
