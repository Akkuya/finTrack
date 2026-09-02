import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, type Summary } from '../api'
import { useApi } from '../lib/useApi'
import { fmtMoney, todayIso } from '../lib/format'
import { CategoryChart, type ChartKind } from '../components/CategoryChart'
import {
  Card,
  EmptyState,
  ErrorState,
  Money,
  PageTitle,
  SkeletonLines,
} from '../components/ui'
import { cn } from '../lib/cn'

type Dir = 'expenses' | 'income' | 'all'
type Range = 'month' | '3m' | 'custom'

const PALETTE = [
  '#3ddc97', '#38bdf8', '#fb7185', '#fbbf24', '#a78bfa',
  '#34d399', '#f472b6', '#fb923c', '#2dd4bf', '#94a3b8',
]

function monthStart(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}

function threeMonthsAgo(): string {
  const now = new Date()
  now.setMonth(now.getMonth() - 3)
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export default function BreakdownPage() {
  const navigate = useNavigate()
  const [kind, setKind] = useState<ChartKind>('doughnut')
  const [dir, setDir] = useState<Dir>('expenses')
  const [range, setRange] = useState<Range>('3m')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  const { dateFrom, dateTo } = useMemo(() => {
    const today = todayIso()
    if (range === 'month') return { dateFrom: monthStart(), dateTo: today }
    if (range === '3m') return { dateFrom: threeMonthsAgo(), dateTo: today }
    return { dateFrom: customFrom || today, dateTo: customTo || today }
  }, [range, customFrom, customTo])

  const expenses = useApi(() => api.summary({ direction: -1, dateFrom, dateTo }), [dateFrom, dateTo])
  const income = useApi(() => api.summary({ direction: 1, dateFrom, dateTo }), [dateFrom, dateTo])
  const cats = useApi(() => api.listCategories(), [])
  const allTime = useApi(
    () =>
      Promise.all([
        api.summary({ direction: -1 }),
        api.summary({ direction: 1 }),
      ]),
    [],
  )
  const hasAnyData =
    (allTime.data?.[0]?.transaction_count ?? 0) + (allTime.data?.[1]?.transaction_count ?? 0) > 0

  const loading = expenses.loading || income.loading
  const error = expenses.error ?? income.error

  const merged: { rows: Summary['categories']; totalCount: number; total: number } =
    useMemo(() => {
      const exp = expenses.data?.categories ?? []
      const inc = income.data?.categories ?? []
      if (dir === 'expenses') {
        return { rows: exp, total: expenses.data?.total ?? 0, totalCount: expenses.data?.transaction_count ?? 0 }
      }
      if (dir === 'income') {
        return { rows: inc, total: income.data?.total ?? 0, totalCount: income.data?.transaction_count ?? 0 }
      }
      const byId = new Map<number | null, { sum: number; count: number }>()
      for (const r of [...exp, ...inc]) {
        const prev = byId.get(r.category_id) ?? { sum: 0, count: 0 }
        prev.sum += r.total
        prev.count += r.count
        byId.set(r.category_id, prev)
      }
      const rows = Array.from(byId.entries())
        .map(([category_id, v]) => {
          const src = [...exp, ...inc].find((r) => r.category_id === category_id)
          return {
            category_id,
            category_name: src?.category_name ?? '?',
            total: v.sum,
            count: v.count,
            percentage: 0,
          }
        })
        .sort((a, b) => b.total - a.total)
      const total = rows.reduce((a, r) => a + r.total, 0)
      return { rows, total, totalCount: (expenses.data?.transaction_count ?? 0) + (income.data?.transaction_count ?? 0) }
    }, [dir, expenses.data, income.data])

  const catById = useMemo(
    () => new Map((cats.data ?? []).map((c) => [c.id, c])),
    [cats.data],
  )
  const rows = merged.rows
  const colors = rows.map(
    (r) => catById.get(r.category_id!)?.colour ?? PALETTE[rows.findIndex((x) => x === r) % PALETTE.length],
  )

  const labels = rows.map((r) => r.category_name)
  const values = rows.map((r) => Math.round(r.total * 100) / 100)

  function handleSelect(index: number) {
    const id = rows[index]?.category_id
    if (id != null) navigate(`/transactions?category=${id}`)
  }

  return (
    <div className="space-y-5">
      <PageTitle
        title="Category breakdown"
        subtitle="Where your money goes, across categories"
      />

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="btn-group flex rounded-md border border-edge p-0.5">
          {(['expenses', 'income', 'all'] as Dir[]).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDir(d)}
              className={cn(
                'rounded px-3 py-1.5 text-xs uppercase tracking-wide transition-colors',
                dir === d ? 'bg-brand text-[#04130c]' : 'text-ink-dim hover:text-ink',
              )}
            >
              {d}
            </button>
          ))}
        </div>

        <select
          className="select !w-auto py-1.5 text-xs"
          value={range}
          onChange={(e) => setRange(e.target.value as Range)}
        >
          <option value="month">This month</option>
          <option value="3m">Last 3 months</option>
          <option value="custom">Custom range</option>
        </select>

        {range === 'custom' && (
          <div className="flex items-center gap-2">
            <input type="date" className="input !w-auto py-1.5 text-xs" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
            <span className="text-ink-faint">→</span>
            <input type="date" className="input !w-auto py-1.5 text-xs" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
          </div>
        )}

        <div className="ml-auto flex gap-1 rounded-md border border-edge p-0.5">
          {(['doughnut', 'bar'] as ChartKind[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={cn(
                'rounded px-3 py-1.5 text-xs uppercase transition-colors',
                kind === k ? 'bg-panel-2 text-brand' : 'text-ink-dim hover:text-ink',
              )}
            >
              {k === 'doughnut' ? 'Donut' : 'Bars'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <Card className="h-96">
          <SkeletonLines rows={8} />
        </Card>
      ) : error ? (
        <ErrorState message={error} onRetry={() => { expenses.reload(); income.reload() }} />
) : rows.length === 0 || merged.total === 0 ? (
        hasAnyData ? (
          <EmptyState
            icon="◔"
            title="No transactions in this range"
            body={`No ${dir === 'all' ? '' : dir + ' '}transactions found between ${dateFrom} and ${dateTo}. Try a wider date range.`}
            action={
              <button type="button" className="btn btn-primary" onClick={() => setRange('3m')}>
                Last 3 months
              </button>
            }
          />
        ) : (
          <EmptyState
            icon="◔"
            title="No spending breakdown yet"
            body="Import transactions to see your spending breakdown."
            action={
              <button type="button" className="btn btn-primary" onClick={() => navigate('/import')}>
                Import CSV
              </button>
            }
          />
        )
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          {/* Chart */}
          <Card className="p-5 lg:col-span-3">
            <div className="h-[300px] sm:h-[360px]">
              <CategoryChart
                kind={kind}
                labels={labels}
                values={values}
                colors={colors}
                onSelect={handleSelect}
              />
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-edge-soft pt-3">
              <span className="text-xs text-ink-dim">
                {merged.totalCount} transaction{merged.totalCount === 1 ? '' : 's'} in range
              </span>
              <span className="font-mono text-sm text-ink">Total {fmtMoney(merged.total)}</span>
            </div>
            <div className="mt-2 text-[11px] text-ink-faint">
              Tip: click any slice/bar to see those transactions.
            </div>
          </Card>

          {/* Legend */}
          <Card className="p-4 lg:col-span-2">
            <h3 className="mb-3 font-mono text-xs uppercase tracking-[0.15em] text-ink-faint">
              Legend
            </h3>
            <ul className="space-y-2">
              {rows.map((r) => {
                const colour = catById.get(r.category_id!)?.colour
                return (
                  <li key={r.category_id} className="flex items-center gap-3">
                    <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: colour ?? '#8b98a9' }} />
                    <span className="flex-1 truncate text-sm text-ink">{r.category_name}</span>
                    <span className="font-mono text-xs text-ink-dim">{r.count} tx</span>
                    <Money amount={r.total} className="w-24 text-right text-xs" />
                    <span className="w-12 text-right font-mono text-xs text-ink-faint">
                      {merged.total ? ((r.total / merged.total) * 100).toFixed(0) : 0}%
                    </span>
                  </li>
                )
              })}
            </ul>
          </Card>
        </div>
      )}
    </div>
  )
}