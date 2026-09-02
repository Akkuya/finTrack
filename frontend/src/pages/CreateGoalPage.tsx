import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { todayIso } from '../lib/format'
import { cn } from '../lib/cn'
import { Card, PageTitle, Toast } from '../components/ui'

const EXAMPLES = [
  { item: 'New Laptop', desc: 'A MacBook or Windows thin-and-light for work', price: 2000, necessity: 7 },
  { item: 'Emergency Fund', desc: '3–6 months of expenses set aside', price: 6000, necessity: 9 },
  { item: 'Japan Trip', desc: 'Flights, hotels and spending money for two weeks', price: 4500, necessity: 5 },
  { item: 'New iPhone', desc: 'Replace my current 3-year-old phone', price: 1300, necessity: 3 },
]

interface Errors {
  item_name?: string
  target_price?: string
  target_date?: string
  necessity?: string
}

export default function CreateGoalPage() {
  const navigate = useNavigate()
  const [itemName, setItemName] = useState('')
  const [targetPrice, setTargetPrice] = useState('')
  const [description, setDescription] = useState('')
  const [necessity, setNecessity] = useState(5)
  const [targetDate, setTargetDate] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [touched, setTouched] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  function validate(item = itemName, price = targetPrice, date = targetDate): Errors {
    const e: Errors = {}
    if (!item.trim()) e.item_name = 'Item name is required.'
    if (price === '' || Number.isNaN(Number(price)) || Number(price) <= 0)
      e.target_price = 'Price must be a number greater than 0.'
    if (!date) e.target_date = 'Target date is required.'
    else if (date <= todayIso()) e.target_date = 'Target date must be in the future.'
    if (necessity < 1 || necessity > 10) e.necessity = 'Necessity must be between 1 and 10.'
    return e
  }

  const currentErrors = touched ? validate() : {}
  const showErrors = touched
  const hasErrors = Object.keys(currentErrors).length > 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setTouched(true)
    setServerError(null)
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    setSubmitting(true)
    try {
      await api.createGoal({
        item_name: itemName.trim(),
        target_price: Number(targetPrice),
        description: description.trim(),
        necessity,
        necessity_source: necessity >= 7 ? 2 : necessity >= 4 ? 1 : 0,
        status: 1,
        target_date: targetDate,
      })
      setSuccess(`Goal "${itemName.trim()}" created.`)
      window.setTimeout(() => navigate('/goals'), 900)
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Failed to create goal.')
      setSubmitting(false)
    }
  }

  function applyExample(ex: (typeof EXAMPLES)[number]) {
    setItemName(ex.item)
    setDescription(ex.desc)
    setTargetPrice(String(ex.price))
    setNecessity(ex.necessity)
    setTargetDate('')
    setErrors({})
  }

  return (
    <div className="space-y-5">
      <PageTitle
        title="Create goal"
        subtitle="Define a savings target and FinTrack will assess how realistic it is"
      />

      {success && (
        <Toast kind="ok">{success}</Toast>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Form */}
        <Card className="p-6 lg:col-span-2">
          <form onSubmit={(e) => void handleSubmit(e)} noValidate className="space-y-5">
            <div>
              <label className="label" htmlFor="item_name">Item name *</label>
              <input
                id="item_name"
                className={cn('input', showErrors && errors.item_name && 'invalid')}
                placeholder="e.g. New Laptop"
                value={itemName}
                onChange={(e) => {
                  setItemName(e.target.value)
                  setErrors(validate(e.target.value))
                }}
              />
              {showErrors && errors.item_name && (
                <p className="mt-1 text-xs text-expense">{errors.item_name}</p>
              )}
            </div>

            <div>
              <label className="label" htmlFor="target_price">Target price ($) *</label>
              <input
                id="target_price"
                type="number"
                min="0.01"
                step="0.01"
                className={cn('input', showErrors && errors.target_price && 'invalid')}
                placeholder="e.g. 2000"
                value={targetPrice}
                onChange={(e) => {
                  setTargetPrice(e.target.value)
                  setErrors(validate(itemName, e.target.value))
                }}
              />
              {showErrors && errors.target_price && (
                <p className="mt-1 text-xs text-expense">{errors.target_price}</p>
              )}
            </div>

            <div>
              <label className="label" htmlFor="description">Description</label>
              <textarea
                id="description"
                className="textarea"
                rows={3}
                placeholder="e.g. MacBook Pro 14&quot; — replacing current 2019 Intel model"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div>
              <label className="label" htmlFor="target_date">Target date *</label>
              <input
                id="target_date"
                type="date"
                className={cn('input', showErrors && errors.target_date && 'invalid')}
                value={targetDate}
                onChange={(e) => {
                  setTargetDate(e.target.value)
                  setErrors(validate(itemName, targetPrice, e.target.value))
                }}
              />
              {showErrors && errors.target_date && (
                <p className="mt-1 text-xs text-expense">{errors.target_date}</p>
              )}
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="label !mb-0" htmlFor="necessity">Necessity</label>
                <span className="font-mono text-sm text-brand">{necessity}/10</span>
              </div>
              <input
                id="necessity"
                type="range"
                min={1}
                max={10}
                step={1}
                value={necessity}
                onChange={(e) => {
                  setNecessity(Number(e.target.value))
                  setErrors(validate())
                }}
                className="w-full accent-[#3ddc97]"
              />
              <div className="flex justify-between text-[10px] text-ink-faint">
                <span>nice-to-have</span>
                <span>essential</span>
              </div>
            </div>

            {serverError && (
              <div className="rounded-md border border-expense/40 bg-expense/5 p-3 text-sm text-expense">
                {serverError}
              </div>
            )}

            <div className="flex items-center gap-3 pt-1">
              <button type="submit" className="btn btn-primary" disabled={submitting || hasErrors}>
                {submitting ? 'Creating…' : 'Create Goal'}
              </button>
              <Link to="/goals" className="btn">Cancel</Link>
            </div>
          </form>
        </Card>

        {/* Examples */}
        <Card className="h-fit p-4 lg:col-span-1">
          <h3 className="mb-3 font-mono text-xs uppercase tracking-[0.15em] text-ink-faint">
            Examples
          </h3>
          <div className="space-y-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex.item}
                type="button"
                className="block w-full rounded-md border border-edge p-3 text-left transition-colors hover:border-brand/40 hover:bg-panel-2"
                onClick={() => applyExample(ex)}
              >
                <div className="text-sm font-semibold text-ink">{ex.item}</div>
                <div className="mt-0.5 line-clamp-2 text-xs text-ink-dim">{ex.desc}</div>
                <div className="mt-1 font-mono text-xs text-brand">{fmtTarget(ex.price)} · necessity {ex.necessity}</div>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

function fmtTarget(v: number): string {
  return v.toLocaleString('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 })
}