<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { S } from '~/utils/strings'

export type IdLabelOption = { id: number; label: string }

const props = withDefaults(
  defineProps<{
    modelValue: number[]
    options: ReadonlyArray<IdLabelOption>
    placeholder?: string
    searchPlaceholder?: string
    disabled?: boolean
    maxSelection?: number
    bordered?: boolean
    /** Open panel above trigger (e.g. last field before wizard footer). */
    dropUp?: boolean
  }>(),
  {
    placeholder: undefined,
    searchPlaceholder: undefined,
    disabled: false,
    maxSelection: 64,
    bordered: true,
    dropUp: false,
  },
)

const emit = defineEmits<{ 'update:modelValue': [value: number[]] }>()

const open = ref(false)
const searchQuery = ref('')
const rootRef = ref<HTMLElement | null>(null)
const searchInputRef = ref<HTMLInputElement | null>(null)

const triggerPlaceholder = computed(
  () => props.placeholder ?? S.benefitsMultiSelectPlaceholder,
)
const panelSearchPh = computed(
  () => props.searchPlaceholder ?? S.benefitsSearchPlaceholder,
)

const selectedSet = computed(() => new Set(props.modelValue))

const selectedOptions = computed(() =>
  props.modelValue
    .map((id) => props.options.find((o) => o.id === id))
    .filter((o): o is IdLabelOption => o != null),
)

const triggerText = computed(() => {
  const n = props.modelValue.length
  if (n === 0) {
    return ''
  }
  if (n === 1) {
    return selectedOptions.value[0]?.label ?? ''
  }
  return S.benefitsMultiSelectCount.replace('{count}', String(n))
})

const showPlaceholderStyle = computed(() => props.modelValue.length === 0)

const atMax = computed(() => props.modelValue.length >= props.maxSelection)

const filteredOptions = computed(() => {
  const q = searchQuery.value.trim().toLocaleLowerCase('sk-SK')
  if (!q) {
    return props.options
  }
  return props.options.filter((o) =>
    o.label.toLocaleLowerCase('sk-SK').includes(q),
  )
})

const triggerClass = computed(() => {
  const base =
    'app-form-dropdown__trigger flex min-h-14 w-full cursor-pointer select-none items-center justify-between rounded-full px-5 py-3 text-left font-dmSans text-lg outline-none ring-marketing-green focus-visible:ring-2 disabled:cursor-not-allowed disabled:text-black/35'
  if (props.bordered) {
    return `${base} bg-marketing-soft app-form-dropdown__trigger--bordered cv-field`
  }
  return `${base} border-none bg-marketing-soft`
})

function emitSorted(ids: number[]): void {
  emit(
    'update:modelValue',
    [...ids].sort((a, b) => a - b),
  )
}

function toggleId(id: number): void {
  const set = new Set(props.modelValue)
  if (set.has(id)) {
    set.delete(id)
  } else {
    if (set.size >= props.maxSelection) {
      return
    }
    set.add(id)
  }
  emitSorted([...set])
}

function removeId(id: number): void {
  const set = new Set(props.modelValue)
  set.delete(id)
  emitSorted([...set])
}

function isRowDisabled(id: number): boolean {
  return atMax.value && !selectedSet.value.has(id)
}

function onDocPointerDown(ev: PointerEvent): void {
  if (!open.value) {
    return
  }
  const el = rootRef.value
  if (el && !el.contains(ev.target as Node)) {
    open.value = false
  }
}

function toggleOpen(): void {
  if (props.disabled) {
    return
  }
  open.value = !open.value
  if (open.value) {
    searchQuery.value = ''
    void nextTick(() => searchInputRef.value?.focus())
  }
}

onMounted(() => {
  document.addEventListener('pointerdown', onDocPointerDown, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocPointerDown, true)
})
</script>

<template>
  <div
    ref="rootRef"
    class="relative"
    :class="[disabled ? 'cv-field-is-disabled' : '', open ? 'z-30' : '']"
  >
    <button
      type="button"
      :class="triggerClass"
      :disabled="disabled"
      @click.stop="toggleOpen"
    >
      <span class="min-w-0 truncate" :class="showPlaceholderStyle ? 'text-black/30' : 'text-black'">
        {{ showPlaceholderStyle ? triggerPlaceholder : triggerText }}
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
      :class="dropUp ? 'app-form-dropdown__panel--dropup' : ''"
    >
      <input
        ref="searchInputRef"
        v-model="searchQuery"
        type="search"
        autocomplete="off"
        :placeholder="panelSearchPh"
        class="app-form-dropdown__panel-search"
        @click.stop
      >
      <p
        v-if="filteredOptions.length === 0"
        class="app-form-dropdown__panel-hint"
      >
        {{ S.benefitsNoResults }}
      </p>
      <div v-else class="app-form-dropdown__panel-list">
        <button
          v-for="opt in filteredOptions"
          :key="opt.id"
          type="button"
          class="app-form-dropdown__option flex items-start gap-2.5 text-left"
          :class="{
            'app-form-dropdown__option--selected': selectedSet.has(opt.id),
            'cursor-not-allowed opacity-45': isRowDisabled(opt.id),
          }"
          :disabled="isRowDisabled(opt.id)"
          @click.stop="toggleId(opt.id)"
        >
          <span
            class="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border border-black/20"
            :class="selectedSet.has(opt.id) ? 'border-marketing-green bg-marketing-green' : 'bg-white'"
            aria-hidden="true"
          >
            <span v-if="selectedSet.has(opt.id)" class="text-[10px] font-bold leading-none text-white">✓</span>
          </span>
          <span>{{ opt.label }}</span>
        </button>
      </div>
    </div>
    <div
      v-if="selectedOptions.length > 0"
      class="mt-3 flex flex-wrap gap-2"
    >
      <span
        v-for="opt in selectedOptions"
        :key="opt.id"
        class="inline-flex max-w-full items-center gap-1.5 rounded-full bg-marketing-soft py-1.5 pl-3 pr-1.5 text-sm font-medium text-black/80"
      >
        <span class="min-w-0 truncate">{{ opt.label }}</span>
        <button
          type="button"
          class="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-black/10 text-black/60 hover:bg-black/15 hover:text-black"
          :aria-label="S.remove"
          :disabled="disabled"
          @click.stop="removeId(opt.id)"
        >
          <AppIcon name="x" :size="11" />
        </button>
      </span>
    </div>
  </div>
</template>
