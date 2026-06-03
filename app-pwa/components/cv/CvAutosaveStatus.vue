<template>
  <p
    class="m-0 min-h-[1.25rem] text-right text-[13px] font-medium"
    :class="status === 'saving' ? 'text-amber-600' : status === 'saved' ? 'text-marketing-green' : status === 'error' ? 'text-red-600' : 'text-black/30'"
  >
    <span v-if="status === 'saving'">{{ S.cvAutosaveSaving }}</span>
    <span v-else-if="status === 'saved'">{{ S.cvAutosaveSaved }}</span>
    <span v-else-if="status === 'error'">Chyba ukladania</span>
  </p>
</template>

<script setup lang="ts">
import { S } from '~/utils/strings'
import type { CvSaveStatus } from '~/composables/useCv'

defineProps<{
  status: CvSaveStatus
}>()
</script>
