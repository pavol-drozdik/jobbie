<template>
  <div
    role="radiogroup"
    class="inline-flex flex-wrap items-stretch gap-1 rounded-full bg-black/[0.06] p-1"
  >
    <button
      v-for="opt in options"
      :key="opt.value"
      type="button"
      role="radio"
      :aria-checked="modelValue === opt.value"
      class="cursor-pointer rounded-full border-0 px-4 py-2 text-sm font-semibold outline-none ring-marketing-green transition-colors focus-visible:ring-2"
      :class="
        modelValue === opt.value
          ? 'bg-marketing-green text-white'
          : 'bg-transparent text-black/65 hover:text-black'
      "
      @click="emit('update:modelValue', opt.value)"
    >
      {{ opt.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
type Option = { value: string; label: string }

defineProps<{
  modelValue: string
  options: ReadonlyArray<Option>
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>
