<template>
  <div
    class="flex min-h-[52px] items-start justify-between gap-4 py-4 first:pt-0 last:pb-0"
    :class="disabled ? 'opacity-50' : ''"
  >
    <div class="min-w-0 flex-1">
      <label
        :for="inputId"
        class="block cursor-pointer font-dmSans text-[15px] font-semibold leading-snug text-black"
        :class="disabled ? 'cursor-not-allowed' : ''"
      >
        {{ label }}
      </label>
      <p v-if="hint" class="mt-1 font-dmSans text-[13px] leading-snug text-black/45">
        {{ hint }}
      </p>
    </div>
    <label
      class="relative mt-0.5 inline-block h-7 w-12 shrink-0"
      :class="disabled ? 'pointer-events-none cursor-not-allowed' : 'cursor-pointer'"
    >
      <input
        :id="inputId"
        v-model="inner"
        type="checkbox"
        class="peer sr-only"
        :disabled="disabled"
        role="switch"
        :aria-checked="inner"
      >
      <span
        class="absolute inset-0 rounded-full bg-gray-300 transition-colors peer-checked:bg-marketing-green peer-disabled:opacity-60"
        aria-hidden="true"
      />
      <span
        class="absolute left-1 top-1 size-5 rounded-full bg-white transition-transform peer-checked:translate-x-5"
        aria-hidden="true"
      />
    </label>
  </div>
</template>

<script setup lang="ts">
import { computed, useId } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    label: string
    hint?: string
    disabled?: boolean
    id?: string
  }>(),
  {
    hint: '',
    disabled: false,
    id: '',
  },
)

const emit = defineEmits<{
  'update:modelValue': [boolean]
}>()

const autoId = useId()
const inputId = computed(() => props.id || `settings-toggle-${autoId}`)

const inner = computed({
  get: () => props.modelValue,
  set: (v: boolean) => {
    if (!props.disabled) {
      emit('update:modelValue', v)
    }
  },
})
</script>
