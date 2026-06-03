<template>
  <section
    class="mt-[72px] flex w-full flex-col items-center bg-marketing-green px-5 pt-[60px] text-center marketing:mt-[120px] marketingXl:mt-[140px]"
  >
    <h2 class="font-dmSans text-[32px] font-extrabold leading-[1.1] text-white marketing:text-[52px] marketing:leading-[1.05] marketingXl:text-[60px] marketingXl:leading-[60px]">
      Jobbie vždy po ruke
    </h2>
    <p class="mb-4 pt-[20px] max-w-[900px] font-dmSans text-[17px] font-medium text-white/80 marketing:text-2xl marketingXl:text-[28px]">
      {{ S.homeDownloadLead }}
    </p>
    <div class="my-4 flex flex-wrap items-center justify-center gap-3">
      <a
        href="#"
        class="inline-flex cursor-pointer items-center justify-center gap-2.5 rounded-full border-none bg-black px-[18px] py-2.5 font-dmSans text-base font-bold text-white no-underline"
        :aria-label="S.homeDownloadAppStore"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 384 512" fill="currentColor" aria-hidden="true">
          <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5c0 26.2 4.8 53.3 14.4 81.2 12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zM262.1 104.5c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
        </svg>
        {{ S.homeDownloadAppStore }}
      </a>
      <a
        href="#"
        class="inline-flex cursor-pointer items-center justify-center gap-2.5 rounded-full border-none bg-black px-[18px] py-2.5 font-dmSans text-base font-bold text-white no-underline"
        :aria-label="S.homeDownloadGooglePlay"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 0 1 0 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.8 8.99l-2.302 2.302-8.634-8.634z" />
        </svg>
        {{ S.homeDownloadGooglePlay }}
      </a>
    </div>
    <img
      src="/img/heroiphone2.png"
      alt=""
      width="300"
      height="600"
      loading="lazy"
      class="mt-5 w-full max-w-[280px] marketing:max-w-[300px]"
    >
  </section>
  <section class="mt-[72px] flex w-full flex-col items-center marketing:mt-[120px] marketingXl:mt-[140px]">
    <div class="box-border w-full max-w-[1400px] px-5">
      <h2 class="mt-0 text-center font-dmSans text-[32px] font-extrabold leading-[1.1] text-black marketing:text-[52px] marketing:leading-[1.05] marketingXl:mb-5 marketingXl:text-[60px] marketingXl:leading-[60px]">
        Z nášho<span class="text-marketing-green"> blogu</span>
      </h2>
    </div>
    <div class="mt-[40px] box-border grid w-full max-w-[1400px] grid-cols-1 items-stretch gap-[25px] px-5 marketing:grid-cols-3">
      <BlogPostCard
        v-for="post in homeBlogPosts"
        :key="post.id"
        :post="post"
        variant="home"
      />
    </div>
    <NuxtLink
      to="/blog"
      class="mt-5 self-center px-4 py-2.5 font-dmSans text-xl font-bold text-marketing-green no-underline"
    >
      Všetky články
    </NuxtLink>
  </section>
  <section class="mt-[72px] flex w-full flex-col items-center marketing:mt-[120px] marketingXl:mt-[140px]">
    <div class="flex w-full max-w-[1400px] flex-col items-stretch gap-10 px-5">
      <h2 class="mt-0 text-center font-dmSans text-[32px] font-extrabold leading-[1.1] text-black marketing:text-[52px] marketing:leading-[1.05] marketingXl:mb-5 marketingXl:text-[60px] marketingXl:leading-[60px]">
        Často kladené <span class="text-marketing-green">otázky</span>
      </h2>
      <div
        class="flex w-fit max-w-full flex-wrap items-center justify-center self-center rounded-[999px] bg-white p-1.5 shadow-[0_0_3px_0_rgba(0,0,0,0.2)] marketing:rounded-full"
        role="tablist"
        aria-label="Rola pre otázky"
      >
        <button
          v-for="tab in carouselTabs"
          :key="`faq-${tab.role}`"
          type="button"
          role="tab"
          :aria-selected="carouselRole === tab.role"
          class="m-1 cursor-pointer whitespace-nowrap rounded-full border-none bg-transparent px-3 py-2 font-dmSans text-[15px] font-bold text-black transition-[background-color,color] duration-200 max-[600px]:px-3 max-[600px]:py-2 marketing:m-[5px] marketing:px-5 marketing:py-2.5 marketing:text-[22px] aria-selected:bg-marketing-green aria-selected:text-white"
          :class="carouselRole === tab.role ? 'bg-marketing-green text-white' : ''"
          @click="emit('select-role', tab.role)"
        >
          {{ tab.label }}
        </button>
      </div>
      <div class="mx-auto flex w-full max-w-[1200px] flex-col gap-3">
        <div
          v-for="(item, i) in faqItems"
          :key="`${carouselRole}-${i}`"
          class="w-full overflow-hidden rounded-[14px] bg-white shadow-[0px_0px_6px_0px_rgba(0,0,0,0.12)]"
        >
          <button
            type="button"
            class="flex w-full cursor-pointer items-center justify-between gap-4 border-none bg-transparent px-5 py-4 text-left marketing:px-7 marketing:py-5"
            @click="emit('toggle-faq', i)"
          >
            <span class="font-dmSans text-[17px] font-bold text-black marketing:text-[22px]">{{ item.question }}</span>
            <span
              class="flex size-9 min-w-9 items-center justify-center rounded-full bg-marketing-panel text-[28px] font-normal leading-none text-marketing-green transition-transform duration-150"
              :class="{ 'rotate-45': openFaqIndex === i }"
              aria-hidden="true"
            >+</span>
          </button>
          <div
            class="overflow-hidden px-5 transition-[max-height,padding] duration-[350ms] ease-in-out marketing:px-7"
            :class="openFaqIndex === i ? 'max-h-[360px]' : 'max-h-0'"
          >
            <p class="m-0 pb-4 text-base font-medium text-black/[0.78] marketing:pb-5 marketing:text-xl">{{ item.answer }}</p>
          </div>
        </div>
      </div>
    </div>
  </section>
  <section class="mt-[72px] flex w-full flex-col items-center pb-12 marketing:mt-[120px] marketingXl:mt-[140px]">
    <div class="box-border flex w-full max-w-[1400px] flex-col gap-6 px-5 marketing:flex-row marketing:items-center">
      <div class="w-full md:block marketing:w-1/2">
        <NuxtImg
          class="mx-auto block w-full rounded-[20px] object-contain marketing:w-[90%]"
          src="/img/perspective.png"
          alt=""
          width="640"
          height="480"
          format="webp"
          quality="82"
          loading="lazy"
          decoding="async"
        />
      </div>
      <div class="w-full marketing:w-1/2">
        <h2 class="mt-0 font-dmSans text-[32px] font-extrabold leading-[1.1] text-black marketing:text-[52px] marketing:leading-[1.05] marketingXl:text-[60px] marketingXl:leading-[60px]">
          Novinky zo <span class="text-marketing-green">sveta práce</span>
        </h2>
        <form class="flex w-full flex-col items-start" @submit.prevent="handleNewsletterSubmit">
          <input
            v-model="newsletterName"
            type="text"
            name="newsletter-name"
            autocomplete="name"
            :placeholder="S.homeNewsletterPlaceholderName"
            :aria-label="`${S.firstName}, voliteľné`"
            class="addjob-input cv-field mt-5 mb-3 w-full max-w-[420px]"
          >
          <input
            v-model="newsletterEmail"
            type="email"
            name="newsletter-email"
            autocomplete="email"
            required
            :placeholder="S.homeNewsletterPlaceholderEmail"
            :aria-label="`${S.email}, ${S.required}`"
            class="addjob-input cv-field mb-4 w-full max-w-[420px]"
          >
          <div class="mb-4 flex items-start gap-2.5 font-dmSans text-base font-medium text-black/80 marketing:text-lg">
            <AppCheckbox
              id="newsletter-gdpr"
              v-model="newsletterGdpr"
              required
            />
            <label for="newsletter-gdpr">{{ S.homeNewsletterGdprLabel }}</label>
          </div>
          <button
            type="submit"
            :disabled="phase === 'loading'"
            class="cursor-pointer rounded-full border-none bg-marketing-green px-5 py-2.5 font-dmSans text-lg font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {{ phase === 'loading' ? S.newsletterSubscribeSubmitting : S.homeNewsletterSubmit }}
          </button>
          <p
            v-if="phase === 'error'"
            class="mb-0 mt-3 max-w-[420px] text-left font-dmSans text-base font-semibold text-red-700"
            role="alert"
          >
            {{ S.newsletterSubscribeError }}
          </p>
        </form>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import type { BlogListItem } from '~/composables/useBlog'
