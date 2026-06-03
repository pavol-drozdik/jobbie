import { ref } from 'vue'

type ConfirmOptions = {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

const open = ref(false)
const options = ref<ConfirmOptions | null>(null)
let resolveFn: ((value: boolean) => void) | null = null

export function useConfirm() {
  function confirm(opts: ConfirmOptions): Promise<boolean> {
    options.value = opts
    open.value = true
    return new Promise((resolve) => {
      resolveFn = resolve
    })
  }

  function settle(value: boolean) {
    open.value = false
    options.value = null
    resolveFn?.(value)
    resolveFn = null
  }

  return {
    open,
    options,
    confirm,
    accept: () => settle(true),
    cancel: () => settle(false),
  }
}
