<template>
  <div class="grid min-w-0 w-full grid-cols-1 gap-5 md:grid-cols-2 marketing:grid-cols-3">
    <!-- Jobs: publish date | CV: experience -->
    <div v-if="isCvDatabase" class="relative flex min-w-0 flex-col gap-2">
      <label for="find-filter-experience" class="font-dmSans text-base font-semibold text-white/90">
        {{ S.cvDbBasicExperience }}
      </label>
      <button
        id="find-filter-experience"
        type="button"
        class="flex h-[60px] w-full is-clickable select-none items-center justify-between rounded-full border-none bg-marketing-soft px-5 font-dmSans text-lg font-normal outline-none"
        :class="ctx.experienceTriggerMuted ? 'text-black/30' : 'text-black/80'"
        @click.stop="ctx.toggleDropdown('experience')"
      >
        <span>{{ ctx.experienceDropdownLabel }}</span>
        <AppIcon
          name="chevron-right"
          :size="13"
          class="shrink-0 text-black/30 transition-transform duration-200"
          :class="ctx.openDropdown === 'experience' ? '-rotate-90' : 'rotate-90'"
        />
      </button>
      <div
        v-show="ctx.openDropdown === 'experience'"
        class="absolute left-0 right-0 top-[calc(100%+8px)] z-[100] max-h-[min(260px,42svh)] min-w-full overflow-y-auto rounded-2xl bg-white p-2 shadow-[0_4px_20px_rgba(0,0,0,0.12)] marketing:left-0 marketing:right-auto marketing:max-h-[min(320px,70vh)]"
        @click.stop
      >
        <button
          v-for="opt in ctx.experienceOptions"
          :key="opt.value || 'any'"
          type="button"
          class="w-full is-clickable rounded-[10px] border-none bg-transparent px-4 py-3 text-left font-dmSans text-lg text-black/80 transition-colors hover:bg-marketing-mint"
          :class="{
            'bg-marketing-panel font-semibold':
              cvFilters && cvFilters.experience === opt.value,
          }"
          @click="ctx.selectExperience?.(opt.value)"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>
    <div
      v-else
      class="relative flex min-w-0 flex-col gap-2 max-[899px]:order-last marketing:order-none"
    >
      <label for="find-filter-date" class="font-dmSans text-base font-semibold text-white/90">
        {{ S.findFilterPublishTime }}
      </label>
      <button
        id="find-filter-date"
        type="button"
        class="flex h-[60px] w-full is-clickable select-none items-center justify-between rounded-full border-none bg-marketing-soft px-5 font-dmSans text-lg font-normal outline-none"
        :class="ctx.dateTriggerMuted ? 'text-black/30' : 'text-black/80'"
        @click.stop="ctx.toggleDropdown('date')"
      >
        <span>{{ ctx.dateDropdownLabel }}</span>
        <AppIcon
          name="chevron-right"
          :size="13"
          class="shrink-0 text-black/30 transition-transform duration-200"
          :class="ctx.openDropdown === 'date' ? '-rotate-90' : 'rotate-90'"
        />
      </button>
      <div
        v-show="ctx.openDropdown === 'date'"
        class="absolute left-0 right-0 top-[calc(100%+8px)] z-[100] max-h-[min(260px,42svh)] min-w-full overflow-y-auto rounded-2xl bg-white p-2 shadow-[0_4px_20px_rgba(0,0,0,0.12)] marketing:left-0 marketing:right-auto marketing:max-h-[min(320px,70vh)]"
        @click.stop
      >
        <button
          v-for="opt in ctx.dateOptions"
          :key="opt.value"
          type="button"
          class="w-full is-clickable rounded-[10px] border-none bg-transparent px-4 py-3 text-left font-dmSans text-lg text-black/80 transition-colors hover:bg-marketing-mint"
          :class="{ 'bg-marketing-panel font-semibold': ctx.filters.date_range === opt.value }"
          @click="ctx.selectDateRange(opt.value)"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>

    <!-- Category (jobs) / employment type multi (CV) -->
    <div class="relative flex min-w-0 flex-col gap-2">
      <label for="find-filter-category" class="font-dmSans text-base font-semibold text-white/90">
        {{ isCvDatabase ? S.cvDbBasicJobType : S.findFilterIndustry }}
      </label>
      <button
        id="find-filter-category"
        type="button"
        class="flex h-[60px] w-full is-clickable select-none items-center justify-between rounded-full border-none bg-marketing-soft px-5 font-dmSans text-lg font-normal outline-none"
        :class="ctx.categoryTriggerMuted ? 'text-black/30' : 'text-black/80'"
        @click.stop="ctx.toggleDropdown('category')"
      >
        <span class="min-w-0 truncate text-left">{{ ctx.categoryDropdownLabel }}</span>
        <AppIcon
          name="chevron-right"
          :size="13"
          class="shrink-0 text-black/30 transition-transform duration-200"
          :class="ctx.openDropdown === 'category' ? '-rotate-90' : 'rotate-90'"
        />
      </button>
      <div
        v-show="ctx.openDropdown === 'category'"
        class="absolute left-0 right-0 top-[calc(100%+8px)] z-[100] max-h-[min(260px,42svh)] min-w-full overflow-y-auto rounded-2xl bg-white p-2 shadow-[0_4px_20px_rgba(0,0,0,0.12)] marketing:left-0 marketing:right-auto marketing:max-h-[min(320px,70vh)]"
        @click.stop
      >
        <button
          type="button"
          class="mb-1 w-full is-clickable rounded-[10px] border-0 border-b border-black/10 bg-transparent px-4 py-3 text-left font-dmSans text-lg font-semibold text-black/80 transition-colors hover:bg-marketing-mint"
          @click="ctx.clearCategories()"
        >
          {{ isCvDatabase ? S.cvDbJobTypeAny : S.allCategories }}
        </button>
        <button
          v-for="opt in ctx.categoryMultiOptions"
          :key="opt.value"
          type="button"
          class="flex w-full is-clickable items-center gap-3 rounded-[10px] border-none bg-transparent px-4 py-3 text-left font-dmSans text-lg text-black/80 transition-colors hover:bg-marketing-mint"
          @click="ctx.toggleCategory(opt.value)"
        >
          <span
            class="flex size-5 shrink-0 items-center justify-center rounded border-2 border-black/25 text-marketing-green"
            :class="ctx.isCategorySelected(opt.value) ? 'border-marketing-green bg-marketing-mint' : ''"
            aria-hidden="true"
          >
            <AppIcon v-if="ctx.isCategorySelected(opt.value)" name="check-circle" :size="14" />
          </span>
          <CategoryIcon
            v-if="!isCvDatabase"
            :category="opt.value"
            :size="18"
            icon-class="shrink-0 text-marketing-green"
          />
          <span>{{ opt.label }}</span>
        </button>
      </div>
    </div>

    <!-- Location (SK municipalities or foreign countries) -->
    <div class="relative flex min-w-0 flex-col gap-2">
      <label for="find-filter-location" class="font-dmSans text-base font-semibold text-white/90">
        {{ S.filterLocation }}
      </label>
      <AppSearchableFilterCombobox
        v-if="locationFilterKind === 'country'"
        id="find-filter-location"
        :model-value="locationModel"
        :options="countryLocationOptions"
        :trigger-label-when-empty="S.filterLocation"
        @update:model-value="onLocationModelUpdate"
      />
      <AppSkMunicipalityCombobox
        v-else
        id="find-filter-location"
        :model-value="locationModel"
        variant="filter"
        allow-any
        :trigger-label-when-empty="S.filterLocation"
        @update:model-value="onLocationModelUpdate"
      />
    </div>

    <!-- Pay (jobs) / max salary (CV) -->
    <div class="relative flex min-w-0 flex-col gap-2">
      <label for="find-filter-pay" class="font-dmSans text-base font-semibold text-white/90">
        {{ isCvDatabase ? S.cvDbBasicSalaryMax : S.findFilterPay }}
      </label>
      <button
        id="find-filter-pay"
        type="button"
        class="flex h-[60px] w-full is-clickable select-none items-center justify-between rounded-full border-none bg-marketing-soft px-5 font-dmSans text-lg font-normal outline-none"
        :class="payTriggerMuted ? 'text-black/30' : 'text-black/80'"
        @click.stop="ctx.toggleDropdown('pay')"
      >
        <span>{{ payDropdownLabel }}</span>
        <AppIcon
          name="chevron-right"
          :size="13"
          class="shrink-0 text-black/30 transition-transform duration-200"
          :class="ctx.openDropdown === 'pay' ? '-rotate-90' : 'rotate-90'"
        />
      </button>
      <div
        v-show="ctx.openDropdown === 'pay'"
        class="absolute left-0 right-0 top-[calc(100%+8px)] z-[100] max-h-[min(260px,42svh)] min-w-full overflow-y-auto rounded-2xl bg-white p-2 shadow-[0_4px_20px_rgba(0,0,0,0.12)] marketing:left-0 marketing:right-auto marketing:max-h-none"
        @click.stop
      >
        <template v-if="isCvDatabase">
          <div class="px-1 pb-1 pt-1">
            <input
              :value="cvFilters?.salaryMax ?? ''"
              type="text"
              inputmode="numeric"
              class="h-12 w-full rounded-full border-none bg-marketing-soft px-4 font-dmSans text-lg text-black/80 outline-none placeholder:text-black/30"
              :placeholder="S.cvDbBasicSalaryMaxPh"
              @input="onCvSalaryInput"
            >
          </div>
        </template>
        <template v-else>
          <button
            v-for="opt in ctx.payTypeOptions"
            :key="opt.value"
            type="button"
            class="w-full is-clickable rounded-[10px] border-none bg-transparent px-4 py-3 text-left font-dmSans text-lg text-black/80 transition-colors hover:bg-marketing-mint"
            :class="{
              'bg-marketing-panel font-semibold':
                (opt.value === 'all' && !ctx.filters.salary_type.trim()) ||
                ctx.filters.salary_type === opt.value,
            }"
            @click="ctx.selectSalaryTypeFilter(opt.value)"
          >
            {{ opt.label }}
          </button>
          <div v-show="ctx.showPayPlatInput" class="px-1 pb-1 pt-2">
            <input
              v-model="ctx.filters.salary_min"
              type="number"
              min="0"
              step="0.5"
              class="h-12 w-full rounded-full border-none bg-marketing-soft px-4 font-dmSans text-lg text-black/80 outline-none placeholder:text-black/30"
              :placeholder="ctx.payMinPlaceholder"
              @input="ctx.debouncedFetchNumbers"
              @blur="ctx.flushDebouncedNumericFilters"
            >
          </div>
        </template>
      </div>
    </div>

    <!-- Job type (jobs) / availability (CV) -->
    <div class="relative flex min-w-0 flex-col gap-2">
      <label for="find-filter-jobtype" class="font-dmSans text-base font-semibold text-white/90">
        {{ isCvDatabase ? S.cvDbBasicAvailability : S.filterJobType }}
      </label>
      <button
        id="find-filter-jobtype"
        type="button"
        class="flex h-[60px] w-full is-clickable select-none items-center justify-between rounded-full border-none bg-marketing-soft px-5 font-dmSans text-lg font-normal outline-none"
        :class="jobTypeTriggerMuted ? 'text-black/30' : 'text-black/80'"
        @click.stop="ctx.toggleDropdown('jobtype')"
      >
        <span>{{ jobTypeDropdownLabel }}</span>
        <AppIcon
          name="chevron-right"
          :size="13"
          class="shrink-0 text-black/30 transition-transform duration-200"
          :class="ctx.openDropdown === 'jobtype' ? '-rotate-90' : 'rotate-90'"
        />
      </button>
      <div
        v-show="ctx.openDropdown === 'jobtype'"
        class="absolute left-0 right-0 top-[calc(100%+8px)] z-[100] max-h-[min(260px,42svh)] min-w-full overflow-y-auto rounded-2xl bg-white p-2 shadow-[0_4px_20px_rgba(0,0,0,0.12)] marketing:left-0 marketing:right-auto marketing:max-h-none"
        @click.stop
      >
        <template v-if="isCvDatabase">
          <button
            v-for="opt in ctx.availabilityOptions"
            :key="opt.value || 'any'"
            type="button"
            class="w-full is-clickable rounded-[10px] border-none bg-transparent px-4 py-3 text-left font-dmSans text-lg text-black/80 transition-colors hover:bg-marketing-mint"
            :class="{
              'bg-marketing-panel font-semibold':
                cvFilters && cvFilters.availability === opt.value,
            }"
            @click="ctx.selectAvailability?.(opt.value)"
          >
            {{ opt.label }}
          </button>
        </template>
        <template v-else>
          <button
            v-for="opt in ctx.jobTypeOptions"
            :key="opt.value"
            type="button"
            class="w-full is-clickable rounded-[10px] border-none bg-transparent px-4 py-3 text-left font-dmSans text-lg text-black/80 transition-colors hover:bg-marketing-mint"
            :class="{ 'bg-marketing-panel font-semibold': ctx.filters.job_type === opt.value }"
            @click="ctx.selectJobType(opt.value)"
          >
            {{ opt.label }}
          </button>
        </template>
      </div>
    </div>

    <!-- Sort (jobs; CV uses order-last on mobile for sort) -->
    <div
      class="relative flex min-w-0 flex-col gap-2"
      :class="isCvDatabase ? 'max-[899px]:order-last marketing:order-none' : ''"
    >
      <label for="find-filter-sort" class="font-dmSans text-base font-semibold text-white/90">
        {{ S.filterSort }}
      </label>
      <button
        id="find-filter-sort"
        type="button"
        class="flex h-[60px] w-full is-clickable select-none items-center justify-between rounded-full border-none bg-marketing-soft px-5 font-dmSans text-lg font-normal outline-none"
        :class="ctx.sortTriggerMuted ? 'text-black/30' : 'text-black/80'"
        @click.stop="ctx.toggleDropdown('sort')"
      >
        <span>{{ ctx.sortDropdownLabel }}</span>
        <AppIcon
          name="chevron-right"
          :size="13"
          class="shrink-0 text-black/30 transition-transform duration-200"
          :class="ctx.openDropdown === 'sort' ? '-rotate-90' : 'rotate-90'"
        />
      </button>
      <div
        v-show="ctx.openDropdown === 'sort'"
        class="absolute left-0 right-0 top-[calc(100%+8px)] z-[100] max-h-[min(260px,42svh)] min-w-full overflow-y-auto rounded-2xl bg-white p-2 shadow-[0_4px_20px_rgba(0,0,0,0.12)] marketing:left-0 marketing:right-auto marketing:max-h-none"
        @click.stop
      >
        <button
          v-for="opt in ctx.sortOptions"
          :key="opt.value"
          type="button"
          class="w-full is-clickable rounded-[10px] border-none bg-transparent px-4 py-3 text-left font-dmSans text-lg text-black/80 transition-colors hover:bg-marketing-mint"
          :class="{
            'bg-marketing-panel font-semibold': isCvDatabase
              ? cvFilters && cvFilters.sort === opt.value
              : ctx.filters.sort === opt.value,
          }"
          @click="ctx.selectSort(opt.value)"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>

    <!-- CV: skills -->
    <div v-if="isCvDatabase" class="relative flex min-w-0 flex-col gap-2">
      <label for="find-filter-skills" class="font-dmSans text-base font-semibold text-white/90">
        {{ S.cvDbBasicSkills }}
      </label>
      <button
        id="find-filter-skills"
        type="button"
        class="flex h-[60px] w-full is-clickable select-none items-center justify-between rounded-full border-none bg-marketing-soft px-5 font-dmSans text-lg font-normal outline-none"
        :class="ctx.skillsTriggerMuted ? 'text-black/30' : 'text-black/80'"
        @click.stop="ctx.toggleDropdown('skills')"
      >
        <span class="min-w-0 truncate text-left">{{ ctx.skillsDropdownLabel }}</span>
        <AppIcon
          name="chevron-right"
          :size="13"
          class="shrink-0 text-black/30 transition-transform duration-200"
          :class="ctx.openDropdown === 'skills' ? '-rotate-90' : 'rotate-90'"
        />
      </button>
      <div
        v-show="ctx.openDropdown === 'skills'"
        class="absolute left-0 right-0 top-[calc(100%+8px)] z-[100] max-h-[min(360px,55svh)] min-w-full overflow-y-auto rounded-2xl bg-white p-2 shadow-[0_4px_20px_rgba(0,0,0,0.12)] marketing:left-0 marketing:right-auto marketing:max-h-[min(400px,70vh)]"
        @click.stop
      >
        <CvDbFilterSkillsSearchPanel
          v-if="cvFilters"
          :open="ctx.openDropdown === 'skills'"
          :model-value="cvFilters.skills"
          @update:model-value="onCvSkillsUpdate"
          @clear="ctx.clearCvSkills?.()"
        />
      </div>
    </div>

    <!-- CV: languages -->
    <div v-if="isCvDatabase" class="relative flex min-w-0 flex-col gap-2">
      <label for="find-filter-languages" class="font-dmSans text-base font-semibold text-white/90">
        {{ S.cvDbAdvSecLanguages }}
      </label>
      <button
        id="find-filter-languages"
        type="button"
        class="flex h-[60px] w-full is-clickable select-none items-center justify-between rounded-full border-none bg-marketing-soft px-5 font-dmSans text-lg font-normal outline-none"
        :class="ctx.languagesTriggerMuted ? 'text-black/30' : 'text-black/80'"
        @click.stop="ctx.toggleDropdown('languages')"
      >
        <span class="min-w-0 truncate text-left">{{ ctx.languagesDropdownLabel }}</span>
        <AppIcon
          name="chevron-right"
          :size="13"
          class="shrink-0 text-black/30 transition-transform duration-200"
          :class="ctx.openDropdown === 'languages' ? '-rotate-90' : 'rotate-90'"
        />
      </button>
      <div
        v-show="ctx.openDropdown === 'languages'"
        class="absolute left-0 right-0 top-[calc(100%+8px)] z-[100] max-h-[min(260px,42svh)] min-w-full overflow-y-auto rounded-2xl bg-white p-2 shadow-[0_4px_20px_rgba(0,0,0,0.12)] marketing:left-0 marketing:right-auto marketing:max-h-[min(320px,70vh)]"
        @click.stop
      >
        <button
          type="button"
          class="mb-1 w-full is-clickable rounded-[10px] border-0 border-b border-black/10 bg-transparent px-4 py-3 text-left font-dmSans text-lg font-semibold text-black/80 transition-colors hover:bg-marketing-mint"
          @click="ctx.clearCvLanguages?.()"
        >
          {{ S.cvDbLanguagesAny }}
        </button>
        <button
          v-for="opt in ctx.languageMultiOptions"
          :key="opt.value"
          type="button"
          class="flex w-full is-clickable items-center gap-3 rounded-[10px] border-none bg-transparent px-4 py-3 text-left font-dmSans text-lg text-black/80 transition-colors hover:bg-marketing-mint"
          @click="ctx.toggleLanguage?.(opt.value)"
        >
          <span
            class="flex size-5 shrink-0 items-center justify-center rounded border-2 border-black/25 text-marketing-green"
            :class="ctx.isLanguageSelected?.(opt.value) ? 'border-marketing-green bg-marketing-mint' : ''"
            aria-hidden="true"
          >
            <AppIcon v-if="ctx.isLanguageSelected?.(opt.value)" name="check-circle" :size="14" />
          </span>
          <span>{{ opt.label }}</span>
        </button>
        <template v-if="cvFilters && cvFilters.languages.length > 0">
          <div class="my-1 border-t border-black/10" />
          <p class="m-0 px-4 py-2 font-dmSans text-sm font-semibold text-black/55">
            {{ S.cvDbAdvLanguageLevel }}
          </p>
          <button
            v-for="opt in ctx.languageLevelOptions"
            :key="opt.value || 'any-level'"
            type="button"
            class="w-full is-clickable rounded-[10px] border-none bg-transparent px-4 py-3 text-left font-dmSans text-lg text-black/80 transition-colors hover:bg-marketing-mint"
            :class="{
              'bg-marketing-panel font-semibold': ctx.sharedLanguageMinLevel === opt.value,
            }"
            @click="ctx.selectLanguageMinLevel?.(opt.value)"
          >
            {{ opt.label }}
          </button>
        </template>
      </div>
    </div>

    <!-- CV: education -->
    <div v-if="isCvDatabase" class="relative flex min-w-0 flex-col gap-2">
      <label for="find-filter-education" class="font-dmSans text-base font-semibold text-white/90">
        {{ S.cvDbBasicEducation }}
      </label>
      <button
        id="find-filter-education"
        type="button"
        class="flex h-[60px] w-full is-clickable select-none items-center justify-between rounded-full border-none bg-marketing-soft px-5 font-dmSans text-lg font-normal outline-none"
        :class="ctx.educationTriggerMuted ? 'text-black/30' : 'text-black/80'"
        @click.stop="ctx.toggleDropdown('education')"
      >
        <span>{{ ctx.educationDropdownLabel }}</span>
        <AppIcon
          name="chevron-right"
          :size="13"
          class="shrink-0 text-black/30 transition-transform duration-200"
          :class="ctx.openDropdown === 'education' ? '-rotate-90' : 'rotate-90'"
        />
      </button>
      <div
        v-show="ctx.openDropdown === 'education'"
        class="absolute left-0 right-0 top-[calc(100%+8px)] z-[100] max-h-[min(260px,42svh)] min-w-full overflow-y-auto rounded-2xl bg-white p-2 shadow-[0_4px_20px_rgba(0,0,0,0.12)] marketing:left-0 marketing:right-auto marketing:max-h-[min(320px,70vh)]"
        @click.stop
      >
        <button
          v-for="opt in ctx.educationOptions"
          :key="opt.value || 'any'"
          type="button"
          class="w-full is-clickable rounded-[10px] border-none bg-transparent px-4 py-3 text-left font-dmSans text-lg text-black/80 transition-colors hover:bg-marketing-mint"
          :class="{
            'bg-marketing-panel font-semibold':
              cvFilters && cvFilters.educationLevel === opt.value,
          }"
          @click="ctx.selectEducation?.(opt.value)"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, unref } from 'vue'
