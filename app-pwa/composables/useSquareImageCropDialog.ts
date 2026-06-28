type SquareImageCropState = {
  open: boolean
  sourceFile: File | null
  resolve: ((file: File | null) => void) | null
}

export function useSquareImageCropState() {
  return useState<SquareImageCropState>('app-square-image-crop', () => ({
    open: false,
    sourceFile: null,
    resolve: null,
  }))
}

export function useSquareImageCropDialog() {
  const state = useSquareImageCropState()

  function open(file: File): Promise<File | null> {
    return new Promise((resolve) => {
      state.value = {
        open: true,
        sourceFile: file,
        resolve,
      }
    })
  }

  function settle(file: File | null): void {
    const resolve = state.value.resolve
    state.value = {
      open: false,
      sourceFile: null,
      resolve: null,
    }
    resolve?.(file)
  }

  return { open, settle, state }
}
