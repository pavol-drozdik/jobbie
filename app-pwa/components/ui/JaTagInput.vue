<template>
  <div class="flex flex-col gap-2">
    <div
      class="addjob-textarea cv-field flex min-h-[3.5rem] flex-wrap items-center gap-1.5 !min-h-[3.5rem] resize-none px-2 py-1.5 ring-marketing-green focus-within:ring-2"
    >
      <span
        v-for="(tag, idx) in modelValue"
        :key="`${tag}-${idx}`"
        class="inline-flex items-center gap-1.5 rounded-full bg-marketing-mint px-2.5 py-1 text-sm font-medium text-marketing-green"
      >
        <span class="max-w-[200px] truncate">{{ tag }}</span>
        <button
          type="button"
          class="is-clickable border-0 bg-transparent p-0 text-marketing-green/70 hover:text-marketing-green"
          :aria-label="`Odstrániť ${tag}`"
          @click="removeAt(idx)"
        >
          <span aria-hidden="true" class="text-base leading-none">×</span>
        </button>
      </span>
      <input
        ref="inputRef"
        v-model="draft"
        type="text"
        :placeholder="modelValue.length === 0 ? placeholder : ''"
        :maxlength="maxLength"
        class="min-w-[180px] flex-1 border-0 bg-transparent px-1.5 py-1 text-base text-black outline-none placeholder:text-black/40"
        @keydown="onKeyDown"
        @blur="commitDraft"
      >
    </div>
    <p v-if="hint" class="text-xs text-black/50">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    modelValue: string[]
    placeholder?: string
    hint?: string
    maxTags?: number
    maxLength?: number
  }>(),
  {
    placeholder: '',
    hint: '',
    maxTags: 24,
    maxLength: 80,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const inputRef = ref<HTMLInputElement | null>(null)
const draft = ref('')

function commitDraft(): void {
  const t = draft.value.trim()
  if (!t) {
    draft.value = ''
    return
  }
  if (props.modelValue.includes(t)) {
    draft.value = ''
    return
  }
  if (props.modelValue.length >= props.maxTags) {
    draft.value = ''
    return
  }
  emit('update:modelValue', [...props.modelValue, t])
  draft.value = ''
}

function removeAt(idx: number): void {
  const next = [...props.modelValue]
  next.splice(idx, 1)
  emit('update:modelValue', next)
}

function onKeyDown(e: KeyboardEvent): void {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault()
    commitDraft()
    return
  }
  if (e.key === 'Backspace' && draft.value === '' && props.modelValue.length > 0) {
    removeAt(props.modelValue.length - 1)
  }
}
</script>
