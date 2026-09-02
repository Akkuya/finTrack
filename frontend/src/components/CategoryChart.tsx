import { useEffect, useRef } from 'react'
import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  DoughnutController,
  LinearScale,
  Tooltip,
  type ChartConfiguration,
  type ChartItem,
} from 'chart.js'

ChartJS.register(
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  DoughnutController,
  LinearScale,
  Tooltip,
)

export type ChartKind = 'doughnut' | 'bar'

const BASE_TOOLTIP = {
  backgroundColor: '#0e131b',
  titleColor: '#8b98a9',
  bodyColor: '#d7e2ee',
  borderColor: '#1c2634',
  borderWidth: 1,
  padding: 10,
  titleFont: { family: 'ui-monospace, monospace', size: 11, weight: 'bold' as const },
  bodyFont: { family: 'ui-monospace, monospace', size: 12 },
  displayColors: true,
  boxPadding: 4,
}

export function CategoryChart({
  kind,
  labels,
  values,
  colors,
  onSelect,
}: {
  kind: ChartKind
  labels: string[]
  values: number[]
  colors: string[]
  onSelect?: (index: number) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<ChartJS | null>(null)
  const onSelectRef = useRef(onSelect)

  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const config: ChartConfiguration = {
      type: kind === 'doughnut' ? 'doughnut' : 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Amount',
            data: values,
            backgroundColor: colors,
            borderColor: kind === 'doughnut' ? '#080b10' : colors,
            borderWidth: kind === 'doughnut' ? 2 : 0,
            borderRadius: kind === 'bar' ? 4 : 0,
            indexAxis: kind === 'bar' ? 'y' : 'x',
            barThickness: kind === 'bar' ? 18 : undefined,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        color: '#8b98a9',
        plugins: {
          legend: { display: false },
          tooltip: {
            ...BASE_TOOLTIP,
            callbacks: {
              label: (ctx) => {
                const total = values.reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0)
                const parsed = ctx.parsed as number | { x?: number; y?: number }
                const raw =
                  typeof parsed === 'number'
                    ? parsed
                    : Number(parsed?.x ?? parsed?.y ?? 0)
                const pct = total ? ((raw / total) * 100).toFixed(1) : '0'
                return ` ${ctx.label}: $${Number(raw).toLocaleString('en-CA', { minimumFractionDigits: 2 })} (${pct}%)`
              },
            },
          },
        },
        onClick: (_e, elements) => {
          if (!elements.length) return
          const idx = elements[0].index as number
          onSelectRef.current?.(idx)
        },
      },
    }

    chartRef.current = new ChartJS(canvas as ChartItem, config)
    return () => {
      chartRef.current?.destroy()
      chartRef.current = null
    }
  }, [kind, labels, values, colors])

  return <canvas ref={canvasRef} className="max-h-full w-full" />
}