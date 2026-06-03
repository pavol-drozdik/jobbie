<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { SkMunicipalityRow } from '~/utils/sk-municipality'
import { LOCATION_FILTER_ANY_LABEL } from '~/utils/domestic-location-filter'
import { S } from '~/utils/strings'

const props = withDefaults(
  defineProps<{
    modelValue: string
    placeholder?: string
    disabled?: boolean
    /** Form field (default) or catalog filter pill row. */
    variant?: 'default' | 'filter'
    /** Show “Kdekoľvek” / clear at top of panel (filter catalogs). */
    allowAny?: boolean
    anyLabel?: string
    /** Trigger text when value empty (filter: “Lokalita”). Falls back to placeholder. */
    triggerLabelWhenEmpty?: string
    id?: string
  }>(),
  {
    placeholder: 'napríklad Bratislava',
    disabled: false,
    variant: 'default',
    allowAny: false,
    anyLabel: LOCATION_FILTER_ANY_LABEL,
    triggerLabelWhenEmpty: '',
  },
)

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const {
  results,
  loading,
  scheduleSearch,
  ensureMunicipality,
  dispose,
} = useSkMunicipalitySearch()

const open = ref(false)
const searchQuery = ref('')
const ensuring = ref(false)
const rootRef = ref<HTMLElement | null>(null)
const searchInputRef = ref<HTMLInputElement | null>(null)

const isFilter = computed(() => props.variant === 'filter')

const triggerMuted = computed(() => props.modelValue.trim() === '')

const triggerDisplay = computed(() => {
  if (!triggerMuted.value) {
    return props.modelValue
  }
  if (props.triggerLabelWhenEmpty.trim()) {
    return props.triggerLabelWhenEmpty
  }
  return props.placeholder
})

const trimmedQuery = computed(() => searchQuery.value.trim())

const showMinCharsHint = computed(
  () => trimmedQuery.value.length > 0 && trimmedQuery.value.length < 2,
)

const showNoResults = computed(
  () =>
    trimmedQuery.value.length >= 2 &&
    !loading.value &&
    results.value.length === 0,
)

const exactMatchInResults = computed(() => {
  const q = trimmedQuery.value
  if (q.length < 2) return true
  const norm = q.toLocaleLowerCase('sk-SK')
  return results.value.some(
    (r) => r.name.trim().toLocaleLowerCase('sk-SK') === norm,
  )
})

const showUseCustom = computed(
  () => trimmedQuery.value.length >= 2 && !exactMatchInResults.value && !ensuring.value,
)

const triggerClass = computed(() => {
  if (isFilter.value) {
    return 'flex h-[60px] w-full cursor-pointer select-none items-center justify-between rounded-full border-none bg-marketing-soft px-5 font-dmSans text-lg font-normal outline-none ring-marketing-green focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60'
  }
  return 'app-form-dropdown__trigger flex h-14 w-full cursor-pointer select-none items-center justify-between rounded-full bg-marketing-soft px-5 text-left font-dmSans text-lg outline-none ring-marketing-green focus-visible:ring-2 disabled:cursor-not-allowed disabled:text-black/35 app-form-dropdown__trigger--bordered cv-field'
})

const panelClass = computed(() => {
  if (isFilter.value) {
    return 'absolute left-0 right-0 top-[calc(100%+8px)] z-[100] flex max-h-[min(260px,42svh)] min-w-full flex-col rounded-2xl bg-white p-2 shadow-[0_4px_20px_rgba(0,0,0,0.12)] marketing:left-0 marketing:right-auto marketing:max-h-[min(320px,70vh)]'
  }
  return 'app-form-dropdown__panel'
})

function onDocPointerDown(ev: PointerEvent): void {
  if (!open.value) return
  const el = rootRef.value
  if (el && !el.contains(ev.target as Node)) {
    open.value = false
  }
}

