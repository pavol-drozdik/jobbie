<template>
  <div
    v-if="enabled && active !== false"
    :key="remountKey"
    ref="containerRef"
    class="pointer-events-none fixed -left-[9999px] top-0 h-px w-px overflow-hidden opacity-0"
    aria-hidden="true"
    data-captcha="turnstile"
  />
</template>

<script setup lang="ts">
const token = defineModel<string>({ default: '' })

const props = withDefaults(
  defineProps<{
    active?: boolean
  }>(),
  { active: true },
)

const {
  enabled,
  captchaToken,
  containerRef,
  remountKey,
  mount,
  reset,
  removeWidget,
  ensureToken,
  refreshToken,
} = useTurnstileWidget()

watch(captchaToken, (value) => {
  token.value = value
})

watch(
  () => props.active,
  (isActive) => {
    if (isActive) {
      nextTick(() => {
        void mount()
      })
    } else {
      removeWidget()
    }
  },
  { immediate: true },
)

defineExpose({ reset, mount, removeWidget, ensureToken, refreshToken })
</script>
