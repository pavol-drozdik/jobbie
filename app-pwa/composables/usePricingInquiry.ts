import { S } from '~/utils/strings'
import { isApiUnreachableStatus } from '~/utils/api-fetch'
import { parseApiErrorMessage, type ApiResultLike } from '~/utils/api-errors'

export type PricingInquiryPhase = 'idle' | 'loading' | 'success' | 'error'

export type PricingInquiryPayload = {
  name: string
  company: string
  email: string
  phone?: string
  service_id: string
  message: string
  consent: boolean
}

export type PricingInquirySubmitResult =
  | { ok: true }
  | { ok: false; message: string }

function isPricingInquirySuccess(
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

function formatPricingInquiryError(res: ApiResultLike): string {
  if (isApiUnreachableStatus(res.status)) {
    if (import.meta.dev) {
      return `${S.pricingContactErrorApiUnreachable} ${S.pricingContactErrorApiUnreachableDev}`
    }
    return S.pricingContactErrorApiUnreachable
  }
  return parseApiErrorMessage(res, S.pricingContactErrorSubmit)
}

/**
 * POST /api/pricing-inquiries (public). Sends a sales inquiry e-mail via backend SMTP.
 */
export function usePricingInquiry() {
  const phase = ref<PricingInquiryPhase>('idle')
  const lastError = ref<string | null>(null)
  const { api } = useApi()

  async function submit(
    params: PricingInquiryPayload,
  ): Promise<PricingInquirySubmitResult> {
    lastError.value = null
    if (!params.consent) {
      phase.value = 'idle'
      return { ok: false, message: S.pricingContactErrorConsent }
    }
    const email = params.email.trim()
    const name = params.name.trim()
    const company = params.company.trim()
    const message = params.message.trim()
    if (!email || !name || !company || !message || !params.service_id.trim()) {
      phase.value = 'error'
      return { ok: false, message: S.pricingContactErrorSubmit }
    }
    phase.value = 'loading'
    const body: {
      email: string
      name: string
      company: string
      service_id: string
      message: string
      consent: true
      phone?: string
    } = {
      email,
      name: name.slice(0, 200),
      company: company.slice(0, 200),
      service_id: params.service_id.trim(),
      message: message.slice(0, 2000),
      consent: true,
    }
    const phoneTrim = params.phone?.trim()
    if (phoneTrim) {
      body.phone = phoneTrim.slice(0, 40)
    }
    const res = await api<{ ok?: boolean }>('/api/pricing-inquiries', {
      method: 'POST',
      body,
      skipSessionExpiry: true,
    })
    if (isPricingInquirySuccess(res)) {
      phase.value = 'success'
      return { ok: true }
    }
    const messageOut = formatPricingInquiryError(res)
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
