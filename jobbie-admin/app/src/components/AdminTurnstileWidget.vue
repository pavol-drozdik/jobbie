<script setup lang="ts">
import { nextTick, onMounted, watch } from 'vue'
import { useTurnstileWidget } from '../composables/useTurnstileWidget'

const token = defineModel<string>({ default: '' })

const props = withDefaults(
  defineProps<{
    active?: boolean
  }>(),
  { active: true },
)

const { enabled, captchaToken, containerRef, remountKey, mount, reset, removeWidget } =
  useTurnstileWidget()

watch(captchaToken, (value) => {
  token.value = value
})

watch(
  () => props.active,
  (isActive) => {
    if (isActive && enabled.value) {
      nextTick(() => {
        void mount()
      })
    } else {
      removeWidget()
    }
  },
  { immediate: true },
)

onMounted(() => {
  if (props.active !== false && enabled.value) {
    nextTick(() => {
      void mount()
    })
  }
})

defineExpose({ reset })
</script>

<template>
  <div
    v-if="enabled && active !== false"
    :key="remountKey"
    ref="containerRef"
    style="min-height: 65px; width: 100%; margin: 0.75rem 0"
    data-captcha="turnstile"
  />
</template>
