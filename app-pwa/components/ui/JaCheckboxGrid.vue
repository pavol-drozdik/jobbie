<template>
  <fieldset class="m-0 border-0 p-0">
    <legend
      v-if="legend"
      class="mb-3 block text-base font-semibold text-black"
    >{{ legend }}</legend>
    <div class="grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2">
      <label
        v-for="(opt, idx) in visibleOptions"
        :key="opt.id"
        class="flex is-clickable items-start gap-2.5 text-sm leading-snug text-black/80"
        :class="idx >= initialVisible && !showAll ? 'hidden' : ''"
      >
        <AppCheckbox
          class="mt-0.5"
          :model-value="modelValue.includes(opt.id)"
          @update:model-value="(checked) => onToggle(opt.id, checked)"
        />
        <span>{{ opt.label }}</span>
      </label>
    </div>
    <button
      v-if="canCollapse"
      type="button"
      class="mt-3 inline-flex is-clickable items-center gap-1 border-0 bg-transparent p-0 text-sm font-semibold text-marketing-green hover:underline"
      @click="showAll = !showAll"
    >
      {{ showAll ? lessLabel : moreLabel }}
    </button>
  </fieldset>
</template>

<script setup lang="ts">
type OptionShape = { id: number; label: string }

const props = withDefaults(
  defineProps<{
    modelValue: number[]
    options: ReadonlyArray<OptionShape>
    legend?: string
    collapseAfter?: number
    moreLabel?: string
    lessLabel?: string
  }>(),
  {
    legend: '',
    collapseAfter: 0,
    moreLabel: 'Zobraziť viac',
    lessLabel: 'Zobraziť menej',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: number[]]
}>()

const initialVisible = computed(() => {
  const n = Number(props.collapseAfter)
  return Number.isFinite(n) && n > 0 ? n : props.options.length
})

const showAll = ref(false)
const canCollapse = computed(() => props.options.length > initialVisible.value)
const visibleOptions = computed(() => props.options)

function onToggle(id: number, checked: boolean): void {
  const set = new Set(props.modelValue)
  if (checked) {
    set.add(id)
  } else {
    set.delete(id)
  }
  emit(
    'update:modelValue',
    [...set].sort((a, b) => a - b),
  )
}
</script>
