<template>
  <NuxtLink
    v-if="to"
    :to="to"
    :class="mergedClass"
    :aria-disabled="disabled ? 'true' : undefined"
    :tabindex="disabled ? -1 : undefined"
    v-bind="linkPassthroughAttrs"
    @click="onLinkClick"
  >
    <slot />
  </NuxtLink>
  <button
    v-else
    :type="type"
    :disabled="disabled"
    :class="mergedClass"
    v-bind="passthroughAttrs"
    @click="onButtonClick"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
import { computed, useAttrs } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

defineOptions({ inheritAttrs: false })

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const props = withDefaults(
  defineProps<{
    type?: 'button' | 'submit' | 'reset'
    disabled?: boolean
    variant?: 'primary' | 'outline' | 'ghost' | 'danger'
    size?: 'sm' | 'md' | 'lg'
    block?: boolean
    /** When set, renders a NuxtLink with the same visual styles as a button */
    to?: RouteLocationRaw
  }>(),
  {
    type: 'button',
    disabled: false,
    variant: 'primary',
    size: 'md',
    block: false,
  },
)

const attrs = useAttrs()

const sizeClass = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'min-h-9 h-9 px-4 text-sm font-bold'
    case 'lg':
      return 'min-h-12 h-12 px-6 text-base font-bold'
    default:
      return 'min-h-11 h-11 px-5 text-[15px] font-bold'
  }
})

const variantClass = computed(() => {
  switch (props.variant) {
    case 'outline':
      return 'rounded-full border-[1.5px] border-marketing-green bg-white text-marketing-green transition-colors hover:bg-marketing-mint'
    case 'ghost':
      return 'rounded-full border border-transparent bg-transparent font-semibold text-black/70 transition-colors hover:bg-black/[0.06]'
    case 'danger':
      return 'rounded-full border border-red-200 bg-white text-red-600 transition-colors hover:bg-red-50'
    default:
      return 'rounded-full border-none bg-marketing-green text-white transition-opacity hover:opacity-90 disabled:opacity-50'
  }
})

const passthroughAttrs = computed(() => {
  const raw = attrs as Record<string, unknown>
  const { class: _c, onClick: _click, ...rest } = raw
  return rest
})

function onButtonClick(event: MouseEvent): void {
  if (props.disabled) {
    event.preventDefault()
    event.stopPropagation()
    return
  }
  emit('click', event)
}

const linkPassthroughAttrs = computed(() => {
  const { class: _c, type: _t, ...rest } = attrs as Record<string, unknown>
  return rest
})

function onLinkClick(e: MouseEvent): void {
  if (props.disabled) {
    e.preventDefault()
    e.stopPropagation()
  }
}

const mergedClass = computed(() => {
  const base = [
    'inline-flex cursor-pointer items-center justify-center gap-2 no-underline font-dmSans outline-none ring-marketing-green focus-visible:ring-2 focus-visible:ring-offset-0',
    sizeClass.value,
    variantClass.value,
    props.block ? 'w-full' : '',
    props.disabled && props.to ? 'pointer-events-none cursor-not-allowed opacity-50' : '',
  ]
    .filter(Boolean)
    .join(' ')
  const extra = attrs.class
  if (!extra) return base
  if (typeof extra === 'string') return [base, extra].join(' ')
  if (Array.isArray(extra)) return [base, ...extra].join(' ')
  return [base, extra].filter(Boolean).join(' ')
})
</script>
