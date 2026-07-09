import { S } from '~/utils/strings'
import { isApiUnreachableStatus } from '~/utils/api-fetch'
import { parseApiErrorMessage, type ApiResultLike } from '~/utils/api-errors'

export type ContractWithdrawalPhase = 'idle' | 'loading' | 'success' | 'error'

export type ContractWithdrawalProduct = 'subscription' | 'credits'

export type ContractWithdrawalReason =
  | 'changed_mind'
  | 'no_longer_needed'
  | 'other'

export type ContractWithdrawalPayload = {
  name: string
  email: string
  product: ContractWithdrawalProduct
  invoice_number: string
  purchase_date: string
  reason?: ContractWithdrawalReason
  reason_other?: string
  withdrawal_ack: boolean
}

export type ContractWithdrawalSubmitResult =
  | { ok: true }
  | { ok: false; message: string }

function isContractWithdrawalSuccess(
  res: ApiResultLike & { data?: { ok?: boolean } },
): boolean {
  if (res.status !== 201 && !res.ok) {
    return false
  }
  const data = res.data
  return (
    data != null &&
    typeof data === 'object' &&
    'ok' in data &&
    data.ok === true
  )
}

function formatContractWithdrawalError(res: ApiResultLike): string {
  if (isApiUnreachableStatus(res.status)) {
    if (import.meta.dev) {
      return `${S.contractWithdrawalErrorApiUnreachable} ${S.contractWithdrawalErrorApiUnreachableDev}`
    }
    return S.contractWithdrawalErrorApiUnreachable
  }
  return parseApiErrorMessage(res, S.contractWithdrawalErrorSubmit)
}

/**
 * POST /api/contract-withdrawals (public). Sends withdrawal request e-mail via backend SMTP.
 */
export function useContractWithdrawal() {
  const phase = ref<ContractWithdrawalPhase>('idle')
  const lastError = ref<string | null>(null)
  const { api } = useApi()

  async function submit(
    params: ContractWithdrawalPayload,
  ): Promise<ContractWithdrawalSubmitResult> {
    lastError.value = null
    if (!params.withdrawal_ack) {
      phase.value = 'idle'
      return { ok: false, message: S.contractWithdrawalErrorAck }
    }

    const name = params.name.trim()
    const email = params.email.trim()
    const invoiceNumber = params.invoice_number.trim()
    const purchaseDate = params.purchase_date.trim()
    const product = params.product

    if (!name || !email || !invoiceNumber || !purchaseDate || !product) {
      phase.value = 'error'
      return { ok: false, message: S.contractWithdrawalErrorSubmit }
    }

    if (params.reason === 'other' && !params.reason_other?.trim()) {
      phase.value = 'error'
      return { ok: false, message: S.contractWithdrawalErrorReasonOther }
    }

    phase.value = 'loading'

    const body: {
      name: string
      email: string
      product: ContractWithdrawalProduct
      invoice_number: string
      purchase_date: string
      withdrawal_ack: true
      reason?: ContractWithdrawalReason
      reason_other?: string
    } = {
      name: name.slice(0, 200),
      email,
      product,
      invoice_number: invoiceNumber.slice(0, 80),
      purchase_date: purchaseDate,
      withdrawal_ack: true,
    }

    if (params.reason) {
      body.reason = params.reason
    }
    const reasonOtherTrim = params.reason_other?.trim()
    if (params.reason === 'other' && reasonOtherTrim) {
      body.reason_other = reasonOtherTrim.slice(0, 500)
    }

    const res = await api<{ ok?: boolean }>('/api/contract-withdrawals', {
      method: 'POST',
      body,
      skipSessionExpiry: true,
    })

    if (isContractWithdrawalSuccess(res)) {
      phase.value = 'success'
      return { ok: true }
    }

    const messageOut = formatContractWithdrawalError(res)
    lastError.value = messageOut
    phase.value = 'error'
    return { ok: false, message: messageOut }
  }

  function resetPhase(): void {
    phase.value = 'idle'
    lastError.value = null
  }

  return { phase, lastError, submit, resetPhase }
}
