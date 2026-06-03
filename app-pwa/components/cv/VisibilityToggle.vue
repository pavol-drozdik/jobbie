<template>
  <!-- Kompaktný riadok (predvolené) -->
  <label
    v-if="!prominent"
    class="inline-flex cursor-pointer items-center gap-3 rounded-2xl border border-black/[0.08] bg-white px-4 py-3 shadow-sm"
  >
    <AppCheckbox v-model="inner" />
    <span class="font-dmSans text-[15px] font-semibold text-black/80">{{ inner ? S.cvVisibilityPublic : S.cvVisibilityPrivate }}</span>
  </label>

  <!-- Krok 3 sprievodcu: výrazná karta s vysvetlením -->
  <div
    v-else
    class="rounded-[20px] border border-marketing-green/30 bg-marketing-panel/50 p-5 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)]"
  >
    <h4 class="m-0 font-dmSans text-[22px] font-black leading-tight text-black">
      {{ S.cvWizardVisibilityCardTitle }}
    </h4>
    <p class="m-0 mt-2 max-w-[52rem] font-dmSans text-[15px] leading-snug text-black/[0.62]">
      {{ S.cvWizardVisibilityCardLead }}
    </p>
    <label
      class="mt-4 flex cursor-pointer items-start gap-3.5 rounded-2xl border border-black/[0.08] bg-white p-4 shadow-sm transition-colors hover:border-marketing-green/40"
    >
      <AppCheckbox v-model="inner" class="mt-1" />
      <span class="min-w-0 flex-1">
        <span class="block font-dmSans text-lg font-extrabold text-black">{{ S.cvWizardVisibilityChoiceTitle }}</span>
        <span class="mt-1.5 block font-dmSans text-[15px] leading-snug text-black/[0.58]">
          {{ inner ? S.cvWizardVisibilityChoiceHelpOn : S.cvWizardVisibilityChoiceHelpOff }}
        </span>
        <span class="mt-2 inline-block rounded-full bg-marketing-soft px-3 py-1 font-dmSans text-xs font-bold text-marketing-green">
          {{ inner ? S.cvVisibilityPublic : S.cvVisibilityPrivate }}
        </span>
      </span>
    </label>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { S } from '~/utils/strings'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    /** Veľká karta s nadpisom (krok 3 sprievodcu životopisu). */
    prominent?: boolean
  }>(),
  { prominent: false },
)

const emit = defineEmits<{
  'update:modelValue': [boolean]
}>()

const inner = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v),
})
</script>
