import type { Chart as ChartJs } from 'chart.js'

type ChartConstructor = typeof ChartJs

/**
 * Loads Chart.js from the app bundle (client-only). Avoids jsDelivr, which is blocked by CSP script-src.
 */
export function useChartJs(): {
  loadChartJs: () => Promise<void>
} {
  let loadPromise: Promise<void> | null = null

  async function loadChartJs(): Promise<void> {
    if (import.meta.server) return
    const w = window as Window & { Chart?: ChartConstructor }
    if (w.Chart) return
    if (!loadPromise) {
      loadPromise = (async () => {
        const { Chart, registerables } = await import('chart.js')
        Chart.register(...registerables)
        w.Chart = Chart
      })()
    }
    await loadPromise
  }

  return { loadChartJs }
}

export type DashboardChartInstance = InstanceType<ChartConstructor>
