import { useMemo, useState } from 'react'
import { api, type Category } from '../api'
import { useApi } from '../lib/useApi'
import { fmtMoney } from '../lib/format'
import { cn } from '../lib/cn'
import { Card, ErrorState, PageTitle, SkeletonLines, Toast } from '../components/ui'

const PALETTE = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#06b6d4',
  '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#a3a3a3', '#84cc16',
]

const DEFAULT_COLOUR = '#3ddc97'

export default function CategoriesPage() {
  const cats = useApi(() => api.listCategories(), [])
  const txns = useApi(() => api.listTransactions(), [])

  const [search, setSearch] = useState('')
  const [name, setName] = useState('')
  const [budget, setBudget] = useState('')
  const [colour, setColour] = useState(DEFAULT_COLOUR)
  const [cashflow, setCashflow] = useState(true)
  const [addError, setAddError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  const [editing, setEditing] = useState<{ id: number; field: 'name' | 'budget' } | null>(null)
  const [editValue, setEditValue] = useState('')
  const [colourOpen, setColourOpen] = useState<number | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null)
  const [deleting, setDeleting] = useState(false)

  const isLoading = cats.loading || txns.loading

  const catById = useMemo(
    () => new Map((cats.data ?? []).map((c) => [c.id, c])),
    [cats.data],
  )
  const txCountByCat = useMemo(() => {
    const m = new Map<number, number>()
    for (const t of txns.data ?? []) {
      if (t.category_id != null) m.set(t.category_id, (m.get(t.category_id) ?? 0) + 1)
    }
    return m
  }, [txns.data])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = cats.data ?? []
    if (!q) return list
    return list.filter((c) => c.name.toLowerCase().includes(q))
  }, [cats.data, search])

  function reloadAll() {
    cats.reload()
    txns.reload()
  }

  async function addCategory(e: React.FormEvent) {
    e.preventDefault()
    setAddError(null)
    if (!name.trim()) {
      setAddError('Name is required.')
      return
    }
    const budgetNum = budget === '' ? null : Number(budget)
    if (budgetNum !== null && (Number.isNaN(budgetNum) || budgetNum <= 0)) {
      setAddError('Budget must be positive.')
      return
    }
    setAdding(true)
    try {
      await api.createCategory({ name: name.trim(), budget_limit: budgetNum, colour, counts_as_cashflow: cashflow })
      setMsg({ kind: 'ok', text: `Category "${name.trim()}" created.` })
      setName('')
      setBudget('')
      void reloadAll()
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to create category.')
    } finally {
      setAdding(false)
    }
  }

  async function commitEdit(id: number, field: 'name' | 'budget') {
    const cat = catById.get(id)
    if (!cat) return
    setEditing(null)
    let value: string | number | null = editValue.trim()
    if (field === 'name') {
      if (value === '' || value === cat.name) return
    } else {
      if (value === '' || value === null) {
        value = null // treat empty budget as "no limit"
      } else {
        const num = Number(value)
        if (Number.isNaN(num) || num <= 0) {
setMsg({ kind: 'err', text: 'Budget must be a positive number.' })
      return
        }
        value = num
      }
      if (value === cat.budget_limit) return
    }
    try {
      await api.updateCategory(id, {
        name: cat.name,
        budget_limit: cat.budget_limit,
        colour: cat.colour,
        ...(field === 'name' ? { name: value as string } : { budget_limit: value as number | null }),
      })
      setMsg({ kind: 'ok', text: field === 'name' ? 'Category renamed.' : 'Budget limit updated.' })
      void reloadAll()
    } catch (err) {
      setMsg({ kind: 'err', text: err instanceof Error ? err.message : 'Update failed.' })
    }
  }

  async function applyColour(id: number, hex: string) {
    const cat = catById.get(id)
    if (!cat || cat.colour === hex) {
      setColourOpen(null)
      return
    }
    try {
      await api.updateCategory(id, {
        name: cat.name,
        budget_limit: cat.budget_limit,
        colour: hex,
      })
      setMsg({ kind: 'ok', text: 'Colour updated.' })
      void reloadAll()
    } catch (err) {
      setMsg({ kind: 'err', text: err instanceof Error ? err.message : 'Update failed.' })
    }
    setColourOpen(null)
  }

  async function toggleCashflow(c: Category) {
    try {
      await api.updateCategory(c.id, {
        name: c.name,
        budget_limit: c.budget_limit,
        colour: c.colour,
        counts_as_cashflow: !c.counts_as_cashflow,
      })
      setMsg({
        kind: 'ok',
        text: !c.counts_as_cashflow
          ? `"${c.name}" now counts in the cashflow breakdown.`
          : `"${c.name}" excluded from the cashflow breakdown.`,
      })
      void reloadAll()
    } catch (err) {
      setMsg({ kind: 'err', text: err instanceof Error ? err.message : 'Update failed.' })
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    const cat = pendingDelete
    setDeleting(true)
    try {
      await api.deleteCategory(cat.id)
      setMsg({ kind: 'ok', text: `Category "${cat.name}" deleted.` })
      setPendingDelete(null)
      void reloadAll()
    } catch (err) {
      setMsg({ kind: 'err', text: err instanceof Error ? err.message : 'Delete failed.' })
      setPendingDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  // cheap fallback for palette colours on legacy rows
  const colourOf = (c: Category) => c.colour ?? DEFAULT_COLOUR

  return (
    <div className="space-y-5">
      <PageTitle
        title="Categories"
        subtitle="Name, colour and monthly budget limit per category"
      />

      {msg && (
        <Toast kind={msg.kind}>{msg.text}</Toast>
      )}

      {/* Add form */}
      <Card className="p-4">
        <form onSubmit={(e) => void addCategory(e)} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[180px] flex-1">
            <label className="label" htmlFor="new-name">Name</label>
            <input
              id="new-name"
              className="input"
              placeholder="e.g. Coffee"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="w-36">
            <label className="label" htmlFor="new-budget">Budget limit</label>
            <input
              id="new-budget"
              type="number"
              min="0.01"
              step="0.01"
              className="input"
              placeholder="$ / month"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Colour</label>
            <div className="flex items-center gap-1.5">
              {PALETTE.slice(0, 8).map((hex) => (
                <button
                  key={hex}
                  type="button"
                  className={cn(
                    'h-5 w-5 rounded-full border transition-transform hover:scale-110',
                    colour === hex ? 'border-ink' : 'border-edge',
                  )}
                  style={{ background: hex }}
                  onClick={() => setColour(hex)}
                  aria-label={`use ${hex}`}
                />
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 pb-1 text-xs text-ink-dim">
            <input
              type="checkbox"
              checked={cashflow}
              onChange={(e) => setCashflow(e.target.checked)}
              className="accent-brand"
            />
            Counts as cashflow
          </label>
          <button type="submit" className="btn btn-primary" disabled={adding}>
            {adding ? 'Adding…' : '+ Add'}
          </button>
        </form>
        {addError && <p className="mt-2 text-xs text-expense">{addError}</p>}
      </Card>

      {/* Search */}
      <input
        className="input max-w-xs"
        placeholder="Search categories…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {isLoading ? (
        <Card>
          <SkeletonLines rows={7} />
        </Card>
      ) : cats.error ? (
        <ErrorState message={cats.error} onRetry={reloadAll} />
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center text-sm text-ink-dim">
          {search ? 'No categories match your search.' : 'No categories. Add one above.'}
        </Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th className="w-12">Colour</th>
                <th>Name</th>
                <th className="text-right">Tx count</th>
                <th className="w-44">Budget limit</th>
                <th className="w-28">Cashflow</th>
                <th className="w-24" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const count = txCountByCat.get(c.id) ?? 0
                return (
                  <tr key={c.id} className="group">
                    {/* swatch + palette */}
                    <td className="relative">
                      <button
                        type="button"
                        className="h-6 w-6 rounded-full border border-edge transition-transform hover:scale-110"
                        style={{ background: colourOf(c) }}
                        onClick={() => setColourOpen(colourOpen === c.id ? null : c.id)}
                        aria-label="pick colour"
                      />
                      {colourOpen === c.id && (
                        <div className="absolute left-0 top-9 z-20 flex w-max flex-wrap gap-1.5 rounded-lg border border-edge bg-panel-2 p-2 shadow-xl">
                          {PALETTE.map((hex) => (
                            <button
                              key={hex}
                              type="button"
                              className={cn(
                                'h-5 w-5 rounded-full border transition-transform hover:scale-110',
                                colourOf(c) === hex ? 'border-ink' : 'border-edge',
                              )}
                              style={{ background: hex }}
                              onClick={() => void applyColour(c.id, hex)}
                              aria-label={`set ${hex}`}
                            />
                          ))}
                        </div>
                      )}
                    </td>
                    {/* inline rename */}
                    <td>
                      {editing?.id === c.id && editing.field === 'name' ? (
                        <input
                          autoFocus
                          className="input !w-48 !py-1 text-sm"
                          defaultValue={c.name}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') void commitEdit(c.id, 'name')
                            if (e.key === 'Escape') setEditing(null)
                          }}
                          onBlur={() => void commitEdit(c.id, 'name')}
                        />
                      ) : (
                        <button
                          type="button"
                          className="text-sm text-ink transition-colors hover:text-brand"
                          onClick={() => {
                            setEditing({ id: c.id, field: 'name' })
                            setEditValue(c.name)
                          }}
                          title="click to rename"
                        >
                          {c.name}
                        </button>
                      )}
                    </td>
                    <td className="text-right font-mono text-xs text-ink-dim">{count}</td>
                    {/* inline budget */}
                    <td>
                      {editing?.id === c.id && editing.field === 'budget' ? (
                        <input
                          autoFocus
                          type="number"
                          min="0.01"
                          step="0.01"
                          className="input !w-32 !py-1 text-sm"
                          placeholder="no limit"
                          defaultValue={c.budget_limit ?? ''}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') void commitEdit(c.id, 'budget')
                            if (e.key === 'Escape') setEditing(null)
                          }}
                          onBlur={() => void commitEdit(c.id, 'budget')}
                        />
                      ) : (
                        <button
                          type="button"
                          className="font-mono text-sm text-ink-dim transition-colors hover:text-brand"
                          onClick={() => {
                            setEditing({ id: c.id, field: 'budget' })
                            setEditValue(c.budget_limit?.toString() ?? '')
                          }}
                          title="click to set budget limit"
                        >
                          {c.budget_limit != null ? fmtMoney(c.budget_limit) : '—'}
                        </button>
                      )}
                    </td>
                    <td className="text-right">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={c.counts_as_cashflow}
                        className={cn(
                          'rounded border px-2 py-0.5 font-mono text-[11px] transition-colors',
                          c.counts_as_cashflow
                            ? 'border-brand/40 text-brand'
                            : 'border-edge text-ink-faint',
                        )}
                        onClick={() => void toggleCashflow(c)}
                        title={c.counts_as_cashflow ? 'counts in breakdown — click to exclude' : 'excluded from breakdown — click to include'}
                      >
                        {c.counts_as_cashflow ? 'on' : 'off'}
                      </button>
                    </td>
                    <td className="text-right">
                      <button
                        type="button"
                        className="font-mono text-xs text-ink-faint transition-colors hover:text-expense"
                        onClick={() => setPendingDelete(c)}
                      >
                        delete
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>
      )}

      {/* Delete confirmation */}
      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="card w-full max-w-md p-6">
            <div className="font-mono text-sm text-expense">[ delete category ]</div>
            <h3 className="mt-2 text-lg font-semibold text-ink">
              Delete “{pendingDelete.name}”?
            </h3>
            <p className="mt-2 text-sm text-ink-dim">
              {txCountByCat.get(pendingDelete.id) ?? 0} transaction
              {(txCountByCat.get(pendingDelete.id) ?? 0) === 1 ? ' is' : 's are'} assigned to
              this category. The backend blocks deleting categories that still have
              transactions — you must recategorize them first.
            </p>
            <div className="mt-5 flex items-center justify-end gap-3">
              <button type="button" className="btn" onClick={() => setPendingDelete(null)} disabled={deleting}>
                Cancel
              </button>
              <button type="button" className="btn btn-danger" onClick={() => void confirmDelete()} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}