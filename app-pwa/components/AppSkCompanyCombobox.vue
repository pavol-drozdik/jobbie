<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { SkCompanyRow } from '~/utils/sk-company'
import { S } from '~/utils/strings'

const props = withDefaults(
  defineProps<{
    modelValue: string
    placeholder?: string
    disabled?: boolean
  }>(),
  {
    placeholder: 'Názov firmy',
    disabled: false,
  },
)

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const { results, loading, scheduleSearch, dispose } = useSkCompanySearch()

const open = ref(false)
const searchQuery = ref('')
const rootRef = ref<HTMLElement | null>(null)
const searchInputRef = ref<HTMLInputElement | null>(null)

const showPlaceholderStyle = computed(() => props.modelValue.trim() === '')

const trimmedQuery = computed(() => searchQuery.value.trim())

const minQueryLen = 3

const showMinCharsHint = computed(
  () => trimmedQuery.value.length > 0 && trimmedQuery.value.length < minQueryLen,
)

const showNoResults = computed(
  () =>
    trimmedQuery.value.length >= minQueryLen &&
    !loading.value &&
    results.value.length === 0,
)

const exactMatchInResults = computed(() => {
  const q = trimmedQuery.value
  if (q.length < minQueryLen) return true
  const norm = q.toLocaleLowerCase('sk-SK')
  return results.value.some(
    (r) => r.name.trim().toLocaleLowerCase('sk-SK') === norm,
  )
})

const showUseCustom = computed(
  () => trimmedQuery.value.length >= minQueryLen && !exactMatchInResults.value,
)

function companySubtitle(row: SkCompanyRow): string {
  const parts: string[] = []
  if (row.municipality?.trim()) parts.push(row.municipality.trim())
  if (row.ico) parts.push(`IČO ${row.ico}`)
  return parts.join(' · ')
}

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
      if (searchQuery.value.trim().length >= minQueryLen) {
        scheduleSearch(searchQuery.value)
      }
    })
  }
}

function pickRow(row: SkCompanyRow): void {
  emit('update:modelValue', row.name)
  open.value = false
}

function pickCustom(): void {
  const name = trimmedQuery.value
  if (name.length < minQueryLen) return
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
      type="button"
      class="app-form-dropdown__trigger flex h-14 w-full is-clickable select-none items-center justify-between rounded-full bg-marketing-soft px-5 text-left font-dmSans text-lg outline-none ring-marketing-green focus-visible:ring-2 disabled:is-disabled-cursor disabled:text-black/35 app-form-dropdown__trigger--bordered cv-field"
      :disabled="disabled"
      @click.stop="toggleOpen"
    >
      <span class="min-w-0 truncate" :class="showPlaceholderStyle ? 'text-black/30' : 'text-black'">
        {{ showPlaceholderStyle ? placeholder : modelValue }}
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
      class="app-form-dropdown__panel"
    >
      <input
        ref="searchInputRef"
        v-model="searchQuery"
        type="search"
        autocomplete="off"
        enterkeyhint="search"
        :placeholder="S.skCompanySearchPh"
        class="app-form-dropdown__panel-search"
        @click.stop
        @keydown.enter.prevent="pickCustom()"
      >
      <p v-if="showMinCharsHint" class="app-form-dropdown__panel-hint">
        {{ S.skCompanyMinChars }}
      </p>
      <p v-else-if="showNoResults" class="app-form-dropdown__panel-hint">
        {{ S.skMunicipalityNoResults }}
      </p>
      <div class="app-form-dropdown__panel-list">
        <button
          v-for="row in results"
          :key="row.id"
          type="button"
          class="app-form-dropdown__option"
          :class="{
            'app-form-dropdown__option--selected':
              modelValue.trim().toLocaleLowerCase('sk-SK') === row.name.trim().toLocaleLowerCase('sk-SK'),
          }"
          @click.stop="pickRow(row)"
        >
          {{ row.name }}<span v-if="companySubtitle(row)" class="text-black/45"> · {{ companySubtitle(row) }}</span>
        </button>
        <button
          v-if="showUseCustom"
          type="button"
          class="app-form-dropdown__option--custom"
          @click.stop="pickCustom()"
        >
          {{ S.skCompanyUseCustom.replace('{name}', trimmedQuery) }}
        </button>
      </div>
      <p v-if="loading" class="app-form-dropdown__panel-hint">
        {{ S.loading }}
      </p>
    </div>
  </div>
</template>
