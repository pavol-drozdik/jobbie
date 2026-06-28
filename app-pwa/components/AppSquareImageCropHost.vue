<template>
  <AppSquareImageCropDialog
    v-if="state.sourceFile"
    v-model:open="state.open"
    :source-file="state.sourceFile"
    @confirm="(file) => settle(file)"
    @cancel="() => settle(null)"
  />
</template>

<script setup lang="ts">
import {
  useSquareImageCropDialog,
  useSquareImageCropState,
} from '~/composables/useSquareImageCropDialog'

const state = useSquareImageCropState()
const { settle } = useSquareImageCropDialog()
</script>
