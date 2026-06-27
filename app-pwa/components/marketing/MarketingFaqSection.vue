<template>
  <section class="flex w-full flex-col gap-8">
    <div v-if="title" class="text-center">
      <h2 v-if="headingLevel === 2" class="m-0 font-dmSans text-[32px] font-extrabold text-black marketing:text-[44px]">
        {{ title }}
      </h2>
      <h1 v-else class="m-0 font-dmSans text-[32px] font-extrabold text-black marketing:text-[44px]">
        {{ title }}
      </h1>
      <p v-if="subtitle" class="mx-auto mt-3 max-w-2xl font-dmSans text-lg font-medium text-black/65">
        {{ subtitle }}
      </p>
    </div>
    <div
      v-if="showRoleTabs"
      class="mx-[10px] flex w-fit max-w-full flex-wrap items-center justify-center self-center rounded-[999px] bg-white p-1.5 shadow-[0_0_3px_0_rgba(0,0,0,0.2)] marketing:rounded-full"
      role="tablist"
      aria-label="Rola"
    >
      <button
        v-for="tab in roleTabs"
        :key="tab.role"
        type="button"
        role="tab"
        class="m-1 is-clickable whitespace-nowrap rounded-full border-none px-3 py-2 font-dmSans text-[15px] font-bold transition-[background-color,color] duration-200 max-[600px]:px-3 max-[600px]:py-2 marketing:m-[5px] marketing:px-5 marketing:py-2.5 marketing:text-[22px] aria-selected:bg-marketing-green aria-selected:text-white"
        :class="activeRole === tab.role ? 'bg-marketing-green text-white' : 'bg-transparent text-black'"
        :aria-selected="activeRole === tab.role"
        @click="activeRole = tab.role"
      >
        {{ tab.label }}
      </button>
    </div>
    <div class="mx-auto flex w-full max-w-[900px] flex-col gap-4">
      <div
        v-for="(item, index) in visibleItems"
        :key="`${activeRole}-${index}`"
        class="rounded-[14px] bg-white px-5 py-4 shadow-[0px_0px_6px_0px_rgba(0,0,0,0.12)] marketing:px-7 marketing:py-5"
      >
        <h3 class="m-0 font-dmSans text-[18px] font-bold text-black marketing:text-[22px]">
          {{ item.question }}
        </h3>
        <p class="mb-0 mt-3 font-dmSans text-base font-medium leading-relaxed text-black/[0.78] marketing:text-lg">
          {{ item.answer }}
        </p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { HomeFaqItem, HomeFaqRole } from '~/utils/home-faq'
import { HOME_FAQ_BY_ROLE } from '~/utils/home-faq'
import { S } from '~/utils/strings'

const props = withDefaults(
  defineProps<{
    title?: string
    subtitle?: string
    headingLevel?: 1 | 2
    showRoleTabs?: boolean
    items?: readonly HomeFaqItem[]
    initialRole?: HomeFaqRole
  }>(),
  {
    headingLevel: 2,
    showRoleTabs: true,
    initialRole: 'worker',
  },
)

const roleTabs = [
  { role: 'employer' as const, label: S.faqRoleEmployer },
  { role: 'worker' as const, label: S.faqRoleWorker },
  { role: 'provider' as const, label: S.faqRoleProvider },
]

const activeRole = ref<HomeFaqRole>(props.initialRole)

const visibleItems = computed(() => {
  if (props.items?.length) return props.items
  return HOME_FAQ_BY_ROLE[activeRole.value]
})
</script>
