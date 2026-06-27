<script setup lang="ts">
import type { ContentReportTargetType } from '~/composables/useContentReport'
import ContentReportDialog from '~/components/marketing/ContentReportDialog.vue'

const props = withDefaults(
  defineProps<{
    targetType: ContentReportTargetType
    targetId: string
    reportLabel?: string
    /** White pill on top of listing hero image */
    onHero?: boolean
  }>(),
  { onHero: false },
)

const summaryClass = computed(() =>
  props.onHero
    ? 'inline-flex h-10 w-10 is-clickable list-none items-center justify-center rounded-full border border-white/20 bg-white/90 text-[13px] font-semibold text-black/55 shadow-sm backdrop-blur-sm hover:bg-white hover:text-black/75 [&::-webkit-details-marker]:hidden'
    : 'inline-flex h-10 w-10 is-clickable list-none items-center justify-center rounded-full border border-black/10 bg-white text-[13px] font-semibold text-black/55 hover:bg-neutral-50 hover:text-black/75 [&::-webkit-details-marker]:hidden',
)

const moreDetailsRef = ref<HTMLDetailsElement | null>(null)
const dialogOpen = ref(false)

function closeMenu(): void {
  if (moreDetailsRef.value) {
    moreDetailsRef.value.open = false
  }
}

function onReportClick(): void {
  closeMenu()
  dialogOpen.value = true
}
</script>

<template>
  <div>
    <details ref="moreDetailsRef" class="relative shrink-0">
      <summary :class="summaryClass">
        <span class="sr-only">{{ S.contentReportMoreOptions }}</span>
        <span
          aria-hidden="true"
          class="select-none text-[1.05rem] leading-none tracking-[-0.1em] text-black/40"
        >⋮</span>
      </summary>
      <div
        class="absolute right-0 top-[calc(100%+6px)] z-20 min-w-[12.5rem] overflow-hidden rounded-xl border border-black/[0.08] bg-white py-1 shadow-md"
      >
        <button
          type="button"
          class="flex w-full is-clickable px-4 py-2.5 text-left text-[14px] font-semibold text-black/80 hover:bg-black/[0.04]"
          @click="onReportClick"
        >
          {{ props.reportLabel ?? S.contentReportAction }}
        </button>
      </div>
    </details>
    <ContentReportDialog
      v-model:open="dialogOpen"
      :target-type="props.targetType"
      :target-id="props.targetId"
    />
  </div>
</template>
