<template>
  <input
    ref="inputRef"
    type="checkbox"
    :id="id"
    :name="name"
    :value="value"
    :checked="modelValue"
    :disabled="disabled"
    :required="required"
    :class="checkboxClass"
    v-bind="attrsWithoutClass"
    @change="onChange"
  >
</template>

<script setup lang="ts">
import { computed, ref, useAttrs, watch } from 'vue'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    variant?: 'default' | 'onDark'
    indeterminate?: boolean
    disabled?: boolean
    required?: boolean
    id?: string
    name?: string
    value?: string | number
  }>(),
  {
    variant: 'default',
    indeterminate: false,
    disabled: false,
    required: false,
    id: undefined,
    name: undefined,
    value: undefined,
  },
)

const emit = defineEmits<{
  'update:modelValue': [boolean]
}>()

const attrs = useAttrs()
const inputRef = ref<HTMLInputElement | null>(null)

const attrsWithoutClass = computed(() => {
  const { class: _class, ...rest } = attrs
  return rest
})

const variantClass = computed(() =>
  props.variant === 'onDark'
    ? 'border border-white/45 bg-white/10 focus-visible:ring-white/70'
    : 'border border-black/20 bg-white focus-visible:ring-marketing-green/35',
)

const checkboxClass = computed(() => [
  'app-checkbox size-5 shrink-0 rounded accent-marketing-green focus:outline-none focus-visible:ring-2',
  variantClass.value,
  attrs.class,
])

function onChange(event: Event): void {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.checked)
}

function syncIndeterminate(): void {
  const el = inputRef.value
  if (el) {
    el.indeterminate = props.indeterminate
  }
}

watch(
  () => props.indeterminate,
  () => {
    syncIndeterminate()
  },
  { immediate: true },
)

watch(inputRef, () => {
  syncIndeterminate()
})
</script>

<style scoped>
.app-checkbox {
  accent-color: rgb(34 197 94);
}
</style>
