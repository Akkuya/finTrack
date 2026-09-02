import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '../lib/cn'

export function Card({
  children,
  className: extra,
  hover = false,
}: {
  children: ReactNode
  className?: string
  hover?: boolean
}) {
  return <div className={cn('card', hover && 'card-hover', extra)}>{children}</div>
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-sm text-ink-dim">
      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-edge border-t-brand" />
      {label}…
    </div>
  )
}

export function SkeletonLines({ rows = 5 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-3 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-4 rounded bg-panel-2"
          style={{ width: `${100 - ((i * 9) % 40)}%` }}
        />
      ))}
    </div>
  )
}

export function ErrorState({
  message,
  onRetry,
  compact = false,
}: {
  message: string
  onRetry?: () => void
  compact?: boolean
}) {
  return (
    <div
      className={cn(
        'card flex flex-col items-start gap-3 border border-expense/40 text-sm',
        compact ? 'p-3' : 'p-6',
      )}
    >
      <div className="font-mono text-xs text-expense">[ backend unreachable ]</div>
      <p className="text-ink-dim">{message}</p>
      {onRetry && (
        <button type="button" className="btn btn-primary" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: string
  title: string
  body: string
  action?: ReactNode
}) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
      {icon && <div className="font-mono text-3xl text-brand/70">{icon}</div>}
      <div className="text-sm font-semibold text-ink">{title}</div>
      <div className="max-w-md text-sm text-ink-dim">{body}</div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

export function PageTitle({
  title,
  subtitle,
  right,
}: {
  title: string
  subtitle?: string
  right?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-mono text-xl font-bold tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-dim">{subtitle}</p>}
      </div>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  )
}

export function Stat({
  label,
  value,
  sub,
  tone = 'neutral',
}: {
  label: string
  value: string
  sub?: string
  tone?: 'neutral' | 'good' | 'bad'
}) {
  const toneCls =
    tone === 'good' ? 'text-income' : tone === 'bad' ? 'text-expense' : 'text-ink'
  return (
    <Card className="p-4">
      <div className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-ink-faint">
        {label}
      </div>
      <div className={cn('mt-2 font-mono text-2xl font-bold', toneCls)}>{value}</div>
      {sub && <div className="mt-1 text-xs text-ink-dim">{sub}</div>}
    </Card>
  )
}

export function CategoryChip({
  name,
  colour,
}: {
  name: string
  colour?: string | null
}) {
  return (
    <span
      className="chip"
      style={{ background: `${colour ?? '#1c2634'}25`, borderColor: `${colour ?? '#1c2634'}55`, color: colour ?? '#8b98a9' }}
      title={name}
    >
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{ background: colour ?? '#8b98a9' }}
      />
      {name}
    </span>
  )
}

export function Money({
  amount,
  direction,
  abs = false,
  className: extra,
}: {
  amount: number
  direction?: number
  abs?: boolean
  className?: string
}) {
  const income = direction === undefined ? undefined : direction >= 1
  const sign = direction !== undefined && !abs && direction >= 1
  const numeric = abs ? Math.abs(amount) : amount
  const v = numeric
    .toLocaleString('en-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 2 })
  return (
    <span
      className={cn(
        'font-mono tabular-nums',
        income === true && 'text-income',
        income === false && 'text-expense',
        extra,
      )}
    >
      {sign ? '+' : ''}
      {v}
    </span>
  )
}

export function ProgressBar({
  pct,
  tone = 'auto',
  height = 'h-1.5',
}: {
  pct: number
  tone?: 'auto' | 'good' | 'warn' | 'bad' | 'neutral'
  height?: string
}) {
  const clamped = Math.max(0, Math.min(100, pct))
  const color =
    tone === 'good'
      ? 'bg-income'
      : tone === 'warn'
        ? 'bg-warn'
        : tone === 'bad'
          ? 'bg-expense'
          : tone === 'neutral'
            ? 'bg-brand'
            : pct >= 100
              ? 'bg-accent'
              : pct >= 60
                ? 'bg-income'
                : pct >= 30
                  ? 'bg-warn'
                  : 'bg-expense'
  return (
    <div className={cn('w-full overflow-hidden rounded-full bg-panel-2', height)}>
      <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${clamped}%` }} />
    </div>
  )
}

export function Toast({ kind, children }: { kind: 'ok' | 'err' | 'info'; children: ReactNode }) {
  const styles =
    kind === 'ok'
      ? 'border-income/50 text-income [&_*]:text-income'
      : kind === 'err'
        ? 'border-expense/50 text-expense [&_*]:text-expense'
        : 'border-accent/50 text-accent [&_*]:text-accent'
  return (
    <div className={cn('card inline-flex items-center gap-2 border px-4 py-2 font-mono text-sm', styles)}>
      <span>{kind === 'ok' ? '✓' : kind === 'err' ? '✕' : 'i'}</span>
      <span>{children}</span>
    </div>
  )
}

export function NavLinkItem({
  to,
  icon,
  label,
}: {
  to: string
  icon: string
  label: string
}) {
  return (
    <Link to={to} className="group flex items-center gap-3">
      <span className="font-mono text-brand/80">{icon}</span>
      <span className="text-sm text-ink-dim transition-colors group-hover:text-ink">
        {label}
      </span>
    </Link>
  )
}