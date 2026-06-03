import type { Ref } from 'vue'
import { S } from '~/utils/strings'

export type JobEmailAlertDto = {
  id: string
  user_id: string
  name: string
  keywords: string
  location: string
  radius_km: number | null
  category: string | null
  categories: string[]
  employment_types: string[]
  salary_type: string | null
  salary_min: number | null
  salary_max: number | null
  work_mode: string | null
  work_modes: string[]
  work_from_home: boolean
  education_levels: number[]
  benefits: number[]
  suitable_for: number[]
  driver_licenses: number[]
  work_shift_modes: number[]
  language_filters: Array<{ language_id: number; level: string }>
  pc_skill_filters: Array<{ skill_id: number; level: string }>
  start_types: string[]
  start_date_from: string | null
  newsletter: boolean
  frequency: string
  is_active: boolean
  criteria_hash: string
  last_dispatch_at: string | null
  created_at: string
  updated_at: string
}

export type JobEmailAlertUpsertBody = {
  name?: string
  keywords?: string
  location?: string
  radius_km?: number | null
  category?: string | null
  categories?: string[]
  employment_types?: string[]
  salary_type?: string | null
  salary_min?: number | null
  salary_max?: number | null
  work_mode?: string | null
  work_modes?: string[]
  work_from_home?: boolean
  benefits?: number[]
  frequency: string
  is_active?: boolean
  newsletter?: boolean
}

// Map saved alert → /pracovne-ponuky query. radius_km null means whole Slovakia (omit location param).
export function buildFindQueryFromJobAlert(a: JobEmailAlertDto): Record<string, string> {
  const q: Record<string, string> = {}
  const kw = (a.keywords ?? '').trim()
  if (kw) {
    q.q = kw
  }
  const loc = (a.location ?? '').trim()
  const wholeSk = a.radius_km === null || a.radius_km === undefined
  if (loc && !wholeSk) {
    q.location = loc
  }
  const cats = (a.categories ?? []).map((c) => c.trim()).filter(Boolean)
  if (cats.length > 1) {
    q.category = cats.join(',')
  } else if (cats.length === 1) {
    q.category = cats[0]!
  } else if (a.category?.trim() && a.category.trim() !== 'all') {
    q.category = a.category.trim()
  }
  const emp = (a.employment_types ?? []).filter(Boolean)
  if (emp.length > 0) {
    q.job_type = emp.join(',')
  }
  const wms = (a.work_modes ?? []).filter((w) =>
    ['on_site', 'hybrid', 'remote'].includes(w),
  )
  if (wms.length > 0) {
    q.work_mode = wms.join(',')
  } else if (a.work_mode?.trim()) {
    q.work_mode = a.work_mode.trim()
  }
  if (a.salary_min != null && Number.isFinite(Number(a.salary_min))) {
    q.salary_min = String(a.salary_min)
  }
  if (a.salary_type?.trim()) {
    q.salary_type = a.salary_type.trim()
  }
  if (a.radius_km !== null && a.radius_km !== undefined) {
    q.radius = String(a.radius_km)
  }
  return q
}

export type JobEmailAlertCreateBody = JobEmailAlertUpsertBody & {
  name: string
  frequency: string
}

export function useJobEmailAlerts() {
  const { api } = useApi()
  const list: Ref<JobEmailAlertDto[]> = ref([])
  const loading = ref(false)
  const loadError = ref<string | null>(null)

  async function refresh(): Promise<void> {
    loading.value = true
    loadError.value = null
    const res = await api<JobEmailAlertDto[]>('/api/job-alerts')
    loading.value = false
    if (res.ok && Array.isArray(res.data)) {
      list.value = res.data
      return
    }
    loadError.value = S.jobEmailAlertsLoadError
  }

  async function createAlert(
    body: JobEmailAlertCreateBody,
  ): Promise<{ ok: boolean; data?: JobEmailAlertDto; message?: string }> {
    const res = await api<JobEmailAlertDto>('/api/job-alerts', {
      method: 'POST',
      body,
    })
    if (res.ok && res.data) {
      return { ok: true, data: res.data }
    }
    const msg =
      typeof res.data === 'object' && res.data && 'message' in res.data
        ? String((res.data as { message?: string }).message)
        : res.body
    return { ok: false, message: msg }
  }

  async function updateAlert(
    id: string,
    body: Partial<JobEmailAlertUpsertBody>,
  ): Promise<{ ok: boolean; data?: JobEmailAlertDto; message?: string }> {
    const res = await api<JobEmailAlertDto>(`/api/job-alerts/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body,
    })
    if (res.ok && res.data) {
      return { ok: true, data: res.data }
    }
    const msg =
      typeof res.data === 'object' && res.data && 'message' in res.data
        ? String((res.data as { message?: string }).message)
        : res.body
    return { ok: false, message: msg }
  }

  async function deleteAlert(id: string): Promise<boolean> {
    const res = await api<{ ok: boolean }>(
      `/api/job-alerts/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
    )
    return res.ok
  }

  async function previewCount(
    body: Record<string, unknown>,
  ): Promise<number | null> {
    const res = await api<{ found: number }>('/api/job-alerts/preview-count', {
      method: 'POST',
      body,
    })
    if (res.ok && res.data && typeof res.data.found === 'number') {
      return res.data.found
    }
    return null
  }

  return {
    list,
    loading,
    loadError,
    refresh,
    createAlert,
    updateAlert,
    deleteAlert,
    previewCount,
  }
}
