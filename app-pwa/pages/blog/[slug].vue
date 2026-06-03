<template>
  <div class="font-dmSans pb-20 pt-[calc(6.875rem+env(safe-area-inset-top))] md:pt-[calc(110px+env(safe-area-inset-top))]">
    <AppAsyncListState
      :loading="loading"
      :error="loadError"
      :empty="false"
      :show-retry="!!loadError"
      @retry="reload"
    >
      <div v-if="post" class="mx-auto max-w-[1200px] px-5">
        <AppBreadcrumbs :items="blogBreadcrumbs" />
        <PublicContentAeoSummary :facts="aeoFacts" heading="Súhrn článku" class="mb-6" />
        <div ref="containerRef" class="flex flex-col items-start gap-8 lg:flex-row lg:gap-12">
          <article class="min-w-0 flex-1">
            <span
              class="mb-4 inline-flex items-center rounded-full bg-[#cff0db] px-3.5 py-[5px] font-dmSans text-[13px] font-bold text-[#15803d]"
            >
              {{ blogCategoryLabel(post.category) }}
            </span>

            <h1
              class="m-0 mb-[22px] font-dmSans text-[32px] font-extrabold leading-[1.12] text-black lg:text-[46px]"
            >
              {{ post.title }}
            </h1>

            <p
              v-if="post.excerpt"
              class="m-0 mb-6 font-dmSans text-lg font-normal leading-[1.6] text-black/55 md:text-[22px] md:leading-[1.55]"
            >
              {{ post.excerpt }}
            </p>

            <div
              class="mb-8 flex flex-wrap items-center gap-3.5 border-b border-black/[0.08] pb-6 max-lg:gap-y-3"
            >
              <span
                v-if="post.author_name"
                class="flex items-center gap-1.5 font-dmSans text-[15px] font-medium text-black/45"
              >
                <AppIcon name="user" :size="13" class="text-marketing-green" />
                {{ post.author_name }}<template v-if="post.author_role"> · {{ post.author_role }}</template>
              </span>

              <span class="flex items-center gap-1.5 font-dmSans text-[15px] font-medium text-black/45">
                <AppIcon name="calendar" :size="13" class="text-marketing-green" />
                {{ formatBlogDate(post.published_at) }}
              </span>

              <span
                v-if="blogReadingLabel(post.reading_time_minutes)"
                class="flex items-center gap-1.5 font-dmSans text-[15px] font-medium text-black/45"
              >
                <AppIcon name="clock" :size="13" class="text-marketing-green" />
                {{ blogReadingLabel(post.reading_time_minutes) }}
              </span>

              <button
                type="button"
                class="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-full border-[1.5px] border-gray-200 bg-[#fafcfb] px-4 py-[7px] font-dmSans text-sm font-semibold text-black/55 transition-colors hover:border-marketing-green hover:text-marketing-green sm:ml-auto sm:w-auto"
                @click="sharePost"
              >
                <AppIcon name="share-2" :size="14" />
                Zdieľať
              </button>
            </div>

            <p
              v-if="post.author_bio"
              class="m-0 mb-6 font-dmSans text-base font-medium leading-relaxed text-black/55"
            >
              {{ post.author_bio }}
            </p>

            <div class="mb-9 h-[280px] overflow-hidden rounded-[20px] bg-[#cff0db] sm:h-[360px] lg:h-[420px]">
              <img
                :src="post.cover_image_url || BLOG_DEFAULT_COVER"
                :alt="post.title"
                width="1200"
                height="420"
                class="size-full object-cover"
              >
            </div>

            <div
              class="blog-article font-dmSans text-lg font-normal leading-[1.75] text-black/[0.78]"
              v-html="bodyHtml"
            />

            <div
              v-if="post.tags.length"
              class="mt-10 flex flex-wrap gap-2 border-t border-black/[0.08] pt-7"
            >
              <span
                v-for="tag in post.tags"
                :key="tag"
                class="cursor-default rounded-full border-[1.5px] border-gray-200 bg-[#fafcfb] px-3.5 py-1.5 font-dmSans text-sm font-semibold text-black/50 transition-colors hover:border-marketing-green hover:bg-marketing-green hover:text-white"
              >
                {{ formatBlogTag(tag) }}
              </span>
            </div>
          </article>

          <BlogPostSingularSidebar
            ref="sidebarRef"
            :toc-items="tocItems"
            :active-toc-id="activeTocId"
            :related="post.related"
            :newsletter-name="newsletterName"
            :newsletter-email="newsletterEmail"
            :newsletter-phase="newsletterPhase"
            :style="sidebarTransform"
            @toc-click="scrollToHeading"
            @update:newsletter-name="newsletterName = $event"
            @update:newsletter-email="newsletterEmail = $event"
            @newsletter-submit="submitSidebarNewsletter"
          />
        </div>
      </div>
    </AppAsyncListState>
  </div>
