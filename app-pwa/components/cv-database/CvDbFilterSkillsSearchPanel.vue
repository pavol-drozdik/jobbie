<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { S } from '~/utils/strings'

const props = withDefaults(
  defineProps<{
    modelValue: string[]
    open?: boolean
    maxSkills?: number
  }>(),
  { open: true, maxSkills: 12 },
)

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
  clear: []
}>()

const search = ref('')
const { results, loading, scheduleSearch, ensureSkill, dispose } = useSkCvSkillSearch()
const ensuringCustom = ref(false)

function skillNorm(name: string): string {
  return name.trim().toLocaleLowerCase('sk-SK')
}

function isSelected(name: string): boolean {
  const n = skillNorm(name)
  return props.modelValue.some((s) => skillNorm(s) === n)
}

function toggleSkill(name: string): void {
  const label = name.trim()
  if (!label) return
  const n = skillNorm(label)
  if (isSelected(label)) {
    emit(
      'update:modelValue',
      props.modelValue.filter((s) => skillNorm(s) !== n),
    )
    return
  }
  if (props.modelValue.length >= props.maxSkills) return
  emit('update:modelValue', [...props.modelValue, label])
}

const trimmedSearch = computed(() => search.value.trim())

const showMinChars = computed(
  () => trimmedSearch.value.length > 0 && trimmedSearch.value.length < 2,
)

const showNoResults = computed(
  () =>
    trimmedSearch.value.length >= 2 &&
    !loading.value &&
    results.value.length === 0,
)

const showUseCustom = computed(() => {
  const q = trimmedSearch.value
  if (q.length < 2 || ensuringCustom.value) return false
  const n = skillNorm(q)
  return !results.value.some((r) => skillNorm(r.name) === n)
})

async function addCustomSkill(): Promise<void> {
  const q = trimmedSearch.value
  if (q.length < 2 || ensuringCustom.value || isSelected(q)) return
  if (props.modelValue.length >= props.maxSkills) return
  ensuringCustom.value = true
  try {
    const row = await ensureSkill(q)
    const label = (row?.name ?? q).trim()
    if (label && !isSelected(label)) {
      emit('update:modelValue', [...props.modelValue, label])
    }
    search.value = ''
  } finally {
    ensuringCustom.value = false
  }
}

watch(search, (q) => {
  scheduleSearch(q)
})

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) {
      search.value = ''
      dispose()
    }
  },
)

onBeforeUnmount(() => {
  dispose()
})
</script>

<template>
  <div class="flex flex-col gap-2">
    <button
      type="button"
      class="w-full is-clickable rounded-[10px] border-0 border-b border-black/10 bg-transparent px-4 py-3 text-left font-dmSans text-lg font-semibold text-black/80 transition-colors hover:bg-marketing-mint"
      @click="emit('clear')"
    >
      {{ S.cvDbSkillsAny }}
    </button>
    <template v-if="modelValue.length">
      <button
        v-for="(skill, index) in modelValue"
        :key="`picked-${skill}-${index}`"
        type="button"
        class="flex w-full is-clickable items-center gap-3 rounded-[10px] border-none bg-transparent px-4 py-2.5 text-left font-dmSans text-lg text-black/80 transition-colors hover:bg-marketing-mint"
        @click="toggleSkill(skill)"
      >
        <span
          class="flex size-5 shrink-0 items-center justify-center rounded border-2 border-marketing-green bg-marketing-mint text-marketing-green"
          aria-hidden="true"
        >
          <AppIcon name="check-circle" :size="14" />
        </span>
        <span>{{ skill }}</span>
      </button>
      <div class="border-t border-black/10" />
    </template>
    <input
      v-model="search"
      type="search"
      autocomplete="off"
      enterkeyhint="search"
      :placeholder="S.skCvSkillSearchPh"
      class="app-form-dropdown__panel-search mx-1"
      @keydown.enter.prevent="void addCustomSkill()"
    >
    <p v-if="showMinChars" class="app-form-dropdown__panel-hint">
      {{ S.skCvSkillMinChars }}
    </p>
    <p v-else-if="trimmedSearch.length === 0" class="app-form-dropdown__panel-hint">
      {{ S.cvDbBasicSkillsPh }}
    </p>
    <p v-else-if="showNoResults" class="app-form-dropdown__panel-hint">
      {{ S.skCvSkillNoResults }}
    </p>
    <div v-else-if="trimmedSearch.length >= 2" class="app-form-dropdown__panel-list max-h-[200px]">
      <button
        v-for="row in results"
        :key="row.id"
        type="button"
        class="app-form-dropdown__option flex items-center gap-3"
        :class="{ 'app-form-dropdown__option--selected': isSelected(row.name) }"
        @click="toggleSkill(row.name)"
      >
        <span
          class="flex size-5 shrink-0 items-center justify-center rounded border-2 border-black/25"
          :class="isSelected(row.name) ? 'border-marketing-green bg-marketing-mint' : ''"
          aria-hidden="true"
        >
          <AppIcon v-if="isSelected(row.name)" name="check-circle" :size="14" />
        </span>
        <span>{{ row.name }}</span>
      </button>
      <button
        v-if="showUseCustom"
        type="button"
        class="app-form-dropdown__option--custom"
        @click="void addCustomSkill()"
      >
        {{ S.skCvSkillUseCustom.replace('{name}', trimmedSearch) }}
      </button>
    </div>
    <p v-if="loading || ensuringCustom" class="app-form-dropdown__panel-hint">
      {{ ensuringCustom ? S.skCvSkillEnsuring : S.loading }}
    </p>
    <p
      v-if="modelValue.length >= maxSkills"
      class="m-0 px-2 text-sm font-medium text-black/45"
    >
      Maximálne {{ maxSkills }} zručností.
    </p>
  </div>
</template>
