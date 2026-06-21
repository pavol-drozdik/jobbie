<script setup lang="ts">
import { formatFileSizeBytes } from '~/utils/format-file-size'
import { triggerFileDownload } from '~/utils/trigger-file-download'
import { S } from '~/utils/strings'

const props = defineProps<{
  signedUrl: string
  fileName: string
  fileSizeBytes: number
  mime: string
}>()

const isPdfMime = computed(() => props.mime === 'application/pdf')

const canvasRef = ref<HTMLCanvasElement | null>(null)
const thumbFailed = ref(false)
const loadingThumb = ref(false)

let pdfRenderGeneration = 0

const sizeLabel = computed(() => formatFileSizeBytes(props.fileSizeBytes))

const extensionBadge = computed(() => {
  const fromName = extractExtension(props.fileName)
  if (fromName.length > 0) {
    return fromName
  }
  return extensionFromMime(props.mime)
})

function extractExtension(fileName: string): string {
  const t = fileName.trim()
  const dot = t.lastIndexOf('.')
  if (dot === -1 || dot === t.length - 1) {
    return ''
  }
  return t.slice(dot + 1).toUpperCase().slice(0, 10)
}

function extensionFromMime(mime: string): string {
  const m = mime.toLowerCase()
  const map: Record<string, string> = {
    'application/pdf': 'PDF',
    'application/msword': 'DOC',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
    'application/vnd.ms-excel': 'XLS',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
    'application/vnd.ms-powerpoint': 'PPT',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPTX',
    'text/plain': 'TXT',
    'text/csv': 'CSV',
    'application/zip': 'ZIP',
    'application/x-zip-compressed': 'ZIP',
  }
  if (map[m]) {
    return map[m]!
  }
  const sub = m.split('/')[1]
  if (sub) {
    return sub.replace(/[^a-z0-9]+/gi, '').toUpperCase().slice(0, 8) || 'FILE'
  }
  return 'FILE'
}

async function renderFirstPage(): Promise<void> {
  await nextTick()
  const canvas = canvasRef.value
  if (!canvas) {
    return
  }
  const generation = ++pdfRenderGeneration
  try {
    const pdfjs = await import('pdfjs-dist')
    const workerMod = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
    pdfjs.GlobalWorkerOptions.workerSrc = workerMod.default
    const task = pdfjs.getDocument({ url: props.signedUrl, withCredentials: false }).promise
    const pdf = await task
    const page = await pdf.getPage(1)
    if (generation !== pdfRenderGeneration) {
      return
    }
    const baseVp = page.getViewport({ scale: 1 })
    const targetH = 120
    const scale = targetH / baseVp.height
    const viewport = page.getViewport({ scale })
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('canvas 2d')
    }
    canvas.height = Math.floor(viewport.height)
    canvas.width = Math.floor(viewport.width)
    await page.render({ canvas, canvasContext: ctx, viewport }).promise
    if (generation !== pdfRenderGeneration) {
      return
    }
    thumbFailed.value = false
  } catch {
    if (generation === pdfRenderGeneration) {
      thumbFailed.value = true
    }
  } finally {
    if (generation === pdfRenderGeneration) {
      loadingThumb.value = false
    }
  }
}

watch(
  () => [props.signedUrl, props.mime] as const,
  () => {
    thumbFailed.value = false
    pdfRenderGeneration += 1
    if (props.mime !== 'application/pdf') {
      loadingThumb.value = false
      return
    }
    loadingThumb.value = true
    void renderFirstPage()
  },
  { immediate: true },
)

async function onDownloadClick(): Promise<void> {
  await triggerFileDownload(props.signedUrl, props.fileName)
}
</script>

<template>
  <button
    type="button"
    class="flex w-full max-w-[280px] flex-col overflow-hidden rounded-2xl border border-black/[0.08] bg-white text-left shadow-[0_1px_6px_rgba(0,0,0,0.08)] transition-shadow hover:shadow-[0_4px_14px_rgba(0,0,0,0.12)] focus:outline-none focus-visible:ring-2 focus-visible:ring-marketing-green"
    :aria-label="S.chatDownloadAttachmentAria"
    @click="onDownloadClick"
  >
    <div class="relative flex h-[120px] w-full items-center justify-center overflow-hidden bg-black/[0.04]">
      <template v-if="isPdfMime">
        <span
          v-if="loadingThumb && !thumbFailed"
          class="absolute inset-0 z-10 flex items-center justify-center text-xs text-black/40"
        >{{ S.loading }}</span>
        <canvas
          v-show="!thumbFailed"
          ref="canvasRef"
          class="max-h-[120px] max-w-full object-contain"
          :class="loadingThumb && !thumbFailed ? 'opacity-0' : ''"
          aria-hidden="true"
        />
        <div
          v-if="thumbFailed"
          class="flex h-full w-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-slate-100 to-slate-200/90 px-3"
        >
          <span class="text-2xl font-bold tracking-tight text-slate-600">PDF</span>
          <span class="text-center text-xs text-black/50">{{ S.chatFilePreviewUnavailable }}</span>
        </div>
      </template>
      <div
        v-else
        class="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200/90 px-3"
      >
        <span class="text-[2rem] font-bold leading-none tracking-tight text-slate-600/90 sm:text-[2.25rem]">{{
          extensionBadge
        }}</span>
      </div>
    </div>
    <div class="border-t border-black/[0.06] px-3 py-2">
      <p class="m-0 truncate text-sm font-semibold text-black" :title="fileName">{{ fileName }}</p>
      <p v-if="sizeLabel" class="m-0 mt-0.5 text-xs text-black/45">{{ sizeLabel }}</p>
    </div>
  </button>
</template>
