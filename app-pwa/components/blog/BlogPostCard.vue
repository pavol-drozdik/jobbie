<script setup lang="ts">
import type { BlogListItem } from '~/composables/useBlog'
import {
  BLOG_CARD_EXCERPT_CLASS,
  BLOG_CARD_TITLE_CLASS,
  BLOG_COVER_ASPECT_CLASS,
  BLOG_DEFAULT_COVER,
  blogCategoryLabel,
  blogReadingLabel,
  formatBlogDate,
} from '~/utils/blog'

const props = withDefaults(
  defineProps<{
    post: BlogListItem
    showCategoryOnImage?: boolean
    variant?: 'default' | 'home'
  }>(),
  {
    showCategoryOnImage: true,
    variant: 'default',
  },
)

const isHome = computed(() => props.variant === 'home')
</script>

<template>
  <NuxtLink
    :to="`/blog/${post.slug}`"
    class="group flex h-full flex-col overflow-hidden no-underline transition-[transform,box-shadow] duration-200"
    :class="
      isHome
        ? 'rounded-[15px] bg-marketing-surface shadow-[0px_0px_4px_0px_rgba(0,0,0,0.2)]'
        : 'rounded-[20px] bg-white shadow-[0_0_12px_rgba(0,0,0,0.07)] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.11)]'
    "
  >
    <div :class="['relative w-full shrink-0 overflow-hidden bg-[#cff0db]', BLOG_COVER_ASPECT_CLASS]">
      <img
        :src="post.cover_image_url || BLOG_DEFAULT_COVER"
        :alt="post.title"
        width="400"
        height="300"
        loading="lazy"
        decoding="async"
        class="size-full object-cover"
        :class="{ 'rounded-t-[15px]': isHome }"
      >
      <span
        v-if="showCategoryOnImage !== false"
        class="absolute inline-flex items-center rounded-full px-3 py-1 font-dmSans text-[13px] font-bold"
        :class="
          isHome
            ? 'right-2.5 top-2.5 bg-marketing-green text-white'
            : 'left-3.5 top-3.5 bg-[#cff0db] text-[#15803d]'
        "
      >
        {{ blogCategoryLabel(post.category) }}
      </span>
    </div>
    <div class="flex flex-1 flex-col" :class="isHome ? 'p-5' : 'p-6'">
      <h3 :class="BLOG_CARD_TITLE_CLASS">
        {{ post.title }}
      </h3>
      <p :class="BLOG_CARD_EXCERPT_CLASS">
        {{ post.excerpt || '\u00a0' }}
      </p>
      <div
        class="mt-auto"
        :class="isHome ? '' : 'border-t border-black/[0.06] pt-3.5'"
      >
        <div
          v-if="isHome"
          class="mb-2.5 h-px w-full bg-[rgba(177,178,181,0.3)]"
          aria-hidden="true"
        />
        <div class="flex items-center justify-between font-dmSans">
          <div
            class="flex min-w-0 flex-wrap items-center gap-2 font-medium text-black/45"
            :class="isHome ? 'gap-2.5 text-lg text-marketing-muted' : 'text-sm'"
          >
            <span class="flex items-center gap-1.5">
              <AppIcon name="calendar" :size="isHome ? 18 : 13" class="text-marketing-green" />
              {{ formatBlogDate(post.published_at) }}
            </span>
            <template v-if="!isHome && blogReadingLabel(post.reading_time_minutes)">
              <span class="text-black/20">·</span>
              <span>{{ blogReadingLabel(post.reading_time_minutes) }}</span>
            </template>
          </div>
          <AppIcon
            name="arrow-right"
            :size="isHome ? 22 : 16"
            class="shrink-0 text-marketing-green transition-transform group-hover:translate-x-1"
          />
        </div>
      </div>
    </div>
  </NuxtLink>
</template>
