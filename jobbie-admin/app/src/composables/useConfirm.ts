import { useConfirm as usePrimeConfirm } from 'primevue/useconfirm'

type ConfirmOptions = {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

export function useConfirm() {
  const primeConfirm = usePrimeConfirm()

  function confirm(opts: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => {
      primeConfirm.require({
        message: opts.message,
        header: opts.title ?? 'Potvrdenie',
        icon: opts.danger ? 'pi pi-exclamation-triangle' : 'pi pi-question-circle',
        acceptLabel: opts.confirmLabel ?? 'Potvrdiť',
        rejectLabel: opts.cancelLabel ?? 'Zrušiť',
        acceptClass: opts.danger ? 'p-button-danger' : undefined,
        rejectClass: 'p-button-secondary p-button-text',
        accept: () => resolve(true),
        reject: () => resolve(false),
        onHide: () => resolve(false),
      })
    })
  }

  return { confirm }
}
