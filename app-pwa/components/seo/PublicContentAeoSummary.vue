<template>
  <section
    v-if="facts.length"
    class="mb-5 rounded-[14px] border border-black/[0.06] bg-marketing-soft/60 px-5 py-4 font-dmSans marketing:px-6 marketing:py-5"
    :aria-label="heading"
  >
    <h2 class="m-0 mb-3 text-base font-extrabold text-black marketing:text-lg">
      {{ heading }}
    </h2>
    <dl class="m-0 grid gap-2.5">
      <div
        v-for="(fact, index) in facts"
        :key="`${fact.label}-${index}`"
        class="m-0"
      >
        <dt class="m-0 text-[13px] font-bold uppercase tracking-wide text-black/45">
          {{ fact.label }}
        </dt>
        <dd class="m-0 mt-0.5 text-[15px] font-medium leading-relaxed text-black/78 marketing:text-base">
          {{ fact.value }}
        </dd>
      </div>
    </dl>
  </section>
</template>

<script setup lang="ts">
import type { PublicContentAeoFact } from '~/utils/public-content-seo'

withDefaults(
  defineProps<{
    facts: readonly PublicContentAeoFact[]
    heading?: string
  }>(),
  {
    heading: 'Súhrn',
  },
)
</script>
