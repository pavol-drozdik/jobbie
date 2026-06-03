import type {
  EmployerApplicationDetail,
  EmployerApplicantsListResponse,
  EmployerJobReplySettings,
  EmployerJobsHubResponse,
  EmployerPrintListResponse,
} from '~/types/employer-applicants'
import type {
  ApplicationStatus,
  EmployerSettableStatus,
} from '~/utils/applicant-status'
import { parseSafeApiErrorMessage } from '~/utils/safe-user-messages'
import { resolvePublicApiBase } from '~/utils/api-base-url'
import { fetchApiBinary } from '~/utils/api-binary-fetch'

export function useEmployerApplicants() {
  const config = useRuntimeConfig().public
  const { session } = useAuth()
  const { api } = useApi()
  const feedback = useState<string | null>('employer-applicants-feedback', () => null)
  const error = useState<string | null>('employer-applicants-error', () => null)

  function clearFeedback(): void {
    feedback.value = null
    error.value = null
  }

  function compactQuery(query: Record<string, string | undefined>): Record<string, string> {
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(query)) {
      const t = (v ?? '').trim()
      if (t.length > 0) out[k] = t
    }
    return out
  }

  async function fetchJobsHub(query: Record<string, string | undefined>): Promise<EmployerJobsHubResponse | null> {
    const res = await api<EmployerJobsHubResponse>('/api/employer/jobs', {
      query: compactQuery(query),
    })
    if (!res.ok) {
      error.value = res.body?.slice(0, 200) ?? 'Nepodarilo sa načítať ponuky.'
      return null
    }
    return res.data ?? null
  }

  async function fetchApplicants(
    jobId: string,
    query: Record<string, string | undefined>,
  ): Promise<EmployerApplicantsListResponse | null> {
    const res = await api<EmployerApplicantsListResponse>(
      `/api/employer/jobs/${jobId}/applicants`,
      { query: compactQuery(query) },
    )
    if (!res.ok) {
      error.value = res.body?.slice(0, 200) ?? 'Nepodarilo sa načítať uchádzačov.'
      return null
    }
    return res.data ?? null
  }

  async function fetchApplicantDetail(
    applicationId: string,
  ): Promise<EmployerApplicationDetail | null> {
    const res = await api<EmployerApplicationDetail>(
      `/api/employer/applications/${applicationId}`,
    )
    if (!res.ok) {
      error.value = res.body?.slice(0, 200) ?? 'Nepodarilo sa načítať detail.'
      return null
    }
    return res.data ?? null
  }

  async function patchStatus(
    applicationId: string,
    status: EmployerSettableStatus,
    opts?: { send_auto_reply?: boolean; force_resend?: boolean },
  ): Promise<boolean> {
    const res = await api<{ id: string; status: string }>(
      `/api/employer/applications/${applicationId}/status`,
      {
        method: 'PATCH',
        body: {
          status,
          send_auto_reply: opts?.send_auto_reply ?? false,
          force_resend: opts?.force_resend ?? false,
        },
      },
    )
    if (!res.ok) {
      error.value = res.body?.slice(0, 200) ?? 'Zmena stavu zlyhala.'
      return false
    }
    feedback.value = 'Stav uchádzača bol aktualizovaný.'
    return true
  }

  async function bulkPatchStatus(
    applicationIds: string[],
    status: EmployerSettableStatus,
    opts?: { send_auto_reply?: boolean },
  ): Promise<{ updated: number; failed: string[] } | null> {
    const res = await api<{ updated: number; failed: string[] }>(
      '/api/employer/applications/bulk-status',
      {
        method: 'PATCH',
        body: {
          application_ids: applicationIds,
          status,
          send_auto_reply: opts?.send_auto_reply ?? false,
        },
      },
    )
    if (!res.ok) {
      error.value = res.body?.slice(0, 200) ?? 'Hromadná zmena zlyhala.'
      return null
    }
    feedback.value = `Aktualizovaných: ${res.data?.updated ?? 0}`
    return res.data ?? null
  }

  async function saveNote(applicationId: string, note: string): Promise<boolean> {
    const res = await api(`/api/employer/applications/${applicationId}/note`, {
      method: 'PUT',
      body: { note },
    })
    if (!res.ok) {
      error.value = res.body?.slice(0, 200) ?? 'Uloženie poznámky zlyhalo.'
      return false
    }
    feedback.value = 'Poznámka bola uložená.'
    return true
  }

  async function fetchReplySettings(jobId: string): Promise<EmployerJobReplySettings | null> {
    const res = await api<EmployerJobReplySettings>(
      `/api/employer/jobs/${jobId}/reply-settings`,
    )
    if (!res.ok) return null
    return res.data ?? null
  }

  async function saveReplySettings(
    jobId: string,
    body: Partial<EmployerJobReplySettings>,
  ): Promise<boolean> {
    const res = await api<EmployerJobReplySettings>(
      `/api/employer/jobs/${jobId}/reply-settings`,
      { method: 'PUT', body },
    )
    if (!res.ok) {
      error.value = res.body?.slice(0, 200) ?? 'Uloženie nastavení zlyhalo.'
      return false
    }
    feedback.value = 'Nastavenia odpovedí boli uložené.'
    return true
  }

  async function fetchPrintList(
    jobId: string,
    query?: Record<string, string>,
    ids?: string[],
  ): Promise<EmployerPrintListResponse | null> {
    const params: Record<string, string> = { ...(query ?? {}) }
    if (ids?.length) params.ids = ids.join(',')
    const res = await api<EmployerPrintListResponse>(
      `/api/employer/jobs/${jobId}/applicants/print`,
      { query: params },
    )
    if (!res.ok) return null
    return res.data ?? null
  }

  async function downloadApplicantExportFile(
    jobId: string,
    kind: 'excel' | 'cvs' | 'pdf',
    query?: Record<string, string>,
    ids?: string[],
  ): Promise<boolean> {
    const base = resolvePublicApiBase(useRuntimeConfig().public.apiBaseUrl as string | undefined)
    const params = new URLSearchParams({ ...(query ?? {}) })
    if (ids?.length) params.set('ids', ids.join(','))
    const qs = params.toString()
    const pathSegment =
      kind === 'excel' ? 'export/excel'
      : kind === 'cvs' ? 'export/cvs'
      : 'export'
    const url = `${base}/api/employer/jobs/${jobId}/applicants/${pathSegment}${qs ? `?${qs}` : ''}`
    const res = await fetchApiBinary(url, session.value, {
      accept:
        kind === 'excel'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : kind === 'cvs'
            ? 'application/zip'
            : 'application/pdf',
      apiBaseUrl: base,
    })
    if (!res.ok) {
      const body = await res.text()
      const fallback =
        kind === 'excel' ? 'Export Excel zlyhal.'
        : kind === 'cvs' ? 'Stiahnutie životopisov zlyhalo.'
        : 'Export PDF zlyhal.'
      error.value = parseSafeApiErrorMessage({ ok: false, status: res.status, body }, fallback)
      return false
    }
    const blob = await res.blob()
    const disposition = res.headers.get('Content-Disposition') ?? ''
    const match = /filename="?([^";]+)"?/i.exec(disposition)
    const defaultName =
      kind === 'excel' ? `uchadzaci-${jobId.slice(0, 8)}.xlsx`
      : kind === 'cvs' ? `cv-uchadzaci-${jobId.slice(0, 8)}.zip`
      : `pozvani-${jobId.slice(0, 8)}.pdf`
    const filename = match?.[1]?.trim() || defaultName
    const objectUrl = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = objectUrl
    anchor.download = filename
    anchor.rel = 'noopener'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(objectUrl)
    return true
  }

  async function downloadInvitedPdf(
    jobId: string,
    query?: Record<string, string>,
    ids?: string[],
  ): Promise<boolean> {
    return downloadApplicantExportFile(jobId, 'pdf', query, ids)
  }

  async function downloadApplicantsExcel(
    jobId: string,
    query?: Record<string, string>,
    ids?: string[],
  ): Promise<boolean> {
    const ok = await downloadApplicantExportFile(jobId, 'excel', query, ids)
    if (ok) feedback.value = 'Excel bol stiahnutý.'
    return ok
  }

  async function downloadApplicantsCvsZip(
    jobId: string,
    query?: Record<string, string>,
    ids?: string[],
  ): Promise<boolean> {
    const ok = await downloadApplicantExportFile(jobId, 'cvs', query, ids)
    if (ok) feedback.value = 'Životopisy boli stiahnuté.'
    return ok
  }

  /** Applicant application CV — does not use CV database PDF monthly quota. */
  async function downloadApplicantCvPdf(applicationId: string): Promise<{
    ok: boolean
    error?: string
  }> {
    const base = resolvePublicApiBase(config.apiBaseUrl as string | undefined)
    const url = `${base}/api/employer/applications/${encodeURIComponent(applicationId)}/cv/pdf`
    try {
      const res = await fetchApiBinary(url, session.value, {
        accept: 'application/pdf',
        apiBaseUrl: base,
      })
      if (!res.ok) {
        const body = await res.text()
        return {
          ok: false,
          error: parseSafeApiErrorMessage(
            { ok: false, status: res.status, body },
            'Nepodarilo sa stiahnuť PDF',
          ),
        }
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
    feedback,
    error,
    clearFeedback,
    fetchJobsHub,
    fetchApplicants,
    fetchApplicantDetail,
    patchStatus,
    bulkPatchStatus,
    saveNote,
    fetchReplySettings,
    saveReplySettings,
    fetchPrintList,
    downloadInvitedPdf,
    downloadApplicantsExcel,
    downloadApplicantsCvsZip,
    downloadApplicantCvPdf,
  }
}

/** Max CV PDFs in one ZIP (matches backend `APPLICANT_CVS_ZIP_MAX`). */
export const APPLICANT_CVS_ZIP_MAX = 25
