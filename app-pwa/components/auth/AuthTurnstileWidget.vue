<template>
  <div
    v-if="enabled && active !== false"
    :key="remountKey"
    ref="containerRef"
    class="min-h-[65px] w-full"
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

defineExpose({ reset, mount, removeWidget })
</script>
