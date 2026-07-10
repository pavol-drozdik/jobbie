<template>
  <div v-if="available" class="flex flex-col gap-1.5">
    <label class="flex is-clickable items-start gap-2.5">
      <AppCheckbox v-model="expanded" class="mt-0.5" />
      <span class="text-sm font-medium leading-relaxed text-black/70">
        {{ S.havePromoCodeLabel }}
      </span>
    </label>
    <div v-if="expanded" class="flex flex-col gap-1.5">
      <div v-if="withTrailingIcon" class="relative flex items-center">
        <input
          :id="inputId"
          v-model="code"
          type="text"
          autocomplete="off"
          :placeholder="S.promoCodePlaceholder"
          :class="inputClass"
        />
        <i
          class="fa-solid fa-ticket pointer-events-none absolute right-[18px] text-[15px] text-black/30"
        />
      </div>
      <input
        v-else
        :id="inputId"
        v-model="code"
        type="text"
        autocomplete="off"
        :placeholder="S.promoCodePlaceholder"
        :class="inputClass"
      />
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { S } from '~/utils/strings'

withDefaults(
  defineProps<{
    available?: boolean
    inputId?: string
    inputClass: string
    withTrailingIcon?: boolean
  }>(),
  {
    available: false,
    inputId: undefined,
    withTrailingIcon: false,
  },
)

const code = defineModel<string>({ required: true })

const expanded = ref(!!code.value.trim())

watch(
  () => code.value,
  (value) => {
    if (value.trim()) {
      expanded.value = true
    }
  },
)

watch(expanded, (show) => {
  if (!show) {
    code.value = ''
  }
})
</script>
