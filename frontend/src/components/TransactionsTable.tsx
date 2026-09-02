import { Fragment, useState } from 'react'
import { api, type Transaction } from '../api'
import { fmtDate } from '../lib/format'
import { cn } from '../lib/cn'
import {
  CategoryChip,
  Money,
  Toast,
} from './ui'

function TransactionsTable({
  transactions,
  categoriesById,
  expanded,
  setExpanded,
  onSaved,
}: {
  transactions: Transaction[]
  categoriesById: Map<number, { id: number; name: string; colour: string | null }>
  expanded: number | null
  setExpanded: (id: number | null) => void
  onSaved: () => void
}) {
  const [busy, setBusy] = useState<number | null>(null)
  const [saveMsg, setSaveMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  const opts = Array.from(categoriesById.values())

  async function saveCategory(t: Transaction, categoryId: number | null) {
    if (t.category_id === categoryId) return
    setBusy(t.id)
    setSaveMsg(null)
    try {
      await api.updateTransaction(t.id, {
        date: t.date,
        name: t.name,
        amount: t.amount,
        direction: t.direction,
        account: t.account,
        currency: t.currency,
        category_id: categoryId,
      })
      setSaveMsg({ kind: 'ok', text: 'Category updated' })
      onSaved()
    } catch (err) {
      setSaveMsg({ kind: 'err', text: err instanceof Error ? err.message : 'Update failed' })
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex flex-col">
      {saveMsg && (
        <div className="border-b border-edge-soft p-3">
          <Toast kind={saveMsg.kind}>{saveMsg.text}</Toast>
        </div>
      )}

      {/* Mobile card list */}
      <div className="sm:hidden">
        {transactions.map((t) => {
          const cat = t.category_id != null ? categoriesById.get(t.category_id) : undefined
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setExpanded(expanded === t.id ? null : t.id)}
              className="block w-full border-b border-edge-soft px-4 py-3 text-left transition-colors hover:bg-panel-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm text-ink">{t.name}</span>
                <Money amount={t.amount} direction={t.direction} className="text-sm" />
              </div>
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <span className="font-mono text-[11px] text-ink-dim">{fmtDate(t.date)}</span>
                {cat ? <CategoryChip name={cat.name} colour={cat.colour} /> : <span className="text-[11px] text-ink-faint">uncategorized</span>}
              </div>
              {expanded === t.id && (
                <div className="mt-2 rounded-md border border-edge p-2 text-xs text-ink-dim">
                  <div>Account: {t.account ?? '—'}</div>
                  <div>Currency: {t.currency ?? '—'}</div>
                  <div>Direction: {t.direction >= 1 ? 'inflow' : 'outflow'}</div>
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="tbl">
          <thead>
            <tr>
              <th className="w-8" />
              <th>Date</th>
              <th>Name</th>
              <th>Amount</th>
              <th>Category</th>
              <th>Account</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => {
              const cat = t.category_id != null ? categoriesById.get(t.category_id) : undefined
              const open = expanded === t.id
              return (
                <Fragment key={t.id}>
                  <tr className="cursor-pointer" onClick={() => setExpanded(open ? null : t.id)}>
                    <td className="font-mono text-[11px] text-brand/70">{open ? '▾' : '▸'}</td>
                    <td className={cn('font-mono text-xs', open && 'text-brand')}>{fmtDate(t.date)}</td>
                    <td className="text-sm text-ink">{t.name}</td>
                    <td>
                      <Money amount={t.amount} direction={t.direction} className="text-sm" />
                    </td>
                    <td>
                      {cat ? (
                        <CategoryChip name={cat.name} colour={cat.colour} />
                      ) : (
                        <span className="text-xs text-ink-faint">—</span>
                      )}
                    </td>
                    <td className="text-xs text-ink-dim">{t.account ?? '—'}</td>
                  </tr>
                  {open && (
                    <tr className="bg-panel-2/50">
                      <td colSpan={6} className="!px-4 !py-3">
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 md:grid-cols-4">
          <div>
            <div className="label !mb-1">Category</div>
            <div>
              {cat ? <CategoryChip name={cat.name} colour={cat.colour} /> : <span className="text-xs text-ink-dim">Uncategorized</span>}
            </div>
          </div>
          <div>
            <div className="label !mb-1">Account</div>
            <div className="text-xs text-ink-dim">{t.account ?? '—'}</div>
          </div>
          <div>
            <div className="label !mb-1">Currency</div>
            <div className="text-xs text-ink-dim">{t.currency ?? '—'}</div>
          </div>
          <div>
            <div className="label !mb-1">Direction</div>
            <div className="text-xs text-ink-dim">
              {t.direction >= 1 ? 'inflow (income)' : 'outflow (expense)'}
            </div>
          </div>
          <div>
            <div className="label !mb-1">ID</div>
            <div className="font-mono text-xs text-ink-dim">#{t.id}</div>
          </div>
        </div>
                        <div className="mt-3 flex flex-wrap items-end gap-3">
                          <div>
                            <label className="label" htmlFor={`cat-${t.id}`}>
                              Recategorize
                            </label>
                            <select
                              id={`cat-${t.id}`}
                              className="select !w-auto py-1.5 text-xs"
                              value={t.category_id ?? ''}
                              disabled={busy === t.id}
                              onChange={(e) => {
                                const v = e.target.value
                                void saveCategory(t, v === '' ? null : Number(v))
                              }}
                            >
                              <option value="">Uncategorized</option>
                              {opts.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default TransactionsTable