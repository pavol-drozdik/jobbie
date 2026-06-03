import {
  BUY_CREDITS_PATH,
  CV_MONTHLY_QUOTA_EXCEEDED_MESSAGE,
  INSUFFICIENT_CREDITS_MESSAGE,
} from './billing-errors'

export type ApiResultLike = {
  status: number
  ok: boolean
  data?: unknown
  body?: string
}

function messageFromPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null
  const msg = (payload as { message?: string | string[] }).message
  if (typeof msg === 'string' && msg.trim()) return msg.trim()
  if (Array.isArray(msg) && typeof msg[0] === 'string' && msg[0].trim()) {
    return msg[0].trim()
  }
  return null
}

export function parseApiErrorMessage(
  res: ApiResultLike,
  fallback = 'Operácia zlyhala.',
): string {
  const fromData = messageFromPayload(res.data)
  if (fromData) return fromData
  if (res.body?.trim()) {
    try {
      const parsed = JSON.parse(res.body) as unknown
      const fromBody = messageFromPayload(parsed)
      if (fromBody) return fromBody
    } catch {
      if (res.body.length < 280) return res.body
    }
  }
  return fallback
}

/** Match Nest 403 credit errors so publish flows can route users to buy credits. */
export function isStepUpRequiredResponse(res: ApiResultLike): boolean {
  if (res.status !== 403) return false
  const payload = res.data
  if (payload && typeof payload === 'object') {
    if ((payload as { step_up_required?: boolean }).step_up_required === true) {
      return true
    }
  }
  const msg = parseApiErrorMessage(res, '')
  return msg === 'Recent authentication required'
}

export function isInsufficientCreditsResponse(res: ApiResultLike): boolean {
  if (res.status !== 403) return false
  const msg = parseApiErrorMessage(res, '')
  return (
    msg === INSUFFICIENT_CREDITS_MESSAGE ||
    msg.toLowerCase().includes('dostatok kreditov')
  )
}

export function isCvMonthlyQuotaExceededResponse(res: ApiResultLike): boolean {
  if (res.status !== 403) return false
  const msg = parseApiErrorMessage(res, '')
  return msg === CV_MONTHLY_QUOTA_EXCEEDED_MESSAGE
}

export function insufficientCreditsUserMessage(): string {
  return `${INSUFFICIENT_CREDITS_MESSAGE} Prejdite do sekcie Kúpiť kredity.`
}
