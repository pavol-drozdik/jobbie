// Global confirm via AppConfirmHost in layout — use for settings/delete/billing.
// Use local AppConfirmDialog when the flow needs custom slots (e.g. publish credits on add.vue).
export type ConfirmOptions = {
  title: string
  message?: string
  detail?: string
  variant?: 'alert' | 'confirm'
  confirmDanger?: boolean
  confirmText?: string
  cancelText?: string
}

type ConfirmState = {
  open: boolean
  options: ConfirmOptions | null
  resolve: ((value: boolean) => void) | null
}

export function useConfirmState() {
  return useState<ConfirmState>('app-confirm-state', () => ({
    open: false,
    options: null,
    resolve: null,
  }))
}

export function useConfirm() {
  const state = useConfirmState()

  function confirm(options: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => {
      state.value = {
        open: true,
        options: { variant: 'confirm', ...options },
        resolve,
      }
    })
  }

  function alertDialog(options: Omit<ConfirmOptions, 'variant'>): Promise<void> {
    return new Promise((resolve) => {
      state.value = {
        open: true,
        options: { variant: 'alert', ...options },
        resolve: () => {
          resolve()
          return true
        },
      }
    })
  }

  function settle(ok: boolean): void {
    const resolve = state.value.resolve
    state.value = { open: false, options: null, resolve: null }
    resolve?.(ok)
  }

  return { confirm, alertDialog, settle, state }
}
