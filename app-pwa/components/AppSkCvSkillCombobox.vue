<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { S } from '~/utils/strings'

const props = withDefaults(
  defineProps<{
    modelValue: string
    placeholder?: string
    disabled?: boolean
  }>(),
  {
    placeholder: 'Napr. Excel, komunikácia, vedenie vozidla',
    disabled: false,
  },
)

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const {
  results,
  loading,
  scheduleSearch,
  ensureSkill,
  dispose,
} = useSkCvSkillSearch()

const open = ref(false)
const searchQuery = ref('')
const ensuring = ref(false)
const rootRef = ref<HTMLElement | null>(null)
const searchInputRef = ref<HTMLInputElement | null>(null)

const showPlaceholderStyle = computed(() => props.modelValue.trim() === '')

const trimmedQuery = computed(() => searchQuery.value.trim())

const showMinCharsHint = computed(
  () => trimmedQuery.value.length > 0 && trimmedQuery.value.length < 2,
)

const showNoResults = computed(
  () =>
    trimmedQuery.value.length >= 2 &&
    !loading.value &&
    results.value.length === 0,
)

const exactMatchInResults = computed(() => {
  const q = trimmedQuery.value
  if (q.length < 2) return true
  const norm = q.toLocaleLowerCase('sk-SK')
  return results.value.some(
    (r) => r.name.trim().toLocaleLowerCase('sk-SK') === norm,
  )
})

const showUseCustom = computed(
  () => trimmedQuery.value.length >= 2 && !exactMatchInResults.value && !ensuring.value,
)

function onDocPointerDown(ev: PointerEvent): void {
  if (!open.value) return
  const el = rootRef.value
  if (el && !el.contains(ev.target as Node)) {
    open.value = false
  }
}

function toggleOpen(): void {
  if (props.disabled) return
  open.value = !open.value
  if (open.value) {
    searchQuery.value = props.modelValue.trim()
    void nextTick(() => {
      searchInputRef.value?.focus()
      if (searchQuery.value.trim().length >= 2) {
        scheduleSearch(searchQuery.value)
      }
    })
  }
}

function pickRow(name: string): void {
  emit('update:modelValue', name)
  open.value = false
}

function namesMatch(a: string, b: string): boolean {
  return a.trim().toLocaleLowerCase('sk-SK') === b.trim().toLocaleLowerCase('sk-SK')
}

/** When the panel closes, commit typed text so custom values (e.g. C++) are saved. */
async function commitPendingCustom(): Promise<void> {
  const name = trimmedQuery.value
  if (name.length < 2 || ensuring.value) return
  if (namesMatch(name, props.modelValue)) return

  const existing = results.value.find((r) => namesMatch(r.name, name))
  if (existing) {
    pickRow(existing.name)
    return
  }

  await pickCustom()
}

async function pickCustom(): Promise<void> {
  const name = trimmedQuery.value
  if (name.length < 2 || ensuring.value) return
  ensuring.value = true
  const row = await ensureSkill(name)
  ensuring.value = false
  if (row) {
    pickRow(row.name)
    return
  }
  emit('update:modelValue', name)
  open.value = false
}

watch(searchQuery, (q) => {
  if (!open.value) return
  scheduleSearch(q)
})

watch(open, (isOpen, wasOpen) => {
  if (wasOpen && !isOpen) {
    void commitPendingCustom()
  }
})

onMounted(() => {
  document.addEventListener('pointerdown', onDocPointerDown, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocPointerDown, true)
  dispose()
})
</script>

<template>
  <div ref="rootRef" class="relative" :class="disabled ? 'cv-field-is-disabled' : ''">
    <button
      type="button"
      class="app-form-dropdown__trigger flex h-14 w-full cursor-pointer select-none items-center justify-between rounded-full bg-marketing-soft px-5 text-left font-dmSans text-lg outline-none ring-marketing-green focus-visible:ring-2 disabled:cursor-not-allowed disabled:text-black/35 app-form-dropdown__trigger--bordered cv-field"
      :disabled="disabled"
      @click.stop="toggleOpen"
    >
      <span class="min-w-0 truncate" :class="showPlaceholderStyle ? 'text-black/30' : 'text-black'">
        {{ showPlaceholderStyle ? placeholder : modelValue }}
      </span>
      <AppIcon
        name="chevron-down"
        :size="13"
        class="shrink-0 text-black/30 transition-transform"
        :class="{ 'rotate-180': open }"
      />
    </button>
    <div
      v-show="open"
      class="app-form-dropdown__panel"
    >
      <input
        ref="searchInputRef"
        v-model="searchQuery"
        type="search"
        autocomplete="off"
        enterkeyhint="search"
        :placeholder="S.skCvSkillSearchPh"
        class="app-form-dropdown__panel-search"
        @click.stop
        @keydown.enter.prevent="void pickCustom()"
      >
      <p v-if="showMinCharsHint" class="app-form-dropdown__panel-hint">
        {{ S.skCvSkillMinChars }}
      </p>
      <p v-else-if="showNoResults" class="app-form-dropdown__panel-hint">
        {{ S.skCvSkillNoResults }}
      </p>
      <div class="app-form-dropdown__panel-list">
        <button
          v-for="row in results"
          :key="row.id"
          type="button"
          class="app-form-dropdown__option"
          :class="{
            'app-form-dropdown__option--selected':
              modelValue.trim().toLocaleLowerCase('sk-SK') === row.name.trim().toLocaleLowerCase('sk-SK'),
          }"
          @click.stop="pickRow(row.name)"
        >
          {{ row.name }}
        </button>
        <button
          v-if="showUseCustom"
          type="button"
          class="app-form-dropdown__option--custom"
          @click.stop="void pickCustom()"
        >
          {{ S.skCvSkillUseCustom.replace('{name}', trimmedQuery) }}
        </button>
      </div>
      <p v-if="loading || ensuring" class="app-form-dropdown__panel-hint">
        {{ ensuring ? S.skCvSkillEnsuring : S.loading }}
      </p>
    </div>
  </div>
</template>
