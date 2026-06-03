<script setup lang="ts">
import {
  CV_DRIVING_LICENSE_CATEGORIES,
  type CvDrivingLicenseCategory,
  isCvDriverLicenseCategoryActive,
  toggleCvDriverLicenseCategory,
} from '~/utils/cv-driving-license-categories'
import { wizardPillBase, wizardPillClass } from '~/utils/wizard-ui'

const props = withDefaults(
  defineProps<{
    modelValue: CvDrivingLicenseCategory[]
    disabled?: boolean
  }>(),
  { disabled: false },
)

const emit = defineEmits<{
  'update:modelValue': [value: CvDrivingLicenseCategory[]]
}>()

function onToggle(category: CvDrivingLicenseCategory): void {
  if (props.disabled) return
  emit(
    'update:modelValue',
    toggleCvDriverLicenseCategory(props.modelValue, category),
  )
}
</script>

<template>
  <div class="grid grid-cols-4 gap-2.5 sm:grid-cols-8">
    <button
      v-for="lic in CV_DRIVING_LICENSE_CATEGORIES"
      :key="lic"
      type="button"
      :class="[
        wizardPillBase,
        wizardPillClass(isCvDriverLicenseCategoryActive(modelValue, lic)),
        'w-full min-w-0 px-2',
      ]"
      :disabled="disabled"
      @click="onToggle(lic)"
    >
      {{ lic }}
    </button>
  </div>
</template>
