<script setup lang="ts">
import AppSkCvSkillCombobox from '~/components/AppSkCvSkillCombobox.vue'
import { wizardPillBase, wizardPillClass } from '~/utils/wizard-ui'

const props = withDefaults(
  defineProps<{
    modelValue: string[]
    maxTags?: number
    disabled?: boolean
    placeholder?: string
  }>(),
  {
    maxTags: 24,
    disabled: false,
    placeholder: '',
  },
)

const emit = defineEmits<{ 'update:modelValue': [value: string[]] }>()

const { ensureSkill } = useSkCvSkillSearch()
const draftSkill = ref('')
const adding = ref(false)

function tagNorm(s: string): string {
  return s.trim().toLocaleLowerCase('sk-SK')
}

function hasTag(name: string): boolean {
  const n = tagNorm(name)
  return props.modelValue.some((t) => tagNorm(t) === n)
}

async function addSkill(name: string): Promise<void> {
  const trimmed = name.trim()
  if (!trimmed || props.disabled || adding.value) return
  if (props.modelValue.length >= props.maxTags) return
  if (hasTag(trimmed)) {
    draftSkill.value = ''
    return
  }
  adding.value = true
  try {
    const row = await ensureSkill(trimmed)
    const label = (row?.name ?? trimmed).trim()
    if (!label || hasTag(label)) {
      draftSkill.value = ''
      return
    }
    emit('update:modelValue', [...props.modelValue, label])
    draftSkill.value = ''
  } finally {
    adding.value = false
  }
}

function removeTag(index: number): void {
  if (props.disabled) return
  emit(
    'update:modelValue',
    props.modelValue.filter((_, i) => i !== index),
  )
}

watch(draftSkill, (name, prev) => {
  const trimmed = name.trim()
  if (!trimmed || trimmed === prev.trim()) return
  void addSkill(trimmed)
})

const canAddMore = computed(
  () => !props.disabled && props.modelValue.length < props.maxTags,
)
</script>

<template>
  <div class="flex flex-col gap-3">
    <div v-if="modelValue.length" class="flex flex-wrap gap-2.5">
      <button
        v-for="(tag, index) in modelValue"
        :key="`${tag}-${index}`"
        type="button"
        :class="[wizardPillBase, wizardPillClass(true), 'gap-2 pr-4']"
        :disabled="disabled"
        @click="removeTag(index)"
      >
        <span>{{ tag }}</span>
        <span aria-hidden="true" class="text-base leading-none opacity-80">×</span>
        <span class="sr-only">Odstrániť</span>
      </button>
    </div>
    <AppSkCvSkillCombobox
      v-if="canAddMore"
      v-model="draftSkill"
      :placeholder="placeholder"
      :disabled="disabled || adding"
    />
    <p
      v-if="modelValue.length >= maxTags"
      class="m-0 text-sm font-medium text-black/45"
    >
      Maximálne {{ maxTags }} zručností.
    </p>
  </div>
</template>
