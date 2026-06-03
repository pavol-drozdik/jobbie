import type {
  CvDatabaseFiltersModel,
  CvEmployerAggregate,
  CvEmployerOpenChatResult,
  EmployerCvDatabaseListResponse,
} from '~/types/employer-cv-database'
import {
  parseApiErrorMessage,
  isInsufficientCreditsResponse,
  isCvMonthlyQuotaExceededResponse,
} from '~/utils/api-errors'
import { resolvePublicApiBase } from '~/utils/api-base-url'
import { resolveApiBearerToken } from '~/utils/api-bearer-token'
import { shouldPreferBffCookieAuth } from '~/utils/bff-csrf-state'
import { fetchApi } from '~/utils/api-fetch'
import {
  CV_MONTHLY_QUOTA_EXCEEDED_MESSAGE,
  INSUFFICIENT_CREDITS_MESSAGE,
} from '~/utils/billing-errors'

function appendNonEmpty(params: URLSearchParams, key: string, value: string): void {
  const s = value.trim()
  if (s !== '') {
    params.set(key, s)
  }
}

function appendArray(params: URLSearchParams, key: string, values: readonly string[]): void {
  for (const raw of values) {
    const v = typeof raw === 'string' ? raw.trim() : ''
    if (v !== '') {
      params.append(key, v)
    }
  }
}

/**
 * Translate the filter model into URL params understood by the backend.
 * Arrays use repeated keys (`jobTypes=full_time&jobTypes=part_time`); the
 * `languageLevels` per-language min map is encoded as `en:B2,de:A2`.
 */
export function filtersToSearchParams(
  filters: CvDatabaseFiltersModel,
  page: number,
  limit: number,
): URLSearchParams {
  const params = new URLSearchParams()

  appendNonEmpty(params, 'q', filters.q)

  if (filters.location.trim()) {
    appendNonEmpty(params, 'location', filters.location)
    if (filters.radius) params.set('radius', filters.radius)
  }
  appendArray(params, 'jobTypes', filters.jobTypes)
  appendArray(params, 'skills', filters.skills)
  if (filters.experience) params.set('experience', filters.experience)
  if (filters.availability) params.set('availability', filters.availability)
  if (filters.salaryMax) params.set('salaryMax', filters.salaryMax)

  appendArray(params, 'languages', filters.languages)
  const ll = Object.entries(filters.languageLevels)
    .filter(([, v]) => Boolean(v))
    .map(([k, v]) => `${k}:${v}`)
    .join(',')
  if (ll) params.set('languageLevels', ll)

  if (filters.educationLevel) params.set('educationLevel', filters.educationLevel)

  params.set('sort', filters.sort)
  params.set('page', String(Math.max(1, Math.floor(page))))
  params.set('limit', String(Math.max(1, Math.floor(limit))))

  return params
}

