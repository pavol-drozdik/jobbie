<template>
  <div
    class="flex min-h-dvh items-center justify-center bg-marketing-mint px-5 py-10 font-dmSans text-black antialiased"
  >
    <div
      class="flex w-full max-w-[1020px] flex-col rounded-[24px] shadow-[0_8px_40px_rgba(0,0,0,0.13)] min-[701px]:min-h-[620px] min-[701px]:flex-row"
      :class="clipCard ? 'overflow-hidden' : 'overflow-visible'"
    >
      <div
        class="relative hidden w-full flex-col justify-between overflow-hidden bg-[linear-gradient(155deg,#15803d_0%,#22c55e_100%)] px-11 py-10 text-white before:pointer-events-none before:absolute before:-right-[100px] before:-top-20 before:size-[320px] before:rounded-full before:bg-white/[0.07] after:pointer-events-none after:absolute after:-left-[60px] after:bottom-10 after:size-[200px] after:rounded-full after:bg-white/[0.07] min-[701px]:flex min-[701px]:w-[42%] min-[701px]:px-11 min-[701px]:py-10"
      >
        <AppBrandLogo
          variant="mark"
          root-class="relative z-[1]"
          image-class="size-10 rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.12)]"
        />
        <div class="relative z-[1]">
          <h2 class="m-0 text-[42px] font-extrabold leading-[1.15] whitespace-pre-line">
            {{ panelTitle }}
          </h2>
          <p class="mt-4 text-lg font-medium leading-normal text-white/75">
            {{ panelSubtitle }}
          </p>
        </div>
      </div>

      <div
        class="isolate flex flex-1 flex-col justify-center bg-white px-7 py-10 min-[701px]:px-14 min-[701px]:py-[52px]"
      >
        <NuxtLink
          v-if="showBackLink && backTo"
          :to="backTo"
          class="mb-6 inline-flex w-fit items-center gap-2 text-[15px] font-semibold text-marketing-green no-underline transition-opacity hover:opacity-75"
        >
          <span aria-hidden="true">←</span>
          {{ backLabel }}
        </NuxtLink>
        <slot />
        <div v-if="$slots.footer" class="mt-6 border-t border-black/10 pt-6">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    panelTitle: string
    panelSubtitle: string
    showBackLink?: boolean
    backTo?: string
    backLabel?: string
    /** false on /platba so Stripe embedded iframe is not clipped */
    clipCard?: boolean
  }>(),
  {
    showBackLink: true,
    backTo: '/cennik',
    backLabel: 'Späť',
    clipCard: true,
  },
)
</script>
