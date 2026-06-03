import { S } from '~/utils/strings'
import { getCategoryLabel, getJobTypeLabel } from '~/utils/job'
import {
  getSalaryTypeLabel,
  mapLegacyCompensationToSalaryType,
} from '~/utils/job-post-options'

const STORAGE_KEY = 'jobbie-recent-find-filters'
const MAX_RECENT = 5

export type RecentFindFilterSnapshot = {
  search: string
  category: string
  urgent_only: boolean
  date_range: 'all' | 'today' | 'week' | 'month'
  location: string
  min_hourly_wage: string
  max_hourly_wage: string
  job_type: string
  sort: 'relevance' | 'created_at' | 'compensation_amount'
  skills: string
  featured_only: boolean
  work_mode: string
  /** hourly | monthly | one_time | negotiable; empty = all */
  salary_type: string
  salary_min: string
  salary_max: string
  radius: string
}

export function createEmptyFindSnapshot(): RecentFindFilterSnapshot {
  return {
    search: '',
    category: 'all',
    urgent_only: false,
    date_range: 'all',
    location: '',
    min_hourly_wage: '',
    max_hourly_wage: '',
    job_type: 'all',
    sort: 'relevance',
    skills: '',
    featured_only: false,
    work_mode: '',
    salary_type: '',
    salary_min: '',
    salary_max: '',
    radius: '',
  }
}

type StoredFindSnapshot = RecentFindFilterSnapshot & {
  /** @deprecated migrated to salary_type on read */
  compensation_type?: 'all' | 'hourly' | 'fixed' | 'on_request'
}

function normalizeStoredSnapshot(raw: StoredFindSnapshot): RecentFindFilterSnapshot {
  const base: RecentFindFilterSnapshot = {
    ...createEmptyFindSnapshot(),
    ...raw,
    featured_only: raw.featured_only ?? false,
  }
  if (!base.salary_type.trim() && raw.compensation_type && raw.compensation_type !== 'all') {
    const mapped = mapLegacyCompensationToSalaryType(raw.compensation_type)
    if (mapped) {
      base.salary_type = mapped
    }
  }
  if (!base.salary_min.trim() && base.min_hourly_wage.trim() && base.salary_type === 'hourly') {
    base.salary_min = base.min_hourly_wage
  }
  return base
}

function isSearchOnlySnapshot(s: RecentFindFilterSnapshot): boolean {
  return (
    !!s.search.trim() &&
    s.category === 'all' &&
    !s.urgent_only &&
    s.date_range === 'all' &&
    !s.location.trim() &&
    !s.min_hourly_wage.trim() &&
    !s.max_hourly_wage.trim() &&
    s.job_type === 'all' &&
    s.sort === 'relevance' &&
    !s.skills.trim() &&
    !s.salary_type.trim() &&
    !s.salary_min.trim() &&
    !s.featured_only &&
    !(s.work_mode ?? '').trim() &&
    !(s.salary_max ?? '').trim() &&
    !(s.radius ?? '').trim()
  )
}

function collectFilterOnlyLabelParts(s: RecentFindFilterSnapshot): string[] {
  const parts: string[] = []
  if (s.category !== 'all') {
    const slugParts = s.category.split(',').map((t) => t.trim()).filter(Boolean)
    if (slugParts.length > 0) {
      for (const c of slugParts) {
        parts.push(getCategoryLabel(c))
      }
    }
  }
  if (s.date_range !== 'all') {
    if (s.date_range === 'today') {
      parts.push(S.filterDateToday)
    } else if (s.date_range === 'week') {
      parts.push(S.filterDate7Days)
    } else {
      parts.push(S.filterDate30Days)
    }
  }
  const loc = s.location.trim()
  if (loc) {
    parts.push(loc.length > 16 ? `${loc.slice(0, 16)}…` : loc)
  }
  const salMin = s.salary_min.trim()
  const lo = s.min_hourly_wage.trim()
  const hi = s.max_hourly_wage.trim()
  if (salMin) {
    parts.push(`≥ ${salMin} €`)
  } else if (lo || hi) {
    const wage =
      lo && hi ? `${lo}–${hi} €` : lo ? `≥ ${lo} €` : hi ? `≤ ${hi} €` : ''
    if (wage) {
      parts.push(wage)
    }
  }
  if (s.job_type !== 'all') {
    const jtParts = s.job_type.split(',').map((t) => t.trim()).filter(Boolean)
    if (jtParts.length > 1) {
      parts.push(
        jtParts.map((p) => getJobTypeLabel(p) || p).join(', '),
      )
    } else {
      parts.push(getJobTypeLabel(s.job_type) || s.job_type)
    }
  }
  if (s.urgent_only) {
    parts.push(S.urgentOnly)
  }
  const sk = s.skills.trim()
  if (sk) {
    parts.push(sk.length > 18 ? `${sk.slice(0, 16)}…` : sk)
  }
  if (s.featured_only) {
    parts.push('Top ponuky')
  }
  const st = s.salary_type.trim()
  if (st) {
    parts.push(getSalaryTypeLabel(st))
  }
  return parts
}

