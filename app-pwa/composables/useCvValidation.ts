import type { CvHeaderResponseDto } from '~/types/cv'

export interface CvPersonalFieldErrors {
  first_name?: string
  last_name?: string
}

export interface CvValidationErrorItem {
  field: string
  message: string
}

export function parseCvPatchValidationError(err: unknown): {
  summary: string
  items: CvValidationErrorItem[]
  byField: Record<string, string>
} {
  const fallback = (msg: string) => ({
    summary: msg,
    items: [] as CvValidationErrorItem[],
    byField: {} as Record<string, string>,
  })
  const data = (err as { data?: unknown })?.data
  if (!data || typeof data !== 'object') {
    return fallback(err instanceof Error ? err.message : 'Chyba uloženia')
  }
  const rec = data as { message?: string; errors?: unknown }
  const raw = rec.errors
  if (!Array.isArray(raw)) {
    return fallback(typeof rec.message === 'string' ? rec.message : 'Chyba uloženia')
  }
  const items: CvValidationErrorItem[] = []
  const byField: Record<string, string> = {}
  for (const e of raw) {
    if (!e || typeof e !== 'object') continue
    const field = String((e as { field?: string }).field ?? '')
    const message = String((e as { message?: string }).message ?? '')
    if (!field || !message) continue
    items.push({ field, message })
    const base = field.split('.')[0] ?? field
    if (!byField[base]) {
      byField[base] = message
    }
  }
  return {
    summary: typeof rec.message === 'string' ? rec.message : 'CV validation failed',
    items,
    byField,
  }
}

export function runPersonalRequiredValidation(h: CvHeaderResponseDto): CvPersonalFieldErrors {
  const out: CvPersonalFieldErrors = {}
  if (!(h.first_name ?? '').trim()) {
    out.first_name = 'Meno je povinné.'
  }
  if (!(h.last_name ?? '').trim()) {
    out.last_name = 'Priezvisko je povinné.'
  }
  return out
}