import type { CvDatabaseFiltersModel } from '~/types/employer-cv-database'
import AppSearchableFilterCombobox from '~/components/AppSearchableFilterCombobox.vue'
import AppSkMunicipalityCombobox from '~/components/AppSkMunicipalityCombobox.vue'
import CvDbFilterSkillsSearchPanel from '~/components/cv-database/CvDbFilterSkillsSearchPanel.vue'
import { S } from '~/utils/strings'
import { FIND_LIST_FILTERS_KEY, type FindListFiltersUi } from './find-list-filters-context'

const ctx = inject(FIND_LIST_FILTERS_KEY) as FindListFiltersUi

const isCvDatabase = computed(() => ctx.gridVariant === 'cv-database')

const cvFilters = computed((): CvDatabaseFiltersModel | null => {
  const raw = ctx.cvFilters
  return raw ? unref(raw) : null
})

const locationFilterKind = computed(
  () => (unref(ctx.locationFilterKind) ?? 'municipality') as 'municipality' | 'country',
)

const countryLocationOptions = computed(() => unref(ctx.locationFilterOptions) ?? [])

const locationModel = computed(() => {
  if (isCvDatabase.value && cvFilters.value) {
    return cvFilters.value.location.trim()
  }
  return ctx.filters.location.trim()
})

function onLocationModelUpdate(value: string): void {
  ctx.selectLocation(value)
}

const payTriggerMuted = computed(() =>
  isCvDatabase.value ? Boolean(ctx.cvSalaryTriggerMuted) : ctx.payTriggerMuted,
)
const payDropdownLabel = computed(() =>
  isCvDatabase.value ? (ctx.cvSalaryDropdownLabel ?? '') : ctx.payDropdownLabel,
)
const jobTypeTriggerMuted = computed(() =>
  isCvDatabase.value ? Boolean(ctx.availabilityTriggerMuted) : ctx.jobTypeTriggerMuted,
)
const jobTypeDropdownLabel = computed(() =>
  isCvDatabase.value ? (ctx.availabilityDropdownLabel ?? '') : ctx.jobTypeDropdownLabel,
)

function onCvSalaryInput(ev: Event): void {
  const raw = (ev.target as HTMLInputElement).value.replace(/[^0-9]/g, '')
  ctx.patchCvSalaryMax?.(raw)
}

function onCvSkillsUpdate(skills: string[]): void {
  ctx.patchCvSkills?.(skills)
}
</script>
