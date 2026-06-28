<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[300] flex items-end justify-center bg-black/50 p-0 font-dmSans antialiased sm:items-center sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="square-image-crop-title"
      @click.self="onCancel"
    >
      <div
        class="flex max-h-[min(92dvh,640px)] w-full max-w-[440px] flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
        @click.stop
      >
        <div class="shrink-0 border-b border-black/10 px-5 py-4">
          <h2 id="square-image-crop-title" class="m-0 text-xl font-extrabold text-black">
            {{ S.imageCropTitle }}
          </h2>
          <p class="m-0 mt-2 text-sm leading-snug text-black/55">
            {{ S.imageCropHint }}
          </p>
        </div>

        <div class="flex min-h-0 flex-1 flex-col gap-4 px-5 py-4">
          <div
            ref="viewportRef"
            class="relative mx-auto aspect-square w-full max-w-[400px] touch-none select-none overflow-hidden rounded-2xl bg-neutral-900"
            @pointerdown="onPointerDown"
            @pointermove="onPointerMove"
            @pointerup="onPointerUp"
            @pointercancel="onPointerUp"
            @pointerleave="onPointerUp"
            @wheel.prevent="onWheel"
          >
            <img
              v-if="bitmap"
              :src="previewUrl"
              alt=""
              class="pointer-events-none absolute left-0 top-0 max-w-none origin-center will-change-transform"
              :style="imageStyle"
              draggable="false"
            >
            <div
              class="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-inset ring-white/90"
              aria-hidden="true"
            />
          </div>

          <label class="flex items-center gap-3">
            <span class="shrink-0 text-sm font-semibold text-black/70">{{ S.imageCropZoom }}</span>
            <input
              v-model.number="zoomSlider"
              type="range"
              min="1"
              max="3"
              step="0.01"
              class="h-2 w-full accent-marketing-green"
              @input="onZoomSlider"
            >
          </label>

          <p v-if="exportError" class="m-0 text-sm text-red-600">{{ exportError }}</p>
        </div>

        <div class="flex shrink-0 flex-col-reverse gap-3 border-t border-black/10 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            class="inline-flex h-11 min-h-11 items-center justify-center rounded-full border border-black/15 bg-white px-5 text-[15px] font-semibold text-black/75 hover:bg-neutral-50"
            :disabled="exporting"
            @click="onCancel"
          >
            {{ S.cancel }}
          </button>
          <button
            type="button"
            class="inline-flex h-11 min-h-11 items-center justify-center rounded-full border-2 border-marketing-green bg-marketing-green px-5 text-[15px] font-extrabold text-white disabled:opacity-50"
            :disabled="exporting || !bitmap"
            @click="onConfirm"
          >
            {{ exporting ? S.loading : S.imageCropUse }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { S } from '~/utils/strings'
import {
  bitmapToCroppedFile,
  clampPanOffset,
  clampScale,
  defaultCropStateForBitmap,
  imageTransformStyle,
  loadImageBitmapFromFile,
  SQUARE_CROP_DEFAULT_VIEWPORT_PX,
  type SquareCropState,
} from '~/utils/square-image-crop'

const props = defineProps<{
  open: boolean
  sourceFile: File
}>()

const emit = defineEmits<{
  'update:open': [boolean]
  confirm: [file: File]
  cancel: []
}>()

const viewportRef = ref<HTMLElement | null>(null)
const bitmap = ref<ImageBitmap | null>(null)
const previewUrl = ref('')
const cropState = ref<SquareCropState>({ scale: 1, offsetX: 0, offsetY: 0 })
const zoomSlider = ref(1)
const exporting = ref(false)
const exportError = ref<string | null>(null)

const viewportSize = ref(SQUARE_CROP_DEFAULT_VIEWPORT_PX)

const imageStyle = computed(() => {
  if (!bitmap.value) {
    return {}
  }
  return imageTransformStyle(bitmap.value, viewportSize.value, cropState.value)
})

let dragPointerId: number | null = null
let dragStartX = 0
let dragStartY = 0
let dragOriginX = 0
let dragOriginY = 0
let pinchStartDistance = 0
let pinchStartScale = 1
const activePointers = new Map<number, { x: number; y: number }>()

function measureViewport(): void {
  const el = viewportRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  if (rect.width > 0) {
    viewportSize.value = rect.width
  }
}

function applyPanOffset(offsetX: number, offsetY: number): void {
  if (!bitmap.value) return
  const clamped = clampPanOffset(
    bitmap.value.width,
    bitmap.value.height,
    viewportSize.value,
    cropState.value.scale,
    offsetX,
    offsetY,
  )
  cropState.value = {
    ...cropState.value,
    offsetX: clamped.offsetX,
    offsetY: clamped.offsetY,
  }
}

function setZoom(scale: number): void {
  const nextScale = clampScale(scale)
  cropState.value = { ...cropState.value, scale: nextScale }
  zoomSlider.value = nextScale
  applyPanOffset(cropState.value.offsetX, cropState.value.offsetY)
}

function onZoomSlider(): void {
  setZoom(zoomSlider.value)
}

function onWheel(event: WheelEvent): void {
  const delta = event.deltaY < 0 ? 0.08 : -0.08
  setZoom(cropState.value.scale + delta)
}

function pointerDistance(): number {
  const points = [...activePointers.values()]
  if (points.length < 2) return 0
  const [a, b] = points
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.hypot(dx, dy)
}

function onPointerDown(event: PointerEvent): void {
  const el = viewportRef.value
  if (!el) return
  el.setPointerCapture(event.pointerId)
  activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY })

  if (activePointers.size === 2) {
    dragPointerId = null
    pinchStartDistance = pointerDistance()
    pinchStartScale = cropState.value.scale
    return
  }

  dragPointerId = event.pointerId
  dragStartX = event.clientX
  dragStartY = event.clientY
  dragOriginX = cropState.value.offsetX
  dragOriginY = cropState.value.offsetY
}

