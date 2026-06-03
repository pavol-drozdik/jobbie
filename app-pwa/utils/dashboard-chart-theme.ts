/** Chart.js colors and defaults aligned with marketing tokens (tailwind.config marketing.green). */

export const CHART_GREEN = '#22c55e'
export const CHART_GREEN_RGB = '34, 197, 94'
export const CHART_GREEN_FILL = `rgba(${CHART_GREEN_RGB}, 0.5)`
export const CHART_AMBER = '#f5a623'
export const CHART_INK_MUTED = 'rgba(0, 0, 0, 0.45)'
export const CHART_GRID = 'rgba(0, 0, 0, 0.06)'
/** Secondary series (e.g. contacts line) — ink green tint */
export const CHART_SECONDARY = '#3d5444'

const FONT_FAMILY = 'DM Sans Variable, DM Sans, sans-serif'

type ChartOptions = Record<string, unknown>

function baseFont(): Record<string, unknown> {
  return { family: FONT_FAMILY, size: 12 }
}

/** Shared Chart.js options for dashboard analytics. */
export function buildDashboardChartOptions(overrides?: ChartOptions): ChartOptions {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          font: baseFont(),
          color: CHART_INK_MUTED,
        },
      },
    },
    scales: {
      x: {
        grid: { color: CHART_GRID },
        ticks: { font: baseFont(), color: CHART_INK_MUTED },
      },
      y: {
        grid: { color: CHART_GRID },
        ticks: { font: baseFont(), color: CHART_INK_MUTED },
        beginAtZero: true,
      },
    },
    ...overrides,
  }
}

export function createBarDataset(label: string, data: number[]): Record<string, unknown> {
  return {
    label,
    data,
    backgroundColor: CHART_GREEN_FILL,
    borderRadius: 6,
  }
}

export function createLineDataset(
  label: string,
  data: number[],
  color: string = CHART_GREEN,
): Record<string, unknown> {
  return {
    label,
    data,
    borderColor: color,
    backgroundColor: `rgba(${color === CHART_GREEN ? CHART_GREEN_RGB : '61, 84, 68'}, 0.08)`,
    tension: 0.2,
    fill: false,
  }
}

function scaleAxes(yExtra?: Record<string, unknown>): Record<string, unknown> {
  const tick = { font: baseFont(), color: CHART_INK_MUTED }
  return {
    x: {
      grid: { color: CHART_GRID },
      ticks: tick,
    },
    y: {
      grid: { color: CHART_GRID },
      ticks: tick,
      beginAtZero: true,
      ...yExtra,
    },
  }
}

export function ratingScaleOverrides(): ChartOptions {
  return { scales: scaleAxes({ min: 0, max: 5 }) }
}

export function integerYScaleOverrides(): ChartOptions {
  return { scales: scaleAxes({ ticks: { font: baseFont(), color: CHART_INK_MUTED, precision: 0 } }) }
}