function toggleOpen(): void {
  if (props.disabled) return
  open.value = !open.value
  if (open.value) {
    searchQuery.value = props.modelValue.trim()
    void nextTick(() => {
      searchInputRef.value?.focus()
      if (searchQuery.value.trim().length >= 2) {
        scheduleSearch(searchQuery.value)
      }
    })
  }
}

function pickRow(row: SkMunicipalityRow): void {
  emit('update:modelValue', row.name)
  open.value = false
}

function pickAny(): void {
  emit('update:modelValue', '')
  open.value = false
}

async function pickCustom(): Promise<void> {
  const name = trimmedQuery.value
  if (name.length < 2 || ensuring.value) return
  ensuring.value = true
  const row = await ensureMunicipality(name)
  ensuring.value = false
  if (row) {
    pickRow(row)
    return
  }
  emit('update:modelValue', name)
  open.value = false
}

watch(searchQuery, (q) => {
  if (!open.value) return
  scheduleSearch(q)
})

onMounted(() => {
  document.addEventListener('pointerdown', onDocPointerDown, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocPointerDown, true)
  dispose()
})
</script>

<template>
  <div ref="rootRef" class="relative" :class="disabled ? 'cv-field-is-disabled' : ''">
    <button
      :id="id"
      type="button"
      :class="triggerClass"
      :disabled="disabled"
      @click.stop="toggleOpen"
    >
      <span
        class="min-w-0 truncate text-left"
        :class="
          isFilter
            ? triggerMuted
              ? 'text-black/30'
              : 'text-black/80'
            : triggerMuted
              ? 'text-black/30'
              : 'text-black'
        "
      >
        {{ triggerDisplay }}
      </span>
      <AppIcon
        v-if="isFilter"
        name="chevron-right"
        :size="13"
        class="shrink-0 text-black/30 transition-transform duration-200"
        :class="open ? '-rotate-90' : 'rotate-90'"
      />
      <AppIcon
        v-else
        name="chevron-down"
        :size="13"
        class="shrink-0 text-black/30 transition-transform"
        :class="{ 'rotate-180': open }"
      />
    </button>
    <div v-show="open" :class="panelClass">
      <input
        ref="searchInputRef"
        v-model="searchQuery"
        type="search"
        autocomplete="off"
        enterkeyhint="search"
        :placeholder="S.skMunicipalitySearchPh"
        class="app-form-dropdown__panel-search"
        :class="isFilter ? 'mb-2' : ''"
        @click.stop
        @keydown.enter.prevent="void pickCustom()"
      >
      <p v-if="showMinCharsHint" class="app-form-dropdown__panel-hint">
        {{ S.skMunicipalityMinChars }}
      </p>
      <p v-else-if="showNoResults" class="app-form-dropdown__panel-hint">
        {{ S.skMunicipalityNoResults }}
      </p>
      <div class="app-form-dropdown__panel-list min-h-0 flex-1 overflow-y-auto">
        <button
          v-if="allowAny"
          type="button"
          class="app-form-dropdown__option w-full"
          :class="{ 'app-form-dropdown__option--selected': modelValue.trim() === '' }"
          @click.stop="pickAny"
        >
          {{ anyLabel }}
        </button>
        <button
          v-for="row in results"
          :key="row.id"
          type="button"
          class="app-form-dropdown__option w-full"
          :class="{
            'app-form-dropdown__option--selected':
              modelValue.trim().toLocaleLowerCase('sk-SK') === row.name.trim().toLocaleLowerCase('sk-SK'),
          }"
          @click.stop="pickRow(row)"
        >
          {{ row.name }}<span class="text-black/45"> · {{ row.okres }}</span>
        </button>
        <button
          v-if="showUseCustom"
          type="button"
          class="app-form-dropdown__option--custom w-full"
          @click.stop="void pickCustom()"
        >
          {{ S.skMunicipalityUseCustom.replace('{name}', trimmedQuery) }}
        </button>
      </div>
      <p v-if="loading || ensuring" class="app-form-dropdown__panel-hint">
        {{ ensuring ? S.skMunicipalityEnsuring : S.loading }}
      </p>
    </div>
  </div>
</template>
