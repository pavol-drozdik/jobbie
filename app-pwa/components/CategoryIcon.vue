<template>
  <AppIcon :name="iconName" :size="size ?? 14" :class="iconClass" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getCategoryIconName, type AppIconName } from '~/utils/app-icons'

const props = withDefaults(
  defineProps<{
    category?: string | null
    size?: number
    urgent?: boolean
    iconClass?: string
  }>(),
  {
    category: null,
    urgent: false,
    iconClass: undefined,
  },
)

const iconName = computed((): AppIconName =>
  props.urgent ? 'bolt' : getCategoryIconName(props.category),
)
</script>
