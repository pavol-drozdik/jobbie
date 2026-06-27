import { parseApiErrorMessage } from '~/utils/api-errors'
import { S } from '~/utils/strings'

export function useSubscriptionResume() {
  const { api } = useApi()
  const { ensureRecentLoginForBilling } = useBillingStepUp()
  const { confirm } = useConfirm()

  const resumeBusy = ref(false)
  const resumeError = ref('')
  const resumeOk = ref('')

  async function submitResume(): Promise<boolean> {
    const gate = await ensureRecentLoginForBilling()
    if (!gate.ok) {
      resumeError.value = gate.message
      return false
    }

    resumeError.value = ''
    resumeOk.value = ''
    resumeBusy.value = true
    try {
      const res = await api<{
        resumed: boolean
        cancel_at_period_end?: boolean
      }>('/api/payments/resume-subscription', {
        method: 'POST',
      })
      if (res.ok && res.data?.resumed === true) {
        resumeOk.value = S.settingsSubscriptionResumed
        return true
      }
      resumeError.value = parseApiErrorMessage(res, S.settingsSubscriptionResumeFailed)
      return false
    } finally {
      resumeBusy.value = false
    }
  }

  async function confirmAndResume(): Promise<boolean> {
    const ok = await confirm({
      title: S.settingsSubscriptionResumeConfirmTitle,
      message: S.settingsSubscriptionResumeConfirmBody,
      confirmText: S.settingsSubscriptionResumeCta,
      cancelText: S.cancel,
    })
    if (!ok) return false
    return submitResume()
  }

  return {
    resumeBusy,
    resumeError,
    resumeOk,
    confirmAndResume,
    submitResume,
  }
}
