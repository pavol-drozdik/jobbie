<template>
  <label class="relative inline-block h-7 w-12 shrink-0 is-clickable">
    <input
      :checked="modelValue"
      type="checkbox"
      class="peer sr-only"
      role="switch"
      :aria-checked="modelValue"
      :aria-label="label"
      @change="onChange"
    >
    <span
      class="absolute inset-0 rounded-full bg-gray-300 transition-colors peer-checked:bg-marketing-green"
      aria-hidden="true"
    />
    <span
      class="absolute left-1 top-1 size-5 rounded-full bg-white transition-transform peer-checked:translate-x-5"
      aria-hidden="true"
    />
  </label>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: boolean
  label: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

function onChange(event: Event): void {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.checked)
}
</script>
