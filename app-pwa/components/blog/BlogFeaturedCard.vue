<script setup lang="ts">
import type { BlogListItem } from '~/composables/useBlog'
import {
  BLOG_COVER_ASPECT_CLASS,
  BLOG_DEFAULT_COVER,
  BLOG_FEATURED_EXCERPT_CLASS,
  BLOG_FEATURED_TITLE_CLASS,
  blogCategoryLabel,
  blogReadingLabel,
  formatBlogDate,
} from '~/utils/blog'

defineProps<{
  post: BlogListItem
}>()
</script>

<template>
  <NuxtLink
    :to="`/blog/${post.slug}`"
    class="group mb-10 flex flex-col overflow-hidden rounded-[24px] bg-white no-underline shadow-[0_0_16px_rgba(0,0,0,0.08)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(0,0,0,0.12)] md:flex-row md:gap-9"
  >
    <div
      :class="[
        'w-full shrink-0 overflow-hidden bg-[#cff0db] md:w-[48%]',
        BLOG_COVER_ASPECT_CLASS,
      ]"
    >
      <img
        :src="post.cover_image_url || BLOG_DEFAULT_COVER"
        :alt="post.title"
        width="640"
        height="480"
        loading="eager"
        decoding="async"
        class="size-full object-cover"
      >
    </div>
    <div class="flex flex-1 flex-col justify-center p-6 md:py-10 md:pr-9 md:pl-0">
      <span class="mb-3.5 inline-flex w-fit items-center rounded-full bg-[#cff0db] px-3 py-1 font-dmSans text-[13px] font-bold text-[#15803d]">
        {{ blogCategoryLabel(post.category) }}
      </span>
      <h2 :class="BLOG_FEATURED_TITLE_CLASS">
        {{ post.title }}
      </h2>
      <p :class="BLOG_FEATURED_EXCERPT_CLASS">
        {{ post.excerpt || '\u00a0' }}
      </p>
      <div class="flex flex-wrap items-center gap-4">
        <span class="flex items-center gap-1.5 font-dmSans text-sm font-medium text-black/45">
          <AppIcon name="calendar" :size="13" class="text-marketing-green" />
          {{ formatBlogDate(post.published_at) }}
        </span>
        <template v-if="blogReadingLabel(post.reading_time_minutes)">
          <span class="text-black/20">·</span>
          <span class="font-dmSans text-sm font-medium text-black/45">
            {{ blogReadingLabel(post.reading_time_minutes) }}
          </span>
        </template>
        <div
          class="ml-auto flex size-10 shrink-0 items-center justify-center rounded-full bg-marketing-green text-white"
          aria-hidden="true"
        >
          <AppIcon name="arrow-right" :size="14" />
        </div>
      </div>
    </div>
  </NuxtLink>
</template>
