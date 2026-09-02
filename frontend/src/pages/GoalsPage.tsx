import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type Goal } from '../api'
import { useApi } from '../lib/useApi'
import { daysUntil, fmtMoney, fmtDate } from '../lib/format'
import {
  Card,
  EmptyState,
  ErrorState,
  PageTitle,
  ProgressBar,
  SkeletonLines,
  Spinner,
} from '../components/ui'
import { cn } from '../lib/cn'

type SortKey = 'target_date' | 'progress' | 'necessity'

function goalProgress(goal: Goal, netSavings: number): number {
  if (goal.target_price <= 0) return 0
  return Math.min(100, (netSavings / goal.target_price) * 100)
}

function goalTone(goal: Goal, netSavings: number): 'good' | 'warn' | 'bad' | 'done' {
  const pct = goalProgress(goal, netSavings)
  if (pct >= 100) return 'done'
  const remaining = daysUntil(goal.target_date)
  if (netSavings <= 0) return 'bad'
  const monthsRemaining = Math.max(remaining / 30.44, 0)
  const monthlyNet = Math.max(netSavings, 0.01) / 6
  const monthsNeeded = monthlyNet > 0 ? (goal.target_price - netSavings) / monthlyNet : Infinity
  if (monthsNeeded <= monthsRemaining) return 'good'
  if (monthsNeeded <= monthsRemaining * 2 + 1) return 'warn'
  return 'bad'
}

function GoalCard({
  goal,
  netSavings,
  advice,
}: {
  goal: Goal
  netSavings: number
  advice: (g: Goal) => Promise<string>
}) {
  const [tip, setTip] = useState<{ loading: boolean; text: string | null; error: string | null }>({
    loading: false,
    text: null,
    error: null,
  })
  const pct = goalProgress(goal, netSavings)
  const tone = goalTone(goal, netSavings)
  const remaining = daysUntil(goal.target_date)

  async function loadTip() {
    setTip({ loading: true, text: null, error: null })
    try {
      const text = await advice(goal)
      setTip({ loading: false, text, error: null })
    } catch (err) {
      setTip({ loading: false, text: null, error: err instanceof Error ? err.message : 'Failed' })
    }
  }

  const toneCls =
    tone === 'done'
      ? 'text-accent'
      : tone === 'good'
        ? 'text-income'
        : tone === 'warn'
          ? 'text-warn'
          : 'text-expense'

  return (
    <Card hover className="flex flex-col p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-ink">{goal.item_name}</div>
          <div className="mt-0.5 text-xs text-ink-dim">
            {goal.description || 'No description'}
          </div>
        </div>
        <span className="font-mono text-xs text-ink-faint">necessity {goal.necessity ?? '—'}/10</span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div>
          <div className="label !mb-1">Target</div>
          <div className="font-mono text-sm text-ink">{fmtMoney(goal.target_price)}</div>
        </div>
        <div>
          <div className="label !mb-1">Saved</div>
          <div className="font-mono text-sm text-ink-dim">{fmtMoney(Math.min(netSavings, goal.target_price))}</div>
        </div>
        <div>
          <div className="label !mb-1">Due</div>
          <div className="font-mono text-xs text-ink-dim">{fmtDate(goal.target_date)}</div>
        </div>
      </div>

      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between">
          <div className="flex-1">
            <ProgressBar pct={pct} tone="auto" height="h-2" />
          </div>
          <span className={cn('ml-2 w-14 text-right font-mono text-xs font-bold', toneCls)}>
            {pct.toFixed(0)}%
          </span>
        </div>
        <div className={cn('mt-1 text-[11px]', tone === 'bad' ? 'text-expense' : 'text-ink-faint')}>
          {pct >= 100
            ? 'Goal reached — congrats!'
            : remaining > 0
              ? `${remaining} day${remaining === 1 ? '' : 's'} remaining`
              : remaining === 0
                ? 'Due today'
                : `Overdue by ${Math.abs(remaining)} day${Math.abs(remaining) === 1 ? '' : 's'}`}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 border-t border-edge-soft pt-3">
        <button type="button" className="btn !px-3 !py-1.5 text-xs" onClick={() => void loadTip()} disabled={tip.loading}>
          {tip.loading ? 'thinking…' : '☉ AI tip'}
        </button>
      </div>
      {tip.loading && (
        <div className="mt-2">
          <Spinner label="Asking LLM" />
        </div>
      )}
      {tip.text && !tip.loading && (
        <div className="mt-2 rounded-md border border-brand/25 bg-brand/5 p-3 text-xs leading-relaxed text-ink">
          {tip.text.split('\n').map((ln, i) => (
            <p key={i} className="mb-1 last:mb-0">{ln}</p>
          ))}
        </div>
      )}
      {tip.error && !tip.loading && (
        <div className="mt-2 rounded-md border border-expense/40 bg-expense/5 p-3 text-xs text-expense">
          {tip.error}
        </div>
      )}
    </Card>
  )
}

export default function GoalsPage() {
  const goals = useApi(() => api.listGoals(), [])
  const txns = useApi(() => api.listTransactions(), [])
  const [sortKey, setSortKey] = useState<SortKey>('target_date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const netSavings = useMemo(() => {
    const t = txns.data ?? []
    let net = 0
    for (const x of t) net += x.direction >= 1 ? x.amount : -x.amount
    return net
  }, [txns.data])

  const sorted = useMemo(() => {
    const g = goals.data ?? []
    const arr = [...g].sort((a, b) => {
      let cmp: number
      if (sortKey === 'target_date') cmp = a.target_date.localeCompare(b.target_date)
      else if (sortKey === 'progress') cmp = goalProgress(a, netSavings) - goalProgress(b, netSavings)
      else cmp = (a.necessity ?? 0) - (b.necessity ?? 0)
      return sortDir === 'asc' ? cmp : -cmp
    })
    return arr
  }, [goals.data, sortKey, sortDir, netSavings])

  const loading = goals.loading || txns.loading

  return (
    <div className="space-y-5">
      <PageTitle
        title="Goals"
        subtitle="Savings targets and how far along you are"
        right={
          <Link to="/goals/new" className="btn btn-primary">
            + Create goal
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            ['target_date', 'Target date'],
            ['progress', 'Progress'],
            ['necessity', 'Necessity'],
          ] as Array<[SortKey, string]>
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={cn(
              'btn !px-3 !py-1.5 text-xs',
              sortKey === key && 'border-brand/40 text-brand',
            )}
            onClick={() => {
              if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
              else {
                setSortKey(key)
                setSortDir(key === 'necessity' ? 'desc' : 'asc')
              }
            }}
          >
            {label} {sortKey === key ? (sortDir === 'asc' ? '▲' : '▼') : ''}
          </button>
        ))}
        <span className="font-mono text-[11px] text-ink-faint">
          saved = net savings across all transactions
        </span>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Card key={i}>
              <SkeletonLines rows={6} />
            </Card>
          ))}
        </div>
      ) : goals.error ? (
        <ErrorState message={goals.error} onRetry={goals.reload} />
      ) : sorted.length === 0 ? (
        <EmptyState
          icon="◎"
          title="No goals yet"
          body="Create your first savings goal and FinTrack will tell you how realistic your timeline is."
          action={
            <Link to="/goals/new" className="btn btn-primary">
              Create your first goal
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sorted.map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              netSavings={netSavings}
              advice={(goal) => api.goalAdvice(goal.id).then((r) => r.advice)}
            />
          ))}
        </div>
      )}
    </div>
  )
}