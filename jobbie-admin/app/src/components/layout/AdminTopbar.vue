<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAdminApiHealth } from '../../composables/useAdminApiHealth'
import AppHelpDrawer from '../AppHelpDrawer.vue'

const route = useRoute()
const { reachable, checking } = useAdminApiHealth()

const pageTitle = computed(() => {
  const meta = route.meta?.title
  return typeof meta === 'string' ? meta : null
})

const apiStatusLabel = computed(() => {
  if (checking.value) return 'Kontrolujem…'
  if (reachable.value === false) return 'API nedostupné'
  if (reachable.value) return 'API OK'
  return 'API…'
})

const apiStatusClass = computed(() => {
  if (reachable.value === false) return 'bg-red-100 text-red-700'
  if (reachable.value) return 'bg-emerald-100 text-emerald-700'
  return 'bg-slate-100 text-slate-600'
})
</script>

<template>
  <header
    class="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-3"
  >
    <div class="min-w-0">
      <p v-if="pageTitle" class="m-0 truncate text-sm font-medium text-slate-900">
        {{ pageTitle }}
      </p>
    </div>
    <div class="flex shrink-0 items-center gap-2">
      <span
        class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
        :class="apiStatusClass"
      >
        <span
          class="h-1.5 w-1.5 rounded-full"
          :class="
            reachable === false
              ? 'bg-red-500'
              : reachable
                ? 'bg-emerald-500'
                : 'bg-slate-400'
          "
        />
        {{ apiStatusLabel }}
      </span>
      <AppHelpDrawer />
    </div>
  </header>
</template>
