<template>
  <div
    v-if="showTop || showUrgent || showNew"
    class="pointer-events-none absolute z-[1] flex flex-col items-end gap-1.5"
    :class="cornerClass"
  >
    <div
      v-if="showTop"
      class="flex w-fit items-center justify-center rounded-full bg-red-600 px-2.5 font-dmSans font-bold tracking-wide text-white"
      :class="pillSizeClass"
    >
      {{ S.listingBadgeTop }}
    </div>
    <div
      v-if="showUrgent"
      class="flex w-fit items-center justify-center gap-1 rounded-full bg-orange-500 px-2.5 font-dmSans font-semibold text-white"
      :class="pillSizeClass"
    >
      <AppIcon v-if="urgentWithBolt" name="bolt" :size="12" class="text-white" />
      <span>{{ S.sectionUrgent }}</span>
    </div>
    <div
      v-if="showNew"
      class="flex w-fit items-center justify-center rounded-full bg-marketing-green px-2.5 font-dmSans font-semibold text-white"
      :class="pillSizeClass"
    >
      {{ S.jobCardBadgeNew }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { S } from '~/utils/strings'

const props = withDefaults(
  defineProps<{
    showTop?: boolean
    showUrgent?: boolean
    showNew?: boolean
    urgentWithBolt?: boolean
    cornerClass?: string
    size?: 'sm' | 'md'
  }>(),
  {
    showTop: false,
    showUrgent: false,
    showNew: false,
    urgentWithBolt: false,
    cornerClass: 'right-2.5 top-2.5',
    size: 'sm',
  },
)

const pillSizeClass = computed(() =>
  props.size === 'md' ? 'py-1.5 text-sm font-medium' : 'py-1 text-[13px]',
)
</script>