</template>

<script setup lang="ts">
import { S } from '~/utils/strings'
import type { BlogPostDetail } from '~/composables/useBlog'
import BlogPostSingularSidebar from '~/components/blog/BlogPostSingularSidebar.vue'
import {
  BLOG_DEFAULT_COVER,
  blogCategoryLabel,
  blogReadingLabel,
  formatBlogDate,
} from '~/utils/blog'
import { sanitizeBlogBodyForDisplay } from '~/utils/sanitize-blog-html'
import { showNotFound } from '~/utils/not-found'
import { ROUTES } from '~/utils/app-routes'
import { fetchPublicBlogPost } from '~/composables/fetch-public-blog-post'
import { useBlogPostDetailSeo } from '~/composables/usePublicContentSeo'

definePageMeta({ layout: 'app', layoutMainFlushTop: true })

function formatBlogTag(tag: string): string {
  const t = tag.trim()
  if (!t) return ''
  return t.startsWith('#') ? t : `#${t}`
}

const route = useRoute()
const slug = computed(() => String(route.params.slug ?? ''))

const {
  data: initialPost,
  pending: postPending,
  refresh: refreshPost,
} = await useAsyncData(
  () => `blog-post-${slug.value}`,
  () => fetchPublicBlogPost(slug.value),
  { watch: [slug] },
)

if (import.meta.server && slug.value && !initialPost.value) {
  throw createError({ statusCode: 404, statusMessage: 'Blog post not found' })
}

const post = ref<BlogPostDetail | null>(initialPost.value)
const loading = computed(() => postPending.value)
const loadError = ref<string | null>(null)

watch(initialPost, (value) => {
  post.value = value
  loadError.value = null
  if (!value && import.meta.client && !postPending.value) {
    onPostLoadMissing()
    return
  }
  if (value && import.meta.client) {
    nextTick(() => {
      buildToc()
      updateStickySidebar()
    })
  }
})

const bodyHtml = computed(() =>
  post.value ? sanitizeBlogBodyForDisplay(post.value.body_html) : '',
)

const tocItems = ref<{ id: string; label: string }[]>([])
const activeTocId = ref('')

const containerRef = ref<HTMLElement | null>(null)
const sidebarRef = ref<InstanceType<typeof BlogPostSingularSidebar> | null>(null)
const sidebarOffset = ref(0)

const sidebarTransform = computed(() => ({
  transform: sidebarOffset.value ? `translateY(${sidebarOffset.value}px)` : undefined,
}))

const { phase: newsletterPhase, submit: submitNewsletter } = useNewsletterSubscribe()
const newsletterName = ref('')
const newsletterEmail = ref('')

const { breadcrumbs: blogBreadcrumbs, aeoFacts } = useBlogPostDetailSeo(post)

function onPostLoadMissing(): void {
  if (!import.meta.client) {
    return
  }
  showNotFound(S.blogPostNotFound)
}

function buildToc() {
  if (!import.meta.client) return
  const root = document.querySelector('.blog-article')
  if (!root) {
    tocItems.value = []
    return
  }
  const headings = root.querySelectorAll('h2[id]')
  tocItems.value = Array.from(headings).map((h) => ({
    id: h.id,
    label: (h.textContent ?? '').trim(),
  }))
  if (tocItems.value.length && !activeTocId.value) {
    activeTocId.value = tocItems.value[0].id
  }
}

function scrollToHeading(id: string) {
  const el = document.getElementById(id)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    activeTocId.value = id
  }
}

