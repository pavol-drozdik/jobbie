<script setup lang="ts">
import { defineAsyncComponent, ref } from 'vue'

const AppRichTextEditor = defineAsyncComponent(
  () => import('~/components/AppRichTextEditor.vue'),
)

defineProps<{
  modelValue: string
  placeholder?: string
  disabled?: boolean
  minHeightClass?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const editorRef = ref<{ getPlainText: () => string } | null>(null)

defineExpose({
  getPlainText(): string {
    return editorRef.value?.getPlainText() ?? ''
  },
})
</script>

<template>
  <ClientOnly>
    <AppRichTextEditor
      ref="editorRef"
      :model-value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :min-height-class="minHeightClass"
      @update:model-value="emit('update:modelValue', $event)"
    />
    <template #fallback>
      <div
        class="rich-text-editor cv-field min-h-[120px] animate-pulse rounded-2xl border border-black/[0.06] bg-marketing-soft"
        aria-busy="true"
      />
    </template>
  </ClientOnly>
</template>
