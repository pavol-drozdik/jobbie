<template>
  <div
    :class="
      variant === 'field'
        ? 'w-full min-w-0'
        : APPLICANT_STATUS_DROPDOWN_CLASS
    "
  >
    <AppFormDropdown
      :model-value="selectValue"
      :options="displayOptions"
      :placeholder="S.applicantsChangeStatus"
      :variant="variant === 'field' ? 'default' : 'toolbar'"
      :bordered="variant === 'field'"
      :disabled="disabled"
      @update:model-value="onPick"
    />
  </div>
</template>

<script setup lang="ts">
import { APPLICANT_STATUS_DROPDOWN_CLASS } from '~/utils/applicants-card-styles'
import { S } from '~/utils/strings'
import {
  EMPLOYER_STATUS_DROPDOWN_STATUSES,
  STATUS_SK_LABELS,
  employerStatusPicklistValue,
  isEmployerStatusPicklistValue,
  type EmployerSettableStatus,
} from '~/utils/applicant-status'

const props = withDefaults(
  defineProps<{
    modelValue?: string
    excludeStatus?: string
    variant?: 'toolbar' | 'field'
    disabled?: boolean
  }>(),
  { modelValue: '', variant: 'toolbar', disabled: false },
)

const emit = defineEmits<{
  change: [status: EmployerSettableStatus]
}>()

const picklistValue = computed(() => employerStatusPicklistValue(props.modelValue ?? ''))

const selectValue = ref(picklistValue.value)

watch(picklistValue, (next) => {
  selectValue.value = next
})

const visibleStatuses = computed(() =>
  EMPLOYER_STATUS_DROPDOWN_STATUSES.filter((s) => {
    if (props.excludeStatus && s === props.excludeStatus) return false
    if (picklistValue.value && s === picklistValue.value) return false
    return true
  }),
)

const dropdownOptions = computed(() =>
  visibleStatuses.value.map((s) => ({
    value: s,
    label: STATUS_SK_LABELS[s],
  })),
)

/** Current status must appear in options so the trigger shows the Slovak label. */
const displayOptions = computed(() => {
  const current = picklistValue.value
  if (!current) return dropdownOptions.value
  if (dropdownOptions.value.some((o) => o.value === current)) {
    return dropdownOptions.value
  }
  return [
    { value: current, label: STATUS_SK_LABELS[current as EmployerSettableStatus] },
    ...dropdownOptions.value,
  ]
})

function onPick(value: string): void {
  if (!value) return
  if (!isEmployerStatusPicklistValue(value)) return
  if (value === picklistValue.value) return
  emit('change', value)
  selectValue.value = value
}
</script>
