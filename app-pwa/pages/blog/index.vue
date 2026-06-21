<template>
  <div class="font-dmSans">
    <!-- Hero -->
    <div
      class="relative flex w-full flex-col items-center overflow-hidden bg-gradient-to-br from-[#15803d] to-marketing-green px-5 pb-[60px] pt-[calc(5.5rem+env(safe-area-inset-top))] text-center md:pt-[130px]"
    >
      <div
        class="pointer-events-none absolute -right-[100px] -top-[120px] size-[400px] rounded-full bg-white/[0.06]"
        aria-hidden="true"
      />
      <div
        class="pointer-events-none absolute -bottom-[60px] left-[60px] size-[220px] rounded-full bg-white/[0.06]"
        aria-hidden="true"
      />
      <h1 class="relative z-[1] m-0 mb-3.5 font-dmSans text-[42px] font-extrabold text-white md:text-[64px]">
        Blog
      </h1>
      <p class="relative z-[1] m-0 font-dmSans text-lg font-medium text-white/80 md:text-[22px]">
        Tipy, novinky a inšpirácia zo sveta práce a brigád.
      </p>
    </div>

    <section class="w-full px-5 pb-20 pt-14">
      <div class="mx-auto max-w-[1300px]">
        <!-- Filters -->
        <div class="mb-10 flex flex-wrap items-center gap-2.5">
          <span class="mr-1 font-dmSans text-base font-semibold text-black/40">Kategória:</span>
          <button
            v-for="cat in BLOG_CATEGORIES"
            :key="cat.id"
            type="button"
            class="cursor-pointer rounded-full border-[1.5px] px-[18px] py-2 font-dmSans text-[15px] font-semibold transition-colors duration-150"
            :class="
              activeCategory === cat.id
                ? 'border-marketing-green bg-marketing-green text-white'
                : 'border-gray-200 bg-white text-black/55 hover:border-marketing-green hover:bg-marketing-green hover:text-white'
            "
            @click="selectCategory(cat.id)"
          >
            {{ cat.label }}
          </button>
        </div>

        <AppAsyncListState
          :loading="loading && !items.length"
          :error="loadError ? 'Nepodarilo sa načítať články.' : null"
          :empty="!loading && !loadError && !featured && !items.length"
          empty-message="Zatiaľ žiadne články. Skúste neskôr alebo zvoľte inú kategóriu."
          :skeleton-count="6"
          @retry="reload"
        >
          <BlogFeaturedCard v-if="featured && !cursor" :post="featured" />

          <div
            v-if="items.length"
            class="grid grid-cols-1 items-stretch gap-6 md:grid-cols-2 lg:grid-cols-3"
          >
            <BlogPostCard v-for="post in items" :key="post.id" :post="post" />
          </div>

          <div v-if="nextCursor" class="mt-12 flex justify-center">
            <button
              type="button"
              class="h-[54px] cursor-pointer rounded-full border-[1.5px] border-marketing-green bg-white px-11 font-dmSans text-[17px] font-bold text-marketing-green transition-colors hover:bg-marketing-green hover:text-white disabled:opacity-60"
              :disabled="loadingMore"
              @click="loadMore"
            >
              {{ loadingMore ? 'Načítavam…' : 'Načítať ďalšie články' }}
            </button>
          </div>
        </AppAsyncListState>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { BlogListItem } from '~/composables/useBlog'
import { BLOG_CATEGORIES, type BlogCategoryId } from '~/utils/blog'
import BlogFeaturedCard from '~/components/blog/BlogFeaturedCard.vue'
import BlogPostCard from '~/components/blog/BlogPostCard.vue'
import { S } from '~/utils/strings'
import { ROUTES } from '~/utils/app-routes'
import { fetchPublicBlogList } from '~/composables/fetch-public-blog-list'

definePageMeta({ layout: 'app', layoutMainFlushTop: true })

usePageSeo({
  title: S.seoBlogTitle,
  description: S.seoBlogDescription,
  canonicalPath: ROUTES.blog,
})

const { fetchList } = useBlog()

const activeCategory = ref<BlogCategoryId>('all')
const {
  data: initialList,
  pending: listPending,
  refresh: refreshList,
} = await useAsyncData(
  () => `blog-index-${activeCategory.value}`,
  () => fetchPublicBlogList({ limit: 6, category: activeCategory.value }),
  { watch: [activeCategory] },
)

const featured = ref<BlogListItem | null>(initialList.value?.featured ?? null)
const items = ref<BlogListItem[]>(initialList.value?.items ?? [])
const nextCursor = ref<string | null>(initialList.value?.next_cursor ?? null)
const cursor = ref<string | undefined>(undefined)
const loading = computed(() => listPending.value)
const loadingMore = ref(false)
const loadError = ref(false)

watch(initialList, (data) => {
  if (!data) return
  featured.value = data.featured
  items.value = data.items
  nextCursor.value = data.next_cursor
})

async function loadPage(append: boolean) {
  if (append) {
    loadingMore.value = true
  } else {
    loading.value = true
    loadError.value = false
  }
  const data = await fetchList({
    limit: 6,
    cursor: append ? cursor.value : undefined,
    category: activeCategory.value,
  })
  if (!data) {
    if (!append) loadError.value = true
    loading.value = false
    loadingMore.value = false
    return
  }
  if (!append) {
    featured.value = data.featured
    items.value = data.items
  } else {
    items.value = [...items.value, ...data.items]
  }
  nextCursor.value = data.next_cursor
  cursor.value = data.next_cursor ?? undefined
  loading.value = false
  loadingMore.value = false
}

function reload() {
  cursor.value = undefined
  void refreshList()
}

function selectCategory(id: BlogCategoryId) {
  if (activeCategory.value === id) return
  activeCategory.value = id
  cursor.value = undefined
}

function loadMore() {
  if (!nextCursor.value || loadingMore.value) return
  void loadPage(true)
}

onMounted(() => {
  if (items.value.length > 0 || featured.value) return
  void loadPage(false)
})
</script>