export function useEmployerCvDatabase() {
  const config = useRuntimeConfig().public
  const { user, session } = useAuth()
  const { api } = useApi()

  function isLoggedIn(): boolean {
    return Boolean(user.value ?? session.value?.access_token)
  }

  async function fetchList(
    filters: CvDatabaseFiltersModel,
    page: number,
    limit: number,
    options: { signal?: AbortSignal } = {},
  ): Promise<{ ok: boolean; data?: EmployerCvDatabaseListResponse; error?: string; aborted?: boolean }> {
    if (!isLoggedIn()) {
      return { ok: false, error: 'Neprihlásený' }
    }
    const qs = filtersToSearchParams(filters, page, limit).toString()
    try {
      const res = await api<EmployerCvDatabaseListResponse>(
        `/api/employer/cv-database?${qs}`,
        { signal: options.signal },
      )
      if (!res.ok) {
        return {
          ok: false,
          error: parseApiErrorMessage(res, 'Chyba načítania'),
        }
      }
      return { ok: true, data: res.data }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return { ok: false, aborted: true, error: 'aborted' }
      }
      return { ok: false, error: (err as Error)?.message ?? 'Sieťová chyba' }
    }
  }

  async function fetchDetail(cvId: string): Promise<{
    ok: boolean
    data?: CvEmployerAggregate
    error?: string
  }> {
    if (!isLoggedIn()) {
      return { ok: false, error: 'Neprihlásený' }
    }
    const res = await api<CvEmployerAggregate>(
      `/api/employer/cv-database/${encodeURIComponent(cvId)}`,
    )
    if (!res.ok) {
      return {
        ok: false,
        error: parseApiErrorMessage(res, 'Chyba načítania'),
      }
    }
    return { ok: true, data: res.data }
  }

  async function postUnlockContact(cvId: string): Promise<{
    ok: boolean
    data?: { unlocked?: boolean; already_unlocked?: boolean }
    error?: string
    insufficientCredits?: boolean
    quotaExceeded?: boolean
  }> {
    if (!isLoggedIn()) {
      return { ok: false, error: 'Neprihlásený' }
    }
    const res = await api<{ unlocked?: boolean; already_unlocked?: boolean }>(
      `/api/employer/cv-database/${encodeURIComponent(cvId)}/unlock`,
      { method: 'POST' },
    )
    if (!res.ok) {
      return {
        ok: false,
        error: parseApiErrorMessage(res, 'Nepodarilo sa odomknúť kontakt'),
        insufficientCredits: isInsufficientCreditsResponse(res),
        quotaExceeded: isCvMonthlyQuotaExceededResponse(res),
      }
    }
    return { ok: true, data: res.data }
  }

  async function postOpenChat(
    cvId: string,
    body?: { application_id?: string },
  ): Promise<{
    ok: boolean
    data?: CvEmployerOpenChatResult
    error?: string
    insufficientCredits?: boolean
    quotaExceeded?: boolean
  }> {
    if (!isLoggedIn()) {
      return { ok: false, error: 'Neprihlásený' }
    }
    const res = await api<CvEmployerOpenChatResult>(
      `/api/employer/cv-database/${encodeURIComponent(cvId)}/open-chat`,
      {
        method: 'POST',
        body: body ?? {},
      },
    )
    if (!res.ok) {
      return {
        ok: false,
        error: parseApiErrorMessage(res, 'Chyba'),
        insufficientCredits: isInsufficientCreditsResponse(res),
        quotaExceeded: isCvMonthlyQuotaExceededResponse(res),
      }
    }
    return { ok: true, data: res.data }
  }

  async function downloadCvPdf(cvId: string): Promise<{
    ok: boolean
    error?: string
    insufficientCredits?: boolean
    quotaExceeded?: boolean
  }> {
    if (!isLoggedIn()) {
      return { ok: false, error: 'Neprihlásený' }
    }
    const base = resolvePublicApiBase(config.apiBaseUrl as string | undefined)
    const url = `${base}/api/employer/cv-database/${encodeURIComponent(cvId)}/pdf`
    const headers: Record<string, string> = { Accept: 'application/pdf' }
    const resolvedBearer = resolveApiBearerToken(session.value)
    const useCookieAuth =
      import.meta.client &&
      shouldPreferBffCookieAuth(Boolean(resolvedBearer))
    const bearer =
      import.meta.client && !useCookieAuth ? resolvedBearer : undefined
    if (bearer) {
      headers.Authorization = `Bearer ${bearer}`
    }
    try {
      const res = await fetchApi(url, {
        method: 'GET',
        headers,
        credentials: 'include',
      })
      if (!res.ok) {
        const body = await res.text()
        let message = body.trim().slice(0, 280) || 'Nepodarilo sa stiahnuť PDF'
        try {
          const parsed = JSON.parse(body) as { message?: string | string[] }
          const m = parsed.message
          if (typeof m === 'string') message = m
          else if (Array.isArray(m) && m[0]) message = String(m[0])
        } catch {
          /* plain text */
        }
        const insufficientCredits =
          res.status === 403 &&
          (message.includes('kredit') || message === INSUFFICIENT_CREDITS_MESSAGE)
        const quotaExceeded =
          res.status === 403 && message === CV_MONTHLY_QUOTA_EXCEEDED_MESSAGE
        return { ok: false, error: message, insufficientCredits, quotaExceeded }
      }
      const blob = await res.blob()
      const disposition = res.headers.get('Content-Disposition') ?? ''
      const match = /filename="?([^";]+)"?/i.exec(disposition)
      const filename = match?.[1]?.trim() || 'jobbie-zivotopis.pdf'
      const objectUrl = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = objectUrl
      anchor.download = filename
      anchor.rel = 'noopener'
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(objectUrl)
      return { ok: true }
    } catch (err) {
      return { ok: false, error: (err as Error)?.message ?? 'Sieťová chyba' }
    }
  }

  return {
    fetchList,
    fetchDetail,
    postUnlockContact,
    postOpenChat,
    downloadCvPdf,
  }
}