function onPointerMove(event: PointerEvent): void {
  if (!activePointers.has(event.pointerId)) return
  activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY })

  if (activePointers.size >= 2 && pinchStartDistance > 0) {
    const distance = pointerDistance()
    const ratio = distance / pinchStartDistance
    setZoom(pinchStartScale * ratio)
    return
  }

  if (dragPointerId !== event.pointerId) return
  const dx = event.clientX - dragStartX
  const dy = event.clientY - dragStartY
  applyPanOffset(dragOriginX + dx, dragOriginY + dy)
}

function onPointerUp(event: PointerEvent): void {
  activePointers.delete(event.pointerId)
  if (dragPointerId === event.pointerId) {
    dragPointerId = null
  }
  if (activePointers.size < 2) {
    pinchStartDistance = 0
    pinchStartScale = cropState.value.scale
  }
  viewportRef.value?.releasePointerCapture(event.pointerId)
}

async function loadSource(file: File): Promise<void> {
  exportError.value = null
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = ''
  }
  bitmap.value?.close()
  bitmap.value = null
  const nextBitmap = await loadImageBitmapFromFile(file)
  bitmap.value = nextBitmap
  previewUrl.value = URL.createObjectURL(file)
  cropState.value = defaultCropStateForBitmap(
    nextBitmap.width,
    nextBitmap.height,
    viewportSize.value,
  )
  zoomSlider.value = cropState.value.scale
  await nextTick()
  measureViewport()
  cropState.value = defaultCropStateForBitmap(
    nextBitmap.width,
    nextBitmap.height,
    viewportSize.value,
  )
  zoomSlider.value = cropState.value.scale
}

watch(
  () => props.sourceFile,
  (file) => {
    if (file) {
      void loadSource(file)
    }
  },
  { immediate: true },
)

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      nextTick(() => measureViewport())
    }
  },
)

function onCancel(): void {
  if (exporting.value) return
  emit('update:open', false)
  emit('cancel')
}

async function onConfirm(): Promise<void> {
  if (!bitmap.value || exporting.value) return
  exporting.value = true
  exportError.value = null
  try {
    measureViewport()
    const cropped = await bitmapToCroppedFile(
      bitmap.value,
      cropState.value,
      props.sourceFile.name,
      props.sourceFile.type,
      viewportSize.value,
    )
    emit('confirm', cropped)
    emit('update:open', false)
  } catch {
    exportError.value = S.imageCropExportFailed
  } finally {
    exporting.value = false
  }
}

onUnmounted(() => {
  bitmap.value?.close()
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
  }
})
</script>
