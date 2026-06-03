<template>
  <form
    class="list-search-shell"
    :class="$attrs.class"
    @submit.prevent="emit('submit')"
  >
    <input
      :value="modelValue"
      class="list-search-input"
      :placeholder="placeholder"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    >
    <button
      type="submit"
      class="flex size-10 shrink-0 items-center justify-center rounded-full border-none bg-marketing-green p-0 text-white"
      :aria-label="S.navHladat"
    >
      <AppIcon name="search" :size="18" class="text-white" />
    </button>
  </form>
</template>

<script setup lang="ts">
import { S } from '~/utils/strings'

defineProps<{
  modelValue: string
  placeholder: string
}>()

defineOptions({ inheritAttrs: false })

const emit = defineEmits<{
  'update:modelValue': [value: string]
  submit: []
}>()
</script>
