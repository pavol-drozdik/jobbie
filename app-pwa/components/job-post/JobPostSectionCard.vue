<template>
  <section :class="[wizardSectionCardClass, 'flex flex-col gap-6']">
    <h3 v-if="title" class="m-0 text-[28px] font-black text-black">
      {{ title }}
    </h3>
    <slot />
  </section>
</template>

<script setup lang="ts">
import { wizardSectionCardClass } from '~/utils/wizard-ui'

defineProps<{
  title?: string
}>()
</script>
