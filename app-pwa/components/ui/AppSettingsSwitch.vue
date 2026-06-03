<template>
  <button
    :id="id"
    type="button"
    role="switch"
    class="relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-0 p-0.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-marketing-green focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45"
    :class="modelValue ? 'bg-marketing-green' : 'bg-black/15'"
    :aria-checked="modelValue"
    :aria-label="label"
    :disabled="disabled"
    @click="toggle"
  >
    <span
      class="pointer-events-none block size-6 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-transform"
      :class="modelValue ? 'translate-x-5' : 'translate-x-0'"
    />
  </button>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    modelValue: boolean
    label: string
    id?: string
    disabled?: boolean
  }>(),
  { disabled: false, id: undefined },
)

const emit = defineEmits<{
  'update:modelValue': [boolean]
}>()

function toggle(): void {
  if (props.disabled) {
    return
  }
  emit('update:modelValue', !props.modelValue)
}
</script>
