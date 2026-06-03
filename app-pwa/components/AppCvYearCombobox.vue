<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  CV_EDU_END_ONGOING,
  CV_YEAR_ABSOLUTE_MIN,
  CV_YEAR_CHUNK_SIZE,
  getCvCalendarYearMax,
  normalizeCvYearCommit,
  searchCvYearOptions,
  type CvYearDropdownOption,
} from '~/utils/cv-year-options'

const props = withDefaults(
  defineProps<{
    modelValue: string
    placeholder?: string
    disabled?: boolean
    searchPlaceholder?: string
    /** Education end year: show „Neukončené“ at top of list. */
    includeOngoing?: boolean
  }>(),
  {
    placeholder: 'Rok',
    disabled: false,
    searchPlaceholder: 'Hľadať rok…',
    includeOngoing: false,
  },
)

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const open = ref(false)
const searchQuery = ref('')
const rootRef = ref<HTMLElement | null>(null)
const searchInputRef = ref<HTMLInputElement | null>(null)
const listRef = ref<HTMLElement | null>(null)

/** Oldest calendar year currently rendered in the browse list (loads older on scroll). */
const oldestLoadedYear = ref(getCvCalendarYearMax() - CV_YEAR_CHUNK_SIZE + 1)

const ongoingOption: CvYearDropdownOption = {
  value: CV_EDU_END_ONGOING,
  label: CV_EDU_END_ONGOING,
}

const triggerLabel = computed(() => {
  if (!props.modelValue) return ''
  if (props.modelValue === CV_EDU_END_ONGOING) return CV_EDU_END_ONGOING
  return props.modelValue
})

const showPlaceholderStyle = computed(() => props.modelValue === '')

const searchInputMode = computed(() => (props.includeOngoing ? 'text' : 'numeric'))

const isSearchActive = computed(() => searchQuery.value.trim().length > 0)

const canLoadOlder = computed(() => oldestLoadedYear.value > CV_YEAR_ABSOLUTE_MIN)

const browseYearOptions = computed((): CvYearDropdownOption[] => {
  const maxY = getCvCalendarYearMax()
  const lo = Math.max(CV_YEAR_ABSOLUTE_MIN, oldestLoadedYear.value)
  const years: CvYearDropdownOption[] = []
  for (let y = maxY; y >= lo; y -= 1) {
    years.push({ value: String(y), label: String(y) })
  }
  return years
})

const displayedOptions = computed((): CvYearDropdownOption[] => {
  if (isSearchActive.value) {
    const found = searchCvYearOptions(searchQuery.value, CV_YEAR_CHUNK_SIZE)
    if (props.includeOngoing) {
      const q = searchQuery.value.trim().toLocaleLowerCase('sk-SK')
      const ongoingMatch = CV_EDU_END_ONGOING.toLocaleLowerCase('sk-SK').includes(q)
      if (ongoingMatch) return [ongoingOption, ...found]
    }
    return found
  }
  const head = props.includeOngoing ? [ongoingOption] : []
  return [...head, ...browseYearOptions.value]
})

const showCustomEnterHint = computed(
  () =>
    isSearchActive.value &&
    displayedOptions.value.length === 0 &&
    /^\d/.test(searchQuery.value.trim()),
)

function resetBrowseWindow(): void {
  oldestLoadedYear.value = getCvCalendarYearMax() - CV_YEAR_CHUNK_SIZE + 1
}

function ensureYearInBrowseWindow(year: number): void {
  if (!Number.isFinite(year)) return
  if (year < oldestLoadedYear.value) {
    oldestLoadedYear.value = Math.max(CV_YEAR_ABSOLUTE_MIN, year)
  }
}

function loadOlderChunk(): void {
  if (!canLoadOlder.value) return
  oldestLoadedYear.value = Math.max(
    CV_YEAR_ABSOLUTE_MIN,
    oldestLoadedYear.value - CV_YEAR_CHUNK_SIZE,
  )
}

function onListScroll(ev: Event): void {
  const el = ev.target as HTMLElement
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 48) {
    loadOlderChunk()
  }
}

function onDocPointerDown(ev: PointerEvent): void {
  if (!open.value) return
  const el = rootRef.value
  if (el && !el.contains(ev.target as Node)) {
    open.value = false
  }
}