function updateStickySidebar() {
  if (!import.meta.client || window.innerWidth < 1024) {
    sidebarOffset.value = 0
    return
  }
  const container = containerRef.value
  const sidebarEl = sidebarRef.value?.$el as HTMLElement | undefined
  if (!container || !sidebarEl) return
  const cTop = container.getBoundingClientRect().top
  const cH = container.offsetHeight
  const sH = sidebarEl.offsetHeight
  const offset = 100
  sidebarOffset.value = Math.min(Math.max(0, -cTop + offset), Math.max(0, cH - sH))
}

function updateActiveToc() {
  if (!import.meta.client) return
  let current = ''
  for (const item of tocItems.value) {
    const el = document.getElementById(item.id)
    if (el && window.scrollY >= el.offsetTop - 130) {
      current = item.id
    }
  }
  if (current) activeTocId.value = current
}

async function sharePost() {
  if (!post.value || !import.meta.client) return
  const url = window.location.href
  const shareData = { title: post.value.title, url }
  try {
    if (navigator.share) {
      await navigator.share(shareData)
      return
    }
  } catch {
    // fall through
  }
  try {
    await navigator.clipboard.writeText(url)
  } catch {
    // ignore
  }
}

async function submitSidebarNewsletter() {
  if (!newsletterEmail.value.trim()) return
  const ok = await submitNewsletter({
    email: newsletterEmail.value,
    name: newsletterName.value,
    consent: true,
  })
  if (ok) {
    newsletterName.value = ''
    newsletterEmail.value = ''
  }
}

onMounted(() => {
  if (post.value) {
    nextTick(() => {
      buildToc()
      updateStickySidebar()
    })
  }
  if (import.meta.client) {
    window.addEventListener('scroll', updateStickySidebar, { passive: true })
    window.addEventListener('resize', updateStickySidebar)
    window.addEventListener('scroll', updateActiveToc, { passive: true })
  }
})

onUnmounted(() => {
  if (import.meta.client) {
    window.removeEventListener('scroll', updateStickySidebar)
    window.removeEventListener('resize', updateStickySidebar)
    window.removeEventListener('scroll', updateActiveToc)
  }
})

watch(slug, () => {
  activeTocId.value = ''
})
</script>

<style scoped>
.blog-article :deep(h2) {
  margin: 2.25rem 0 0.875rem;
  font-size: 1.75rem;
  font-weight: 800;
  line-height: 1.2;
  color: #000;
}
.blog-article :deep(h3) {
  margin: 1.75rem 0 0.625rem;
  font-size: 1.375rem;
  font-weight: 700;
  color: #000;
}
.blog-article :deep(p) {
  margin: 0 0 1.125rem;
}
.blog-article :deep(ul),
.blog-article :deep(ol) {
  margin: 0 0 1.125rem;
  padding-left: 1.5rem;
  list-style-position: outside;
}
.blog-article :deep(ul) {
  list-style-type: disc;
}
.blog-article :deep(ol) {
  list-style-type: decimal;
}
.blog-article :deep(li) {
  display: list-item;
  margin-bottom: 0.5rem;
}
.blog-article :deep(strong) {
  font-weight: 700;
  color: #000;
}
.blog-article :deep(a) {
  color: #22c55e;
  text-decoration: underline;
}
.blog-article :deep(blockquote) {
  margin: 1.5rem 0;
  border-left: 4px solid #22c55e;
  border-radius: 0 12px 12px 0;
  background: #f0faf4;
  padding: 1.125rem 1.375rem;
  font-style: italic;
  color: rgba(0, 0, 0, 0.65);
}
.blog-article :deep(hr) {
  border: none;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
  margin: 2rem 0;
}
.blog-article :deep(blockquote strong) {
  font-style: normal;
}
.blog-article :deep(.highlight-box) {
  background: #cff0db;
  border-radius: 16px;
  padding: 1.375rem 1.625rem;
  margin: 1.75rem 0;
}
.blog-article :deep(.highlight-box p) {
  margin: 0;
  color: #15803d;
  font-weight: 600;
}
.blog-article :deep(img) {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 1.5rem auto;
  border-radius: 12px;
}
.blog-article :deep(pre) {
  margin: 1.25rem 0;
  padding: 1rem 1.125rem;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.04);
  font-size: 0.9rem;
  overflow-x: auto;
}
.blog-article :deep(code) {
  font-size: 0.9em;
}
</style>
