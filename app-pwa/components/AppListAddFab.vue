<template>
  <Teleport to="body">
    <NuxtLink
      :to="to"
      class="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom,0px))] right-[max(1rem,env(safe-area-inset-right,0px))] z-[85] flex size-14 min-h-[56px] min-w-[56px] cursor-pointer items-center justify-center rounded-full border-none bg-marketing-green text-white no-underline shadow-[0_4px_18px_rgba(34,197,94,0.45)] outline-none ring-offset-2 transition-[transform,box-shadow] hover:scale-[1.06] hover:shadow-[0_6px_22px_rgba(34,197,94,0.5)] focus-visible:ring-2 focus-visible:ring-marketing-green active:scale-[0.98]"
      :aria-label="ariaLabel"
      :title="ariaLabel"
    >
      <AppIcon name="plus" :size="28" class="text-white" aria-hidden="true" />
    </NuxtLink>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{
  to: string
  ariaLabel: string
}>()
</script>
