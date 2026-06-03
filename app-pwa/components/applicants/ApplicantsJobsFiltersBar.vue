<template>
  <section
    ref="shellRef"
    class="mb-[50px] mt-[30px] w-full max-w-[1400px] rounded-[20px] bg-[linear-gradient(155deg,rgb(21,128,61)_0%,rgb(34,197,94)_100%)] p-6 marketing:p-[50px]"
  >
    <h1
      v-if="pageTitle"
      class="m-0 mb-5 font-dmSans text-[28px] font-extrabold leading-tight text-white marketing:mb-6 marketing:text-[34px]"
    >
      {{ pageTitle }}
    </h1>
    <p
      v-if="pageDescription"
      class="mb-5 mt-0 max-w-[720px] font-dmSans text-base font-medium leading-relaxed text-white/85 marketing:mb-6 marketing:text-lg"
    >
      {{ pageDescription }}
    </p>

    <ListMobileFiltersDropdown
      v-model:open="mobileOpen"
      :more-label="S.listSearchShowMore"
      :less-label="S.listSearchShowLess"
      :panel-region-label="S.listFiltersPanelRegionAria"
    >
      <template #search>
        <ApplicantsFilterSearch
          :model-value="search"
          :placeholder="S.applicantsSearchJobsPlaceholder"
          @update:model-value="emit('update:search', $event)"
          @submit="emit('submit')"
        />
      </template>
      <div class="flex flex-col gap-4">
        <ApplicantsJobsFiltersDropdownGrid />
        <ApplicantsJobsFiltersQuickBar />
      </div>
    </ListMobileFiltersDropdown>

    <div class="hidden marketing:block">
      <div class="grid min-w-0 w-full grid-cols-3 gap-5">
        <div class="col-span-2 min-w-0">
          <ApplicantsFilterSearch
            :model-value="search"
            :placeholder="S.applicantsSearchJobsPlaceholder"
            @update:model-value="emit('update:search', $event)"
            @submit="emit('submit')"
          />
        </div>
        <ApplicantsJobsFiltersQuickBar class="min-w-0" />
      </div>
      <div class="mt-5">
        <ApplicantsJobsFiltersDropdownGrid />
      </div>
    </div>

    <button
      v-if="hasActiveFilters"
      type="button"
      class="mt-4 border-none bg-transparent font-dmSans text-base font-semibold text-white underline decoration-white/80 underline-offset-4"
      @click="onClear"
    >
      {{ S.clearFilters }}
    </button>
  </section>
</template>

<script setup lang="ts">
import { S } from '~/utils/strings'
import ApplicantsFilterSearch from '~/components/applicants/ApplicantsFilterSearch.vue'
import ApplicantsJobsFiltersDropdownGrid from '~/components/applicants/ApplicantsJobsFiltersDropdownGrid.vue'
import ApplicantsJobsFiltersQuickBar from '~/components/applicants/ApplicantsJobsFiltersQuickBar.vue'

defineProps<{
  pageTitle?: string
  pageDescription?: string
  search: string
  hasActiveFilters: boolean
}>()

const emit = defineEmits<{
  'update:search': [value: string]
  submit: []
  clear: []
  'mobile-panel-close': []
}>()

const shellRef = ref<HTMLElement | null>(null)
const mobileOpen = ref(false)

function onClear(): void {
  mobileOpen.value = false
  emit('clear')
}

watch(mobileOpen, (open) => {
  if (!open) {
    emit('mobile-panel-close')
  }
})

defineExpose({ shellRef, mobileOpen })
</script>
