export const SQUARE_CROP_EXPORT_PX = 1024
export const SQUARE_CROP_MIN_ZOOM = 1
export const SQUARE_CROP_MAX_ZOOM = 3
export const SQUARE_CROP_DEFAULT_VIEWPORT_PX = 400

export type SquareCropState = {
  scale: number
  offsetX: number
  offsetY: number
}

export type CropSourceRect = {
  sx: number
  sy: number
  sw: number
  sh: number
}

export function clampScale(scale: number): number {
  return Math.min(SQUARE_CROP_MAX_ZOOM, Math.max(SQUARE_CROP_MIN_ZOOM, scale))
}

export function baseCoverScale(
  imageWidth: number,
  imageHeight: number,
  viewportSize: number,
): number {
  if (imageWidth <= 0 || imageHeight <= 0 || viewportSize <= 0) {
    return 1
  }
  return Math.max(viewportSize / imageWidth, viewportSize / imageHeight)
}

export function defaultCropStateForBitmap(
  imageWidth: number,
  imageHeight: number,
  viewportSize: number = SQUARE_CROP_DEFAULT_VIEWPORT_PX,
): SquareCropState {
  void imageWidth
  void imageHeight
  void viewportSize
  return { scale: 1, offsetX: 0, offsetY: 0 }
}

export function computeCropSourceRect(
  imageWidth: number,
  imageHeight: number,
  viewportSize: number,
  state: SquareCropState,
): CropSourceRect {
  const cover = baseCoverScale(imageWidth, imageHeight, viewportSize)
  const displayScale = cover * clampScale(state.scale)
  const imgLeft = viewportSize / 2 + state.offsetX - (imageWidth * displayScale) / 2
  const imgTop = viewportSize / 2 + state.offsetY - (imageHeight * displayScale) / 2
  const sx = clamp(-imgLeft / displayScale, 0, Math.max(0, imageWidth - viewportSize / displayScale))
  const sy = clamp(-imgTop / displayScale, 0, Math.max(0, imageHeight - viewportSize / displayScale))
  const sw = Math.min(viewportSize / displayScale, imageWidth - sx)
  const sh = Math.min(viewportSize / displayScale, imageHeight - sy)
  return { sx, sy, sw, sh }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function maxPanOffset(
  imageWidth: number,
  imageHeight: number,
  viewportSize: number,
  scale: number,
): { maxX: number; maxY: number } {
  const cover = baseCoverScale(imageWidth, imageHeight, viewportSize)
  const displayScale = cover * clampScale(scale)
  const displayW = imageWidth * displayScale
  const displayH = imageHeight * displayScale
  const maxX = Math.max(0, (displayW - viewportSize) / 2)
  const maxY = Math.max(0, (displayH - viewportSize) / 2)
  return { maxX, maxY }
}

export function clampPanOffset(
  imageWidth: number,
  imageHeight: number,
  viewportSize: number,
  scale: number,
  offsetX: number,
  offsetY: number,
): { offsetX: number; offsetY: number } {
  const { maxX, maxY } = maxPanOffset(imageWidth, imageHeight, viewportSize, scale)
  return {
    offsetX: clamp(offsetX, -maxX, maxX),
    offsetY: clamp(offsetY, -maxY, maxY),
  }
}

export async function loadImageBitmapFromFile(file: File): Promise<ImageBitmap> {
  if (!import.meta.client || typeof createImageBitmap === 'undefined') {
    throw new Error('loadImageBitmapFromFile is client-only')
  }
  return createImageBitmap(file, { imageOrientation: 'from-image' })
}

export async function exportSquareCrop(
  bitmap: ImageBitmap,
  state: SquareCropState,
  viewportSize: number = SQUARE_CROP_DEFAULT_VIEWPORT_PX,
  outputSizePx: number = SQUARE_CROP_EXPORT_PX,
): Promise<Blob> {
  if (!import.meta.client || typeof document === 'undefined') {
    throw new Error('exportSquareCrop is client-only')
  }
  const { sx, sy, sw, sh } = computeCropSourceRect(
    bitmap.width,
    bitmap.height,
    viewportSize,
    state,
  )
  const canvas = document.createElement('canvas')
  canvas.width = outputSizePx
  canvas.height = outputSizePx
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Canvas not supported')
  }
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, outputSizePx, outputSizePx)
  const mime = 'image/jpeg'
  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), mime, 0.92),
  )
  if (!blob) {
    throw new Error('Crop export failed')
  }
  return blob
}

export async function exportSquareCropPng(
  bitmap: ImageBitmap,
  state: SquareCropState,
  viewportSize: number = SQUARE_CROP_DEFAULT_VIEWPORT_PX,
  outputSizePx: number = SQUARE_CROP_EXPORT_PX,
): Promise<Blob> {
  if (!import.meta.client || typeof document === 'undefined') {
    throw new Error('exportSquareCropPng is client-only')
  }
  const { sx, sy, sw, sh } = computeCropSourceRect(
    bitmap.width,
    bitmap.height,
    viewportSize,
    state,
  )
  const canvas = document.createElement('canvas')
  canvas.width = outputSizePx
  canvas.height = outputSizePx
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Canvas not supported')
  }
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, outputSizePx, outputSizePx)
  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/png'),
  )
  if (!blob) {
    throw new Error('Crop export failed')
  }
  return blob
}

export async function bitmapToCroppedFile(
  bitmap: ImageBitmap,
  state: SquareCropState,
  baseName: string,
  sourceMime: string,
  viewportSize: number = SQUARE_CROP_DEFAULT_VIEWPORT_PX,
): Promise<File> {
  const usePng = sourceMime === 'image/png' || /\.png$/i.test(baseName)
  const blob = usePng
    ? await exportSquareCropPng(bitmap, state, viewportSize)
    : await exportSquareCrop(bitmap, state, viewportSize)
  const ext = usePng ? 'png' : 'jpg'
  const safeBase = baseName.replace(/\.[^.]+$/, '') || 'photo'
  return new File([blob], `${safeBase}.${ext}`, {
    type: usePng ? 'image/png' : 'image/jpeg',
    lastModified: Date.now(),
  })
}

export function displayScaleForBitmap(
  bitmap: ImageBitmap,
  viewportSize: number,
  scale: number,
): number {
  return baseCoverScale(bitmap.width, bitmap.height, viewportSize) * clampScale(scale)
}

export function imageTransformStyle(
  bitmap: ImageBitmap,
  viewportSize: number,
  state: SquareCropState,
): { width: string; height: string; transform: string } {
  const s = displayScaleForBitmap(bitmap, viewportSize, state.scale)
  const w = bitmap.width * s
  const h = bitmap.height * s
  const x = viewportSize / 2 + state.offsetX
  const y = viewportSize / 2 + state.offsetY
  return {
    width: `${w}px`,
    height: `${h}px`,
    transform: `translate(${x}px, ${y}px) translate(-50%, -50%)`,
  }
}
