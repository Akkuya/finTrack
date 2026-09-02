import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { useApi } from '../lib/useApi'
import {
  Card,
  CategoryChip,
  EmptyState,
  ErrorState,
  PageTitle,
  SkeletonLines,
} from '../components/ui'
import { cn } from '../lib/cn'
import TransactionsTable from '../components/TransactionsTable'

type SortKey = 'date' | 'name' | 'amount'
type SortDir = 'asc' | 'desc'

const SORT_LABEL: Record<SortKey, string> = {
  date: 'Date',
  name: 'Name',
  amount: 'Amount',
}

export default function TransactionsPage() {
  const [params, setParams] = useSearchParams()
  const categoryParam = params.get('category') ? Number(params.get('category')) : null

  const tx = useApi(
    () => (categoryParam != null ? api.transactionsByCategory(categoryParam) : api.listTransactions()),
    [categoryParam],
  )
  const cats = useApi(() => api.listCategories(), [])
  const [refreshKey, setRefreshKey] = useState(0)
  useEffect(() => {
    if (refreshKey > 0) void tx.reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey])

  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [expanded, setExpanded] = useState<number | null>(null)

  const catById = useMemo(
    () => new Map((cats.data ?? []).map((c) => [c.id, c])),
    [cats.data],
  )

  const filtered = useMemo(() => {
    const txns = tx.data ?? []
    const sorted = [...txns].sort((a, b) => {
      let cmp: number
      if (sortKey === 'amount') cmp = a.amount - b.amount
      else if (sortKey === 'name') cmp = a.name.localeCompare(b.name)
      else cmp = a.date.localeCompare(b.date)
      return sortDir === 'asc' ? cmp : -cmp
    })
    return sorted
  }, [tx.data, sortKey, sortDir])

  const flaggingCategory =
    categoryParam != null ? catById.get(categoryParam) : undefined

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir(key === 'name' ? 'asc' : 'desc')
    }
  }

  const loading = tx.loading || cats.loading

  return (
    <div className="space-y-5">
      <PageTitle
        title="Transactions"
        subtitle={`${filtered.length} transaction${filtered.length === 1 ? '' : 's'}`}
      />

      {flaggingCategory && (
        <div className="flex items-center gap-2 text-sm text-ink-dim">
          <span>
            Filtered by category{' '}
            <CategoryChip name={flaggingCategory.name} colour={flaggingCategory.colour} />
          </span>
          <button
            type="button"
            className="font-mono text-xs text-brand hover:underline"
            onClick={() => setParams({})}
          >
            clear ×
          </button>
        </div>
      )}

      {loading ? (
        <Card>
          <SkeletonLines rows={8} />
        </Card>
      ) : tx.error ? (
        <ErrorState message={tx.error} onRetry={tx.reload} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="▤"
          title={categoryParam != null ? 'No transactions in this category' : 'No transactions yet'}
          body={
            categoryParam != null
              ? 'This category has no transactions.'
              : 'Import a CSV bank export to populate your transaction list.'
          }
          action={
            categoryParam == null ? (
              <Link to="/import" className="btn btn-primary">
                Import CSV
              </Link>
            ) : undefined
          }
        />
      ) : (
        <Card>
          <div className="flex flex-wrap items-center gap-2 border-b border-edge-soft px-4 py-3">
            {(Object.keys(SORT_LABEL) as SortKey[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => toggleSort(key)}
                className={cn(
                  'btn !px-3 !py-1.5 text-xs',
                  sortKey === key && 'border-brand/40 text-brand',
                )}
              >
                {SORT_LABEL[key]} {sortKey === key ? (sortDir === 'asc' ? '▲' : '▼') : ''}
              </button>
            ))}
          </div>
          <TransactionsTable
            transactions={filtered}
            categoriesById={catById}
            expanded={expanded}
            setExpanded={setExpanded}
            onSaved={() => setRefreshKey((k) => k + 1)}
          />
        </Card>
      )}
    </div>
  )
}
