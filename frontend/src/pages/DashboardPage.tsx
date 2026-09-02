import { Link } from 'react-router-dom'
import { api } from '../api'
import { useApi } from '../lib/useApi'
import { fmtMoney, fmtPercent, fmtDateShort, isIncome } from '../lib/format'
import {
  Card,
  CategoryChip,
  EmptyState,
  ErrorState,
  Money,
  PageTitle,
  SkeletonLines,
  Stat,
  ProgressBar,
} from '../components/ui'

function summarizeRaw(transactions: Awaited<ReturnType<typeof api.listTransactions>>) {
  let income = 0
  let expenses = 0
  for (const t of transactions) {
    if (isIncome(t.direction)) income += t.amount
    else expenses += t.amount
  }
  const net = income - expenses
  const rate = income > 0 ? (net / income) * 100 : 0
  return { income, expenses, net, rate }
}

export default function DashboardPage() {
  const tx = useApi(() => api.listTransactions(), [])
  const cats = useApi(() => api.listCategories(), [])
  const top = useApi(() => api.summary({ direction: -1 }), [])

  const loading = tx.loading || cats.loading || top.loading
  const error = tx.error ?? cats.error ?? top.error

  if (loading) {
    return (
      <div className="space-y-6">
        <PageTitle title="Dashboard" subtitle="Your financial overview" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Card key={i}>
              <SkeletonLines rows={2} />
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card>
            <SkeletonLines rows={6} />
          </Card>
          <Card>
            <SkeletonLines rows={6} />
          </Card>
          <Card>
            <SkeletonLines rows={6} />
          </Card>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageTitle title="Dashboard" />
        <ErrorState message={error} onRetry={() => { tx.reload(); cats.reload(); top.reload() }} />
      </div>
    )
  }

  const txns = tx.data ?? []
  const categories = cats.data ?? []
  const catById = new Map(categories.map((c) => [c.id, c]))
  const stats = summarizeRaw(txns)
  const recent = txns.slice(0, 10)
  const topFive = (top.data?.categories ?? []).slice(0, 5)
  const maxTop = topFive[0]?.total ?? 0

  if (txns.length === 0) {
    return (
      <div className="space-y-6">
        <PageTitle title="Dashboard" subtitle="Your financial overview" />
        <EmptyState
          icon="⌘"
          title="No transactions yet"
          body="Import a bank CSV export to start tracking your spending. FinTrack parses, categorizes, and analyzes every transaction."
          action={
            <Link to="/import" className="btn btn-primary">
              Import your first CSV
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageTitle title="Dashboard" subtitle="Your financial overview" />

      {/* Summary stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total income" value={fmtMoney(stats.income)} tone="good" sub={`${txns.filter((t) => isIncome(t.direction)).length} inflows`} />
        <Stat label="Total expenses" value={fmtMoney(stats.expenses)} tone="bad" sub={`${txns.filter((t) => !isIncome(t.direction)).length} outflows`} />
        <Stat label="Net savings" value={fmtMoney(stats.net)} tone={stats.net >= 0 ? 'good' : 'bad'} sub="income − expenses" />
        <Stat label="Savings rate" value={fmtPercent(stats.rate, 1)} tone={stats.rate >= 20 ? 'good' : stats.rate < 0 ? 'bad' : 'neutral'} sub="net ÷ income × 100" />
      </div>

      {/* Quick actions */}
      <Card className="flex flex-wrap items-center gap-3 p-4">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">
          Quick actions
        </span>
        <Link to="/import" className="btn btn-primary">⇪ Import CSV</Link>
        <Link to="/goals/new" className="btn">◎ Add Goal</Link>
        <Link to="/transactions" className="btn">▤ View Transactions</Link>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Recent transactions */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between border-b border-edge-soft px-4 py-3">
            <h2 className="text-sm font-semibold text-ink">Recent transactions</h2>
            <Link to="/transactions" className="font-mono text-xs text-brand hover:underline">
              view all &gt;
            </Link>
          </div>
          <div className="divide-y divide-edge-soft">
            {recent.map((t) => {
              const cat = t.category_id != null ? catById.get(t.category_id) : undefined
              return (
                <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-16 shrink-0 font-mono text-[11px] text-ink-dim">
                    {fmtDateShort(t.date)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-ink">{t.name}</div>
                    {cat && (
                      <div className="mt-1">
                        <CategoryChip name={cat.name} colour={cat.colour} />
                      </div>
                    )}
                  </div>
                  <Money amount={t.amount} direction={t.direction} className="text-sm" />
                </div>
              )
            })}
            {recent.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-ink-dim">
                No transactions recorded yet.
              </div>
            )}
          </div>
        </Card>

        {/* Mini category breakdown */}
        <Card>
          <div className="flex items-center justify-between border-b border-edge-soft px-4 py-3">
            <h2 className="text-sm font-semibold text-ink">Top spending</h2>
            <Link to="/breakdown" className="font-mono text-xs text-brand hover:underline">
              chart &gt;
            </Link>
          </div>
          <div className="space-y-3 p-4">
            {topFive.map((row) => {
              const cat = catById.get(row.category_id!)
              return (
                <div key={row.category_id}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-ink">
                      <span className="inline-block h-2 w-2 rounded-full" style={{ background: cat?.colour ?? '#8b98a9' }} />
                      {row.category_name}
                    </span>
                    <span className="font-mono text-ink-dim">{fmtMoney(row.total)}</span>
                  </div>
                  <ProgressBar pct={maxTop ? (row.total / maxTop) * 100 : 0} />
                </div>
              )
            })}
            {topFive.length === 0 && (
              <div className="py-6 text-center text-sm text-ink-dim">
                Import transactions to see where your money goes.
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}