import type { HomeDesignCarouselRole } from '~/utils/home-design-carousel'
import BlogPostCard from '~/components/blog/BlogPostCard.vue'
import { S } from '~/utils/strings'

const { fetchList } = useBlog()
const homeBlogPosts = ref<BlogListItem[]>([])

onMounted(async () => {
  const data = await fetchList({ limit: 3 })
  if (!data) return
  const merged = [
    ...(data.featured ? [data.featured] : []),
    ...data.items,
  ]
  const seen = new Set<string>()
  homeBlogPosts.value = merged.filter((p) => {
    if (seen.has(p.id)) return false
    seen.add(p.id)
    return true
  }).slice(0, 3)
})

defineProps<{
  carouselTabs: readonly { role: HomeDesignCarouselRole; label: string }[]
  carouselRole: HomeDesignCarouselRole
  faqItems: readonly { question: string; answer: string }[]
  openFaqIndex: number | null
}>()

const emit = defineEmits<{
  'select-role': [role: HomeDesignCarouselRole]
  'toggle-faq': [index: number]
}>()

const newsletterName = ref('')
const newsletterEmail = ref('')
const newsletterGdpr = ref(false)
const { phase, submit, resetPhase } = useNewsletterSubscribe()

watch(newsletterEmail, () => {
  if (phase.value === 'error') {
    resetPhase()
  }
})

async function handleNewsletterSubmit(): Promise<void> {
  if (!newsletterGdpr.value) {
    return
  }
  const ok = await submit({
    email: newsletterEmail.value,
    name: newsletterName.value,
    consent: true,
  })
  if (ok) {
    newsletterName.value = ''
    newsletterEmail.value = ''
    newsletterGdpr.value = false
  }
}
</script>
