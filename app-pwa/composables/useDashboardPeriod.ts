import { computed, ref } from 'vue'
import type { DashboardPeriodPreset } from '~/utils/dashboard-types'

/** Format a Date as `YYYY-MM-DD` in local time. */
function toLocalDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Composable that owns preset selection + derived from/to values used by dashboards. */
export function useDashboardPeriod(initial: DashboardPeriodPreset = '30d') {
  const preset = ref<DashboardPeriodPreset>(initial)
  const dateFrom = ref<string>('')
  const dateTo = ref<string>('')

  function applyPreset(p: DashboardPeriodPreset): void {
    preset.value = p
    if (p === 'custom') return
    const now = new Date()
    const to = new Date(now)
    let from: Date
    if (p === '1d') {
      from = new Date(now)
      from.setHours(0, 0, 0, 0)
    } else if (p === '7d') {
      from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    } else {
      from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }
    dateFrom.value = toLocalDate(from)
    dateTo.value = toLocalDate(to)
  }

  applyPreset(initial)

  const fromIso = computed<string | null>(() => {
    if (!dateFrom.value) return null
    const d = new Date(`${dateFrom.value}T00:00:00`)
    return Number.isNaN(d.getTime()) ? null : d.toISOString()
  })
  const toIso = computed<string | null>(() => {
    if (!dateTo.value) return null
    const d = new Date(`${dateTo.value}T23:59:59.999`)
    return Number.isNaN(d.getTime()) ? null : d.toISOString()
  })

  return { preset, applyPreset, dateFrom, dateTo, fromIso, toIso }
}
