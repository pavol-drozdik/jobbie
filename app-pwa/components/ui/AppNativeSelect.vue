<template>
  <select
    :class="mergedClass"
    :value="selectValue"
    :disabled="disabled"
    v-bind="passthroughAttrs"
    @change="onChange"
  >
    <slot />
  </select>
</template>

<script setup lang="ts">
import { computed, useAttrs } from 'vue'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    modelValue?: string | number | null
    disabled?: boolean
    /** toolbar: pill on tinted chrome; field: full-width card form */
    variant?: 'toolbar' | 'field'
  }>(),
  { modelValue: '', disabled: false, variant: 'toolbar' },
)

const selectValue = computed(() => {
  const v = props.modelValue
  if (v === null || v === undefined) return ''
  return String(v)
})

const emit = defineEmits<{ 'update:modelValue': [v: string] }>()

const attrs = useAttrs()

const baseClass = computed(() => {
  const common =
    'font-dmSans outline-none transition-colors focus-visible:ring-2 focus-visible:ring-marketing-green disabled:is-disabled-cursor disabled:opacity-70'
  if (props.variant === 'field') {
    return [
      'addjob-input cv-field w-full is-clickable appearance-none pr-10',
      common,
    ].join(' ')
  }
  return [
    'box-border h-11 min-h-[44px] rounded-full border border-black/15 bg-marketing-surface px-4 text-sm font-semibold text-black/80',
    'focus:border-marketing-green focus:bg-white',
    common,
  ].join(' ')
})

const passthroughAttrs = computed(() => {
  const { class: _c, ...rest } = attrs as Record<string, unknown>
  return rest
})

const mergedClass = computed(() => {
  const extra = attrs.class
  if (!extra) return baseClass.value
  if (typeof extra === 'string') return [baseClass.value, extra].filter(Boolean).join(' ')
  if (Array.isArray(extra)) return [baseClass.value, ...extra].filter(Boolean).join(' ')
  return [baseClass.value, extra]
})

function onChange(e: Event): void {
  const v = (e.target as HTMLSelectElement).value
  emit('update:modelValue', v)
}
</script>
