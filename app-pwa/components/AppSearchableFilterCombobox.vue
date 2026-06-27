<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { LOCATION_FILTER_ANY_LABEL } from '~/utils/domestic-location-filter'
import { S } from '~/utils/strings'

export interface SearchableFilterOption {
  readonly value: string
  readonly label: string
}

const props = withDefaults(
  defineProps<{
    modelValue: string
    options: readonly SearchableFilterOption[]
    disabled?: boolean
    allowAny?: boolean
    anyLabel?: string
    triggerLabelWhenEmpty?: string
    searchPlaceholder?: string
    id?: string
  }>(),
  {
    disabled: false,
    allowAny: true,
    anyLabel: LOCATION_FILTER_ANY_LABEL,
    triggerLabelWhenEmpty: '',
    searchPlaceholder: '',
  },
)

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const open = ref(false)
const searchQuery = ref('')
const rootRef = ref<HTMLElement | null>(null)
const searchInputRef = ref<HTMLInputElement | null>(null)

const trimmedQuery = computed(() => searchQuery.value.trim())

const searchPh = computed(() => props.searchPlaceholder || S.skMunicipalitySearchPh)

const triggerText = computed(() => {
  const v = props.modelValue.trim()
  if (!v) {
    return props.triggerLabelWhenEmpty || props.anyLabel
  }
  const hit = props.options.find((o) => o.value === v)
  return hit?.label ?? v
})

const triggerMuted = computed(() => props.modelValue.trim() === '')

const filteredOptions = computed(() => {
  const q = trimmedQuery.value.toLocaleLowerCase('sk-SK')
  const list = props.options.filter((o) => o.value !== '')
  if (!q) {
    return list
  }
  return list.filter((o) => o.label.toLocaleLowerCase('sk-SK').includes(q))
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
    searchQuery.value = ''
    void nextTick(() => {
      searchInputRef.value?.focus()
    })
  }
}

function pickValue(value: string): void {
  emit('update:modelValue', value)
  open.value = false
}

onMounted(() => {
  document.addEventListener('pointerdown', onDocPointerDown, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocPointerDown, true)
})
</script>

<template>
  <div ref="rootRef" class="relative">
    <button
      :id="id"
      type="button"
      class="flex h-[60px] w-full is-clickable select-none items-center justify-between rounded-full border-none bg-marketing-soft px-5 font-dmSans text-lg font-normal outline-none ring-marketing-green focus-visible:ring-2 disabled:is-disabled-cursor disabled:opacity-60"
      :class="triggerMuted ? 'text-black/30' : 'text-black/80'"
      :disabled="disabled"
      @click.stop="toggleOpen"
    >
      <span class="min-w-0 truncate text-left">{{ triggerText }}</span>
      <AppIcon
        name="chevron-right"
        :size="13"
        class="shrink-0 text-black/30 transition-transform duration-200"
        :class="open ? '-rotate-90' : 'rotate-90'"
      />
    </button>
    <div
      v-show="open"
      class="absolute left-0 right-0 top-[calc(100%+8px)] z-[100] flex max-h-[min(260px,42svh)] min-w-full flex-col rounded-2xl bg-white p-2 shadow-[0_4px_20px_rgba(0,0,0,0.12)] marketing:left-0 marketing:right-auto marketing:max-h-[min(320px,70vh)]"
    >
      <input
        ref="searchInputRef"
        v-model="searchQuery"
        type="search"
        autocomplete="off"
        enterkeyhint="search"
        :placeholder="searchPh"
        class="app-form-dropdown__panel-search mb-2"
        @click.stop
      >
      <div class="min-h-0 flex-1 overflow-y-auto">
        <button
          v-if="allowAny"
          type="button"
          class="app-form-dropdown__option w-full"
          :class="{ 'app-form-dropdown__option--selected': modelValue.trim() === '' }"
          @click.stop="pickValue('')"
        >
          {{ anyLabel }}
        </button>
        <button
          v-for="opt in filteredOptions"
          :key="opt.value"
          type="button"
          class="app-form-dropdown__option w-full"
          :class="{ 'app-form-dropdown__option--selected': modelValue.trim() === opt.value }"
          @click.stop="pickValue(opt.value)"
        >
          {{ opt.label }}
        </button>
        <p
          v-if="filteredOptions.length === 0 && trimmedQuery"
          class="app-form-dropdown__panel-hint"
        >
          {{ S.skMunicipalityNoResults }}
        </p>
      </div>
    </div>
  </div>
</template>
