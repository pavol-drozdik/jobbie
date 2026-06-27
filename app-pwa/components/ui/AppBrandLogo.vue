<template>
  <component
    :is="linkTo ? NuxtLink : 'div'"
    :to="linkTo"
    class="inline-flex shrink-0 items-center no-underline outline-none ring-marketing-green focus-visible:ring-2"
    :class="rootClass"
    :aria-label="linkTo ? 'JOBBIE — domov' : undefined"
  >
    <img
      :src="imageSrc"
      alt=""
      :width="logoDimensions.width"
      :height="logoDimensions.height"
      :class="resolvedImageClass"
      decoding="async"
      fetchpriority="high"
    >
  </component>
</template>

<script setup lang="ts">
import { BRAND_FAVICON_PATH, BRAND_LOGO_PATH, BRAND_LOGO_WHITE_PATH } from '~/utils/brand-assets'

const props = withDefaults(
  defineProps<{
    /** `mark` = icon only; `full` = wordmark; `full-white` = wordmark on dark backgrounds */
    variant?: 'mark' | 'full' | 'full-white'
    /** When set, wraps the logo in a home link */
    linkTo?: string
    rootClass?: string
    imageClass?: string
  }>(),
  {
    variant: 'mark',
    rootClass: '',
  },
)

const NuxtLink = resolveComponent('NuxtLink')

const imageSrc = computed((): string => {
  if (props.variant === 'full-white') return BRAND_LOGO_WHITE_PATH
  if (props.variant === 'full') return BRAND_LOGO_PATH
  return BRAND_FAVICON_PATH
})

const resolvedImageClass = computed(
  () =>
    props.imageClass ??
    (props.variant === 'mark'
      ? 'size-9 rounded-[10px]'
      : 'h-8 w-auto max-w-[min(100%,11rem)] sm:h-9'),
)

/** SVG viewBox 6823×2010 — reserve layout space for CLS. */
const logoDimensions = computed((): { width: number; height: number } => {
  if (props.variant === 'mark') {
    return { width: 36, height: 36 }
  }
  const imageClass = resolvedImageClass.value
  if (imageClass.includes('h-9')) {
    return { width: 122, height: 36 }
  }
  return { width: 108, height: 32 }
})
</script>
