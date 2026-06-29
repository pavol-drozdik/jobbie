import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js'
import { onBeforeUnmount, type Ref } from 'vue'

Chart.register(
  CategoryScale,
  LinearScale,
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  Filler,
  Title,
  Tooltip,
  Legend,
)

const CHART_GREEN = '#22c55e'
const CHART_GREEN_LIGHT = 'rgba(34, 197, 94, 0.15)'
const CHART_INK3 = '#8a9e8f'

export function useAdminChart() {
  const instances: Chart[] = []

  function destroyAll() {
    for (const c of instances) {
      c.destroy()
    }
    instances.length = 0
  }

  onBeforeUnmount(destroyAll)

  type LineOptions = {
    yMax?: number
    yTickSuffix?: string
    /** When false, no dataset uses area fill (better for multi-line core charts). */
    fill?: boolean
  }

  const LINE_COLORS = [
    CHART_GREEN,
    '#3b82f6',
    '#f59e0b',
    '#8b5cf6',
    '#ec4899',
    '#14b8a6',
    '#f97316',
    '#6366f1',
  ]

  function mountBar(
    canvas: HTMLCanvasElement,
    labels: string[],
    datasets: Array<{ label: string; data: number[]; color?: string }>,
  ): Chart {
    const chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: datasets.map((d) => ({
          label: d.label,
          data: d.data,
          backgroundColor: d.color ?? CHART_GREEN,
          borderRadius: 6,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: CHART_INK3, boxWidth: 12 } },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: CHART_INK3, maxRotation: 45 } },
          y: { beginAtZero: true, ticks: { color: CHART_INK3, precision: 0 } },
        },
      },
    })
    instances.push(chart)
    return chart
  }

  function mountLine(
    canvas: HTMLCanvasElement,
    labels: string[],
    datasets: Array<{ label: string; data: number[] }>,
    options: LineOptions = {},
  ): Chart {
    const fillFirst = options.fill !== false
    const chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: datasets.map((d, i) => ({
          label: d.label,
          data: d.data,
          borderColor: LINE_COLORS[i % LINE_COLORS.length],
          backgroundColor: CHART_GREEN_LIGHT,
          fill: fillFirst && i === 0,
          tension: 0.25,
          pointRadius: labels.length > 80 ? 0 : 2,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'bottom', labels: { color: CHART_INK3, boxWidth: 12 } },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: CHART_INK3, maxTicksLimit: 12 } },
          y: {
            beginAtZero: true,
            max: options.yMax,
            ticks: {
              color: CHART_INK3,
              precision: 0,
              callback: options.yTickSuffix
                ? (value) => `${value}${options.yTickSuffix}`
                : undefined,
            },
          },
        },
      },
    })
    instances.push(chart)
    return chart
  }

  function mountHorizontalFunnel(
    canvas: HTMLCanvasElement,
    labels: string[],
    values: number[],
  ): Chart {
    const chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Počet',
            data: values,
            backgroundColor: CHART_GREEN,
            borderRadius: 6,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { beginAtZero: true, ticks: { color: CHART_INK3, precision: 0 } },
          y: { grid: { display: false }, ticks: { color: '#3d5444' } },
        },
      },
    })
    instances.push(chart)
    return chart
  }

  return { mountBar, mountLine, mountHorizontalFunnel, destroyAll }
}

export type ChartCanvasRef = Ref<HTMLCanvasElement | null>
