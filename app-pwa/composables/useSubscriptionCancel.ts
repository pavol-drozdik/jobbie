import type { SubscriptionCancelFeedback } from '~/utils/subscription-cancel-reasons'
import { S } from '~/utils/strings'

export function useSubscriptionCancel() {
  const { api } = useApi()
  const {
    ensureRecentLoginForBilling,
    ensureBillingStepUpBeforeMutation,
    billingStepUpUserMessage,
    isStepUpRequiredResponse,
    tryRecoverFromStepUpRequired,
  } = useBillingStepUp()

  const cancelBusy = ref(false)
  const cancelError = ref('')
  const cancelOk = ref('')
  const cancelDialogOpen = ref(false)

  function openCancelDialog(): void {
    cancelError.value = ''
    cancelOk.value = ''
    cancelDialogOpen.value = true
  }

  async function submitCancelWithReason(feedback: SubscriptionCancelFeedback): Promise<boolean> {
    const gate = await ensureRecentLoginForBilling()
    if (!gate.ok) {
      cancelError.value = gate.message
      return false
    }

    if (!(await ensureBillingStepUpBeforeMutation())) {
      cancelError.value = S.settingsSubscriptionCancelFailed
      return false
    }

    cancelError.value = ''
    cancelOk.value = ''
    cancelBusy.value = true
    try {
      const body = {
        reason_code: feedback.reason_code,
        reason_detail: feedback.reason_detail ?? null,
      }
      let res = await api<{
        canceled: boolean
        cancel_at_period_end?: boolean
      }>('/api/payments/cancel-subscription', {
        method: 'POST',
        body,
      })
      if (!res.ok && isStepUpRequiredResponse(res) && (await tryRecoverFromStepUpRequired())) {
        res = await api<{
          canceled: boolean
          cancel_at_period_end?: boolean
        }>('/api/payments/cancel-subscription', {
          method: 'POST',
          body,
        })
      }
      if (res.ok && res.data?.canceled === true) {
        cancelOk.value =
          res.data.cancel_at_period_end === false
            ? S.settingsSubscriptionCanceledReconciled
            : S.settingsSubscriptionCanceled
        return true
      }
      cancelError.value =
        res.ok && res.data?.canceled === false
          ? S.settingsSubscriptionCancelNoStripe
          : (await billingStepUpUserMessage(res)) || S.settingsSubscriptionCancelFailed
      return false
    } finally {
      cancelBusy.value = false
    }
  }

  return {
    cancelBusy,
    cancelError,
    cancelOk,
    cancelDialogOpen,
    openCancelDialog,
    submitCancelWithReason,
  }
}