export function hasActiveFindSnapshot(s: RecentFindFilterSnapshot): boolean {
  return (
    s.category !== 'all' ||
    s.urgent_only ||
    !!s.search.trim() ||
    s.date_range !== 'all' ||
    !!s.location.trim() ||
    !!s.min_hourly_wage.trim() ||
    !!s.max_hourly_wage.trim() ||
    s.job_type !== 'all' ||
    s.sort !== 'relevance' ||
    !!s.skills.trim() ||
    !!s.salary_type.trim() ||
    !!s.salary_min.trim() ||
    s.featured_only ||
    !!(s.work_mode ?? '').trim() ||
    !!(s.salary_max ?? '').trim() ||
    !!(s.radius ?? '').trim()
  )
}

export function snapshotToQuery(s: RecentFindFilterSnapshot): Record<string, string> {
  const q: Record<string, string> = {}
  if (s.search.trim()) {
    q.q = s.search.trim()
  }
  if (s.category !== 'all') {
    q.category = s.category
  }
  if (s.urgent_only) {
    q.urgent_only = 'true'
  }
  if (s.date_range !== 'all') {
    q.date_range = s.date_range
  }
  if (s.location.trim()) {
    q.location = s.location.trim()
  }
  if (s.min_hourly_wage.trim()) {
    q.min_hourly_wage = s.min_hourly_wage.trim()
  }
  if (s.max_hourly_wage.trim()) {
    q.max_hourly_wage = s.max_hourly_wage.trim()
  }
  if (s.job_type !== 'all') {
    q.job_type = s.job_type
  }
  if (s.sort && s.sort !== 'relevance') {
    q.sort = s.sort
  }
  if (s.skills.trim()) {
    q.skills = s.skills.trim()
  }
  if (s.featured_only) {
    q.featured_only = 'true'
  }
  if ((s.work_mode ?? '').trim()) {
    q.work_mode = (s.work_mode ?? '').trim()
  }
  if (s.salary_type.trim()) {
    q.salary_type = s.salary_type.trim()
  }
  if (s.salary_min.trim()) {
    q.salary_min = s.salary_min.trim()
  }
  if (s.salary_max.trim()) {
    q.salary_max = s.salary_max.trim()
  }
  if (s.radius.trim()) {
    q.radius = s.radius.trim()
  }
  return q
}

function snapshotDedupeKey(s: RecentFindFilterSnapshot): string {
  return JSON.stringify(snapshotToQuery(s))
}

function isRecentFindFilterSnapshot(x: unknown): x is StoredFindSnapshot {
  if (!x || typeof x !== 'object') {
    return false
  }
  const o = x as StoredFindFilterSnapshot & Record<string, unknown>
  const dr = o.date_range
  const drOk =
    dr === 'all' || dr === 'today' || dr === 'week' || dr === 'month'
  const sort = o.sort
  const sortOk =
    sort === 'relevance' ||
    sort === 'created_at' ||
    sort === 'compensation_amount'
  const ct = o.compensation_type
  const ctOk =
    ct === undefined ||
    ct === 'all' ||
    ct === 'hourly' ||
    ct === 'fixed' ||
    ct === 'on_request'
  const fo = o.featured_only
  const foOk = fo === undefined || typeof fo === 'boolean'
  return (
    typeof o.search === 'string' &&
    typeof o.category === 'string' &&
    typeof o.urgent_only === 'boolean' &&
    drOk &&
    typeof o.location === 'string' &&
    typeof o.min_hourly_wage === 'string' &&
    typeof o.max_hourly_wage === 'string' &&
    typeof o.job_type === 'string' &&
    sortOk &&
    typeof o.skills === 'string' &&
    ctOk &&
    foOk &&
    (o.work_mode === undefined || typeof o.work_mode === 'string') &&
    (o.salary_type === undefined || typeof o.salary_type === 'string') &&
    (o.salary_min === undefined || typeof o.salary_min === 'string') &&
    (o.salary_max === undefined || typeof o.salary_max === 'string') &&
    (o.radius === undefined || typeof o.radius === 'string')
  )
}

export function readRecentFindFilters(): RecentFindFilterSnapshot[] {
  if (import.meta.server) {
    return []
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return []
    }
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed
      .filter(isRecentFindFilterSnapshot)
      .map((item) => normalizeStoredSnapshot(item))
      .filter(hasActiveFindSnapshot)
      .slice(0, MAX_RECENT)
  } catch {
    return []
  }
}

export function pushRecentFindFilter(s: RecentFindFilterSnapshot): void {
  if (import.meta.server) {
    return
  }
  if (!hasActiveFindSnapshot(s)) {
    return
  }
  const key = snapshotDedupeKey(s)
  const cur = readRecentFindFilters()
  const next = [s, ...cur.filter((x) => snapshotDedupeKey(x) !== key)].slice(
    0,
    MAX_RECENT,
  )
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
}

/** Short chip label for homepage: search text plus optional filter segments. */
export function formatRecentFindFilterLabel(s: RecentFindFilterSnapshot): string {
  const qRaw = s.search.trim()
  const filterParts = collectFilterOnlyLabelParts(s)
  if (isSearchOnlySnapshot(s)) {
    return qRaw.length > 28 ? `${qRaw.slice(0, 26)}…` : qRaw
  }
  if (qRaw) {
    const qt = qRaw.length > 20 ? `${qRaw.slice(0, 18)}…` : qRaw
    if (filterParts.length === 0) {
      return qt
    }
    return `${qt} · ${filterParts.slice(0, 2).join(' · ')}`
  }
  if (filterParts.length === 0) {
    return S.all
  }
  return filterParts.slice(0, 3).join(' · ')
}
