<template>
  <div class="min-h-[50vh] bg-marketing-mint px-5 pb-20 pt-[calc(5.5rem+env(safe-area-inset-top))] font-dmSans md:pt-28">
    <article class="mx-auto max-w-3xl">
      <div
        v-if="showLegalReviewBanner"
        class="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 font-dmSans text-sm font-medium text-amber-900"
        role="status"
      >
        Právne overenie prebieha. Texty môžu byť upravené pred finálnym zverejnením.
      </div>
      <header class="mb-10">
        <h1 class="m-0 font-dmSans text-[32px] font-extrabold leading-tight text-black sm:text-[40px]">
          {{ page.title }}
        </h1>
        <p class="mt-4 font-dmSans text-lg font-medium leading-relaxed text-black/70">
          {{ page.intro }}
        </p>
        <p v-if="page.updatedAt" class="mt-3 font-dmSans text-sm font-medium text-black/45">
          Aktualizované: {{ formattedUpdatedAt }}
        </p>
      </header>
      <div class="flex flex-col gap-10">
        <section
          v-for="section in page.sections"
          :key="section.id"
          :id="section.id"
          class="scroll-mt-28"
        >
          <h2 class="m-0 font-dmSans text-2xl font-extrabold text-black">
            {{ section.title }}
          </h2>
          <div class="mt-3 flex flex-col gap-3">
            <p
              v-for="(paragraph, index) in section.paragraphs"
              :key="index"
              class="m-0 font-dmSans text-base font-medium leading-relaxed text-black/75"
            >
              {{ paragraph }}
            </p>
          </div>
        </section>
      </div>
    </article>
  </div>
</template>

<script setup lang="ts">
import type { TrustContentPage } from '~/utils/trust-page-content'

const props = defineProps<{
  page: TrustContentPage
  showLegalReviewBanner?: boolean
}>()

const formattedUpdatedAt = computed(() => {
  const date = new Date(props.page.updatedAt)
  if (Number.isNaN(date.getTime())) return props.page.updatedAt
  return date.toLocaleDateString('sk-SK', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
})
</script>
