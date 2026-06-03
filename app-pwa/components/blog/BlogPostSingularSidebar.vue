<script setup lang="ts">
import type { BlogListItem } from '~/composables/useBlog'
import type { NewsletterSubscribePhase } from '~/composables/useNewsletterSubscribe'
import { BLOG_COVER_ASPECT_CLASS, BLOG_DEFAULT_COVER, formatBlogDate } from '~/utils/blog'

defineProps<{
  tocItems: { id: string; label: string }[]
  activeTocId: string
  related: BlogListItem[]
  newsletterName: string
  newsletterEmail: string
  newsletterPhase: NewsletterSubscribePhase
}>()

const emit = defineEmits<{
  tocClick: [id: string]
  'update:newsletterName': [value: string]
  'update:newsletterEmail': [value: string]
  newsletterSubmit: []
}>()
</script>

<template>
  <aside class="flex w-full shrink-0 flex-col gap-5 lg:w-[300px] lg:min-w-[300px]">
    <div
      v-if="tocItems.length"
      class="rounded-[20px] bg-white p-6 shadow-[0_0_12px_rgba(0,0,0,0.07)]"
    >
      <h2 class="m-0 mb-4 font-dmSans text-[17px] font-extrabold text-black">Obsah článku</h2>
      <nav class="flex flex-col gap-1" aria-label="Obsah článku">
        <a
          v-for="(item, idx) in tocItems"
          :key="item.id"
          :href="`#${item.id}`"
          class="flex cursor-pointer items-center gap-2 rounded-[10px] border-l-[3px] px-2.5 py-2 font-dmSans text-sm font-medium no-underline transition-colors"
          :class="
            activeTocId === item.id
              ? 'border-marketing-green bg-[#f0faf4] text-marketing-green'
              : 'border-transparent text-black/55 hover:border-marketing-green hover:bg-[#f0faf4] hover:text-marketing-green'
          "
          @click.prevent="emit('tocClick', item.id)"
        >
          <span class="min-w-[18px] text-xs font-bold text-marketing-green">{{ idx + 1 }}</span>
          {{ item.label }}
        </a>
      </nav>
    </div>

    <div
      v-if="related.length"
      class="rounded-[20px] bg-white p-6 shadow-[0_0_12px_rgba(0,0,0,0.07)]"
    >
      <h2 class="m-0 mb-4 font-dmSans text-[17px] font-extrabold text-black">Súvisiace články</h2>
      <div class="flex flex-col gap-3.5">
        <NuxtLink
          v-for="rel in related"
          :key="rel.id"
          :to="`/blog/${rel.slug}`"
          class="flex gap-3 no-underline transition-opacity hover:opacity-75"
        >
          <div :class="['w-[60px] min-w-[60px] overflow-hidden rounded-[10px] bg-[#cff0db]', BLOG_COVER_ASPECT_CLASS]">
            <img
              :src="rel.cover_image_url || BLOG_DEFAULT_COVER"
              :alt="rel.title"
              width="60"
              height="45"
              loading="lazy"
              decoding="async"
              class="size-full object-cover"
            >
          </div>
          <div>
            <div class="mb-1 font-dmSans text-sm font-bold leading-snug text-black">
              {{ rel.title }}
            </div>
            <div class="font-dmSans text-[13px] font-medium text-black/35">
              {{ formatBlogDate(rel.published_at) }}
            </div>
          </div>
        </NuxtLink>
      </div>
    </div>

    <div
      class="rounded-[20px] p-6"
      style="background: linear-gradient(155deg, #15803d 0%, #22c55e 100%)"
    >
      <h2 class="m-0 mb-1.5 font-dmSans text-lg font-extrabold text-white">Novinky do e-mailu</h2>
      <p class="m-0 mb-4 font-dmSans text-sm leading-snug text-white/80">
        Dostávaj nové články a tipy priamo do schránky.
      </p>
      <input
        :value="newsletterName"
        type="text"
        name="newsletter-name"
        autocomplete="name"
        placeholder="Meno"
        aria-label="Meno, voliteľné"
        class="mb-2.5 h-[46px] w-full rounded-full border-none px-4 font-dmSans text-[15px] outline-none"
        @input="emit('update:newsletterName', ($event.target as HTMLInputElement).value)"
      >
      <input
        :value="newsletterEmail"
        type="email"
        name="newsletter-email"
        autocomplete="email"
        placeholder="tvoj@email.sk"
        aria-label="E-mail"
        class="mb-2.5 h-[46px] w-full rounded-full border-none px-4 font-dmSans text-[15px] outline-none"
        @input="emit('update:newsletterEmail', ($event.target as HTMLInputElement).value)"
      >
      <button
        type="button"
        class="h-11 w-full cursor-pointer rounded-full border-none bg-black font-dmSans text-[15px] font-bold text-white transition-opacity hover:opacity-80 disabled:opacity-60"
        :disabled="newsletterPhase === 'loading'"
        @click="emit('newsletterSubmit')"
      >
        {{ newsletterPhase === 'loading' ? 'Odosielam…' : 'Odoberať' }}
      </button>
    </div>
  </aside>
</template>
