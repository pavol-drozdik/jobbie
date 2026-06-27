<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

interface AppFormDropdownOption {
  readonly value: string
  readonly label: string
  /** When set, shows {@link CategoryIcon} beside the label (canonical category slug). */
  readonly categorySlug?: string
}

const props = withDefaults(
  defineProps<{
    modelValue: string
    options: readonly AppFormDropdownOption[]
    placeholder?: string
    disabled?: boolean
    /** Subtle border/shadow; bg follows parent (soft panel on white, white on soft). */
    bordered?: boolean
    /** When modelValue equals this, show placeholder styling (e.g. month "Mesiac"). */
    emptyValue?: string
    /** default: full-width form field; toolbar: compact trigger for rich-text toolbar */
    variant?: 'default' | 'toolbar'
    id?: string
  }>(),
  {
    placeholder: 'Vyberte možnosť',
    disabled: false,
    bordered: false,
    emptyValue: undefined,
    variant: 'default',
    id: undefined,
  },
)

const triggerClass = computed(() => {
  const isToolbar = props.variant === 'toolbar'
  const base =
    'app-form-dropdown__trigger flex is-clickable select-none items-center justify-between rounded-full text-left font-dmSans outline-none ring-marketing-green focus-visible:ring-2 disabled:is-disabled-cursor disabled:text-black/35'
  if (isToolbar) {
    return `${base} app-form-dropdown__trigger--toolbar app-form-dropdown__trigger--bordered cv-field`
  }
  const size = 'flex h-14 w-full px-5 text-lg'
  if (props.bordered) {
    return `${base} ${size} bg-marketing-soft app-form-dropdown__trigger--bordered cv-field`
  }
  return `${base} ${size} border-none bg-marketing-soft`
})

const panelClass = computed(() => {
  const parts = ['app-form-dropdown__panel', 'app-form-dropdown__panel--compact']
  if (props.variant === 'toolbar') {
    parts.push('app-form-dropdown__panel--toolbar')
  }
  return parts.join(' ')
})

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const open = ref(false)
const rootRef = ref<HTMLElement | null>(null)

const triggerText = computed(() => {
  if (props.modelValue === '') {
    return ''
  }
  const hit = props.options.find((o) => o.value === props.modelValue)
  return hit?.label ?? props.modelValue
})

const showPlaceholder = computed(() => {
  if (props.modelValue === '') return true
  if (props.emptyValue !== undefined && props.modelValue === props.emptyValue) return true
  return false
})

function toggleOpen(): void {
  if (props.disabled) {
    return
  }
  open.value = !open.value
}

function pick(value: string): void {
  emit('update:modelValue', value)
  open.value = false
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
      :id="id"
      type="button"
      :class="triggerClass"
      :disabled="disabled"
      :aria-expanded="open"
      aria-haspopup="listbox"
      @click.stop="toggleOpen"
    >
      <span :class="showPlaceholder ? 'text-black/30' : 'text-black'">
        {{ showPlaceholder ? placeholder : triggerText }}
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
      :class="panelClass"
      role="listbox"
    >
      <div class="app-form-dropdown__panel-list">
        <button
          v-for="opt in options"
          :key="opt.value === '' ? '__placeholder' : opt.value"
          type="button"
          class="app-form-dropdown__option flex items-center gap-3"
          :class="{ 'app-form-dropdown__option--selected': modelValue === opt.value }"
          @click.stop="pick(opt.value)"
        >
          <CategoryIcon
            v-if="opt.categorySlug"
            :category="opt.categorySlug"
            :size="18"
            icon-class="shrink-0 text-marketing-green"
          />
          <span>{{ opt.label }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