function commitFromSearch(): void {
  const q = searchQuery.value.trim()
  const direct = displayedOptions.value.find((o) => o.value === q || o.label === q)
  if (direct) {
    pickOption(direct.value)
    return
  }
  const next = normalizeCvYearCommit(q, { includeOngoing: props.includeOngoing })
  if (next !== null) {
    emit('update:modelValue', next)
    open.value = false
    return
  }
  const opts = displayedOptions.value
  if (opts.length === 1) {
    pickOption(opts[0]!.value)
    return
  }
  const exactInFiltered = opts.find((o) => o.value === q)
  if (exactInFiltered) {
    pickOption(exactInFiltered.value)
  }
}

function onSearchKeydown(ev: KeyboardEvent): void {
  if (ev.key !== 'Enter') return
  ev.preventDefault()
  ev.stopPropagation()
  commitFromSearch()
}

function toggleOpen(): void {
  if (props.disabled) return
  open.value = !open.value
  if (open.value) {
    resetBrowseWindow()
    searchQuery.value = triggerLabel.value
    const y = Number.parseInt(props.modelValue, 10)
    if (Number.isFinite(y)) ensureYearInBrowseWindow(y)
    void nextTick(() => {
      searchInputRef.value?.focus()
      listRef.value?.scrollTo({ top: 0 })
    })
  }
}

function pickOption(value: string): void {
  if (value !== props.modelValue) {
    emit('update:modelValue', value)
  }
  open.value = false
}

watch(
  () => props.modelValue,
  (v) => {
    if (!open.value) {
      searchQuery.value = v ?? ''
    }
  },
)

onMounted(() => {
  document.addEventListener('pointerdown', onDocPointerDown, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocPointerDown, true)
})
</script>

<template>
  <div ref="rootRef" class="relative" :class="disabled ? 'cv-field-is-disabled' : ''">
    <button
      type="button"
      class="app-form-dropdown__trigger flex h-14 w-full cursor-pointer select-none items-center justify-between rounded-full bg-marketing-soft px-5 text-left font-dmSans text-lg outline-none ring-marketing-green focus-visible:ring-2 disabled:cursor-not-allowed disabled:text-black/35 app-form-dropdown__trigger--bordered cv-field"
      :disabled="disabled"
      @click.stop="toggleOpen"
    >
      <span class="min-w-0 truncate" :class="showPlaceholderStyle ? 'text-black/30' : 'text-black'">
        {{ showPlaceholderStyle ? placeholder : triggerLabel }}
      </span>
      <AppIcon
        name="chevron-down"
        :size="13"
        class="shrink-0 text-black/30 transition-transform"
        :class="{ 'rotate-180': open }"
      />
    </button>
    <div
      v-show="open"
      class="app-form-dropdown__panel app-form-dropdown__panel--compact"
    >
      <input
        ref="searchInputRef"
        v-model="searchQuery"
        type="text"
        :inputmode="searchInputMode"
        autocomplete="off"
        enterkeyhint="done"
        :placeholder="searchPlaceholder"
        class="app-form-dropdown__panel-search"
        @click.stop
        @keydown="onSearchKeydown"
      >
      <p v-if="showCustomEnterHint" class="app-form-dropdown__panel-hint">
        Stlačte Enter pre rok {{ searchQuery.trim() }} (4 číslice, {{ CV_YEAR_ABSOLUTE_MIN }}–{{ getCvCalendarYearMax() }}).
      </p>
      <div
        v-if="displayedOptions.length > 0"
        ref="listRef"
        class="app-form-dropdown__panel-list"
        @scroll="onListScroll"
      >
        <button
          v-for="opt in displayedOptions"
          :key="opt.value"
          type="button"
          class="app-form-dropdown__option"
          :class="{ 'app-form-dropdown__option--selected': modelValue === opt.value }"
          @click.stop="pickOption(opt.value)"
        >
          {{ opt.label }}
        </button>
        <p
          v-if="!isSearchActive && canLoadOlder"
          class="app-form-dropdown__panel-hint pointer-events-none text-center"
        >
          Posuňte nižšie pre staršie roky…
        </p>
      </div>
    </div>
  </div>
</template>
