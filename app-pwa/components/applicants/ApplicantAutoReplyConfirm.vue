<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[210] flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      @click.self="emit('cancel')"
    >
      <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 class="m-0 text-lg font-bold text-black">{{ title }}</h3>
        <p v-if="message" class="mt-3 text-sm text-black/70">{{ message }}</p>
        <p v-if="preview" class="mt-3 rounded-lg bg-marketing-surface/80 px-3 py-2 text-sm italic text-black/65">
          {{ preview }}
        </p>
        <div class="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          <AppButton variant="outline" class="w-full sm:w-auto" @click="emit('cancel')">
            {{ S.cancel }}
          </AppButton>
          <AppButton variant="outline" class="w-full sm:w-auto" @click="emit('moveWithout')">
            {{ S.applicantsMoveWithoutSend }}
          </AppButton>
          <AppButton class="w-full sm:w-auto" @click="emit('moveAndSend')">
            {{ S.applicantsMoveAndSend }}
          </AppButton>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { S } from '~/utils/strings'

defineProps<{
  open: boolean
  title: string
  message: string
  preview?: string
}>()

const emit = defineEmits<{
  cancel: []
  moveWithout: []
  moveAndSend: []
}>()
</script>
