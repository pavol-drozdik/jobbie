<template>
  <AppConfirmDialog
    v-if="state.options"
    v-model:open="state.open"
    :variant="state.options.variant ?? 'confirm'"
    :title="state.options.title"
    :message="state.options.message"
    :detail="state.options.detail"
    :confirm-danger="state.options.confirmDanger"
    :confirm-text="state.options.confirmText"
    :cancel-text="state.options.cancelText"
    @confirm="() => settle(true)"
    @cancel="() => settle(false)"
  />
</template>

<script setup lang="ts">
// Mounted once in app layout; resolves promises from useConfirm() across the app.
import { useConfirm, useConfirmState } from '~/composables/useConfirm'

const state = useConfirmState()
const { settle } = useConfirm()
</script>
