export function formatAuditTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('sk-SK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function auditPresetToRange(
  preset: '7d' | '30d' | '90d',
): { from: string; to: string } {
  const to = new Date()
  const days = preset === '7d' ? 7 : preset === '30d' ? 30 : 90
  const from = new Date(to.getTime() - days * 86400000)
  return { from: from.toISOString(), to: to.toISOString() }
}

export function formatDateRangeLabel(fromIso: string, toIso: string): string {
  const opts: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }
  return `${new Date(fromIso).toLocaleDateString('sk-SK', opts)} – ${new Date(toIso).toLocaleDateString('sk-SK', opts)}`
}

export function payloadPreview(payload: Record<string, unknown>, max = 80): string {
  if (!payload || Object.keys(payload).length === 0) return '—'
  const s = JSON.stringify(payload)
  if (s.length <= max) return s
  return `${s.slice(0, max)}…`
}

export type AuditTagSeverity = 'secondary' | 'info' | 'warn' | 'success' | 'danger' | 'contrast'

export function eventTypeTagSeverity(eventType: string): AuditTagSeverity {
  if (eventType.startsWith('auth.')) return 'info'
  if (eventType.startsWith('credits.')) return 'warn'
  if (eventType.startsWith('company_ad.')) return 'info'
  if (eventType.startsWith('job_offer.')) return 'success'
  if (eventType.startsWith('blog.')) return 'contrast'
  if (eventType.startsWith('storage.')) return 'secondary'
  if (eventType.startsWith('account.')) return 'danger'
  return 'secondary'
}

/** @deprecated Use eventTypeTagSeverity with PrimeVue Tag */
export function eventTypeBadgeClass(eventType: string): string {
  if (eventType.startsWith('auth.')) return 'badge-auth'
  if (eventType.startsWith('credits.')) return 'badge-credits'
  if (eventType.startsWith('company_ad.')) return 'badge-company'
  if (eventType.startsWith('job_offer.')) return 'badge-job'
  if (eventType.startsWith('blog.')) return 'badge-blog'
  if (eventType.startsWith('storage.')) return 'badge-storage'
  if (eventType.startsWith('account.')) return 'badge-account'
  return 'badge-default'
}

export function shortId(id: string | null | undefined): string {
  if (!id) return '—'
  return id.length > 12 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id
}
