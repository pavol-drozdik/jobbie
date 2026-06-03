<template>
  <div class="flex flex-col gap-3">
    <div
      v-for="(row, idx) in modelValue"
      :key="`${row.id}-${idx}`"
      class="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:gap-3"
    >
      <AppNativeSelect
        :model-value="String(row.id)"
        variant="field"
        class="sm:flex-1"
        :aria-label="optionLabel"
        @update:model-value="(v) => onUpdateId(idx, v as string)"
      >
        <option value="" disabled>{{ optionPlaceholder }}</option>
        <option
          v-for="opt in options"
          :key="opt.id"
          :value="String(opt.id)"
          :disabled="idMap.has(opt.id) && opt.id !== row.id"
        >
          {{ opt.label }}
        </option>
      </AppNativeSelect>
      <AppNativeSelect
        :model-value="row.level"
        variant="field"
        class="sm:w-64"
        :aria-label="levelLabel"
        @update:model-value="(v) => onUpdateLevel(idx, v as string)"
      >
        <option v-for="lvl in levels" :key="lvl.value" :value="lvl.value">
          {{ lvl.label }}
        </option>
      </AppNativeSelect>
      <button
        type="button"
        class="inline-flex h-10 cursor-pointer items-center justify-center rounded-full border border-black/15 bg-white px-3 text-sm font-semibold text-black/70 outline-none transition-colors hover:bg-black/[0.04] sm:h-12"
        :aria-label="removeLabel"
        @click="removeAt(idx)"
      >
        <span aria-hidden="true" class="text-lg leading-none">×</span>
      </button>
    </div>
    <button
      type="button"
      class="mt-1 inline-flex w-fit cursor-pointer items-center gap-1.5 border-0 bg-transparent p-0 text-sm font-semibold text-marketing-green hover:underline"
      @click="addRow"
    >
      <span aria-hidden="true" class="text-base leading-none">+</span>
      {{ addLabel }}
    </button>
  </div>
</template>

<script setup lang="ts">
type Option = { id: number; label: string }
type LevelOption = { value: string; label: string }
type Row = { id: number; level: string }

const props = withDefaults(
  defineProps<{
    modelValue: Row[]
    options: ReadonlyArray<Option>
    levels: ReadonlyArray<LevelOption>
    addLabel: string
    optionLabel?: string
    optionPlaceholder?: string
    levelLabel?: string
    removeLabel?: string
    defaultLevel?: string
  }>(),
  {
    optionLabel: 'Vyber',
    optionPlaceholder: 'Vyber',
    levelLabel: 'Úroveň',
    removeLabel: 'Odstrániť',
    defaultLevel: 'undefined',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: Row[]]
}>()

const idMap = computed(() => new Set(props.modelValue.map((r) => r.id)))

function addRow(): void {
  const used = new Set(props.modelValue.map((r) => r.id))
  const first = props.options.find((o) => !used.has(o.id))
  if (!first) {
    return
  }
  emit('update:modelValue', [
    ...props.modelValue,
    { id: first.id, level: props.defaultLevel },
  ])
}

function removeAt(idx: number): void {
  const next = [...props.modelValue]
  next.splice(idx, 1)
  emit('update:modelValue', next)
}

function onUpdateId(idx: number, value: string): void {
  const numeric = Number.parseInt(value, 10)
  if (!Number.isFinite(numeric)) {
    return
  }
  const next = [...props.modelValue]
  if (!next[idx]) {
    return
  }
  next[idx] = { ...next[idx], id: numeric }
  emit('update:modelValue', next)
}

function onUpdateLevel(idx: number, value: string): void {
  const next = [...props.modelValue]
  if (!next[idx]) {
    return
  }
  next[idx] = { ...next[idx], level: value }
  emit('update:modelValue', next)
}
</script>
