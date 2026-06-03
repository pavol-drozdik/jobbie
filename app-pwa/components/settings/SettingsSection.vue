<template>
  <section :class="rootClass">
    <header class="mb-4 flex items-start gap-3">
      <span
        v-if="icon"
        class="flex size-10 shrink-0 items-center justify-center rounded-full bg-marketing-panel text-marketing-green"
      >
        <AppIcon :name="icon" :size="18" />
      </span>
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-2">
          <h2 class="m-0 font-dmSans text-[17px] font-extrabold leading-snug text-black">
            {{ title }}
          </h2>
          <span
            v-if="resolvedStatusLabel"
            class="rounded-full px-2.5 py-0.5 text-[11px] font-bold leading-tight"
            :class="statusPillClass"
          >
            {{ resolvedStatusLabel }}
          </span>
        </div>
        <p v-if="description" class="mt-1 font-dmSans text-sm leading-snug text-black/55">
          {{ description }}
        </p>
      </div>
    </header>
    <slot />
  </section>
</template>

<script setup lang="ts">
import { S } from '~/utils/strings'

const props = withDefaults(
  defineProps<{
    title: string
    description?: string
    icon?: string
    status?: 'on' | 'off' | 'pending' | null
    statusLabel?: string
    first?: boolean
  }>(),
  {
    description: '',
    icon: '',
    status: null,
    statusLabel: '',
    first: false,
  },
)

const resolvedStatusLabel = computed(() => {
  if (props.statusLabel) {
    return props.statusLabel
  }
  switch (props.status) {
    case 'on':
      return S.settingsSecurityStatusOn
    case 'off':
      return S.settingsSecurityStatusOff
    case 'pending':
      return S.settingsSecurityStatusPending
    default:
      return ''
  }
})

const statusPillClass = computed(() => {
  switch (props.status) {
    case 'on':
      return 'bg-marketing-mint text-marketing-green'
    case 'pending':
      return 'bg-amber-50 text-amber-900'
    case 'off':
      return 'bg-black/[0.06] text-black/50'
    default:
      return 'bg-marketing-mint text-marketing-green'
  }
})

const rootClass = computed(() =>
  props.first ? 'pb-8' : 'border-t border-black/10 pt-8 pb-8',
)
</script>
