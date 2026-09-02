import { useCallback, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, BANKS, type Bank, type ImportResult } from '../api'
import { parseCsv } from '../lib/csv'
import { cn } from '../lib/cn'
import { Card, PageTitle, ProgressBar, Toast } from '../components/ui'

const MAX_BYTES = 10 * 1024 * 1024

const BANK_FIELDS: Record<Bank, string[]> = {
  simplii: ['Date', 'Transaction Details', 'Funds In', 'Funds Out'],
  tangerine: ['Date', 'Transaction', 'Name', 'Memo', 'Amount'],
}

const BANK_LABEL: Record<Bank, string> = {
  simplii: 'Simplii',
  tangerine: 'Tangerine',
}

type Phase = 'idle' | 'preview' | 'uploading' | 'processing' | 'done'

export default function ImportPage() {
  const [bank, setBank] = useState<Bank>('simplii')
  const requiredFields = useMemo(() => BANK_FIELDS[bank], [bank])

  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [progress, setProgress] = useState(0)
  const [preview, setPreview] = useState<string[][]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const acceptFile = useCallback(
    async (f: File | undefined | null, forBank?: Bank) => {
      if (!f) return
      const active = forBank ?? bank
      setError(null)
      setResult(null)

      if (!f.name.toLowerCase().endsWith('.csv')) {
        setError('Only .csv files are accepted.')
        return
      }
      if (f.size > MAX_BYTES) {
        setError('File too large. Max size is 10 MB.')
        return
      }

      setFile(f)
      try {
        const text = await f.text()
        const { headers: hs, rows } = parseCsv(text)
        const fields = BANK_FIELDS[active]
        const missing = fields.filter((required) => !hs.includes(required))
        setHeaders(hs)
        setPreview(rows.slice(0, 5))
        if (missing.length > 0) {
          setError(
            `${BANK_LABEL[active]} CSV is missing required columns: ${missing.join(', ')}. Expected: ${fields.join(', ')}. Did you pick the right bank?`,
          )
          setPhase('idle')
          return
        }
        if (rows.length === 0) {
          setError('CSV contains no data rows.')
          setPhase('idle')
          return
        }
        setPhase('preview')
      } catch {
        setError('Could not parse this CSV file. Is it valid CSV?')
        setPhase('idle')
      }
    },
    [bank],
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      void acceptFile(e.dataTransfer.files?.[0])
    },
    [acceptFile],
  )

  const doImport = useCallback(async () => {
    if (!file) return
    setPhase('uploading')
    setProgress(0)
    setError(null)
    try {
      const res = await api.importCsv(file, { bank }, setProgress)
      setResult(res)
      setProgress(100)
      setPhase('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed.')
      setPhase('preview')
    }
  }, [file, bank])

  const handleBankChange = (b: Bank) => {
    setBank(b)
    setResult(null)
    // Re-validate the currently selected file against the new bank's format.
    if (file) void acceptFile(file, b)
  }

  const reset = useCallback(() => {
    setFile(null)
    setPreview([])
    setHeaders([])
    setResult(null)
    setError(null)
    setProgress(0)
    setPhase('idle')
    if (inputRef.current) inputRef.current.value = ''
  }, [])

  return (
    <div className="space-y-5">
      <PageTitle
        title="Import CSV"
        subtitle="Pick your bank, then upload a CSV export. FinTrack parses it into transactions automatically."
      />

      {phase === 'done' && result ? (
        <div className="space-y-4">
          <Card className="p-6">
            <div className="font-mono text-xs text-brand">[ import complete ]</div>
            <div className="mt-3 font-mono text-3xl font-bold text-ink">
              {result.imported} transaction{result.imported === 1 ? '' : 's'} imported
            </div>
            <div className="mt-1 font-mono text-xs text-ink-dim">
              format: {BANK_LABEL[bank].toLowerCase()}
            </div>
            <p className="mt-2 text-sm text-ink-dim">
              {result.categorized} auto-categorized by the local LLM{' '}
              {result.imported - result.categorized > 0
                ? `(${result.imported - result.categorized} uncategorized). `
                : ''}
              You can recategorize any transaction from the transactions page.
            </p>
            {result.llm_unavailable && (
              <div className="mt-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
                The local LLM (Ollama) was unavailable during this import, so none of these
                transactions were auto-categorized. Start Ollama, then recategorize them manually
                from the transactions page, or re-import.
              </div>
            )}
          </Card>
          <div className="flex gap-3">
            <button type="button" className="btn btn-primary" onClick={reset}>
              ⇪ Import another
            </button>
            <Link to="/transactions" className="btn">
              View transactions
            </Link>
          </div>
        </div>
      ) : phase === 'uploading' || phase === 'processing' ? (
        <Card className="space-y-4 p-6">
          <div className="font-mono text-sm text-brand">
            {phase === 'uploading' ? '> uploading…' : '> processing… (LLM categorization may take a while)'}
          </div>
          <ProgressBar pct={progress} tone="good" height="h-2" />
          <div className="font-mono text-xs text-ink-dim">{progress}%</div>
          <div className="text-xs text-ink-dim">
            {file?.name} · {BANK_LABEL[bank].toLowerCase()} · {phase === 'uploading' ? 'uploading' : 'processing'}
          </div>
        </Card>
      ) : (
        <>
          {/* Bank select */}
          <Card className="p-4">
            <label className="label" htmlFor="bank">Bank format</label>
            <div className="flex flex-wrap gap-2">
              {BANKS.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => handleBankChange(b)}
                  className={cn(
                    'btn !px-4 !py-2 text-sm capitalize',
                    bank === b && 'border-brand/50 text-brand',
                  )}
                >
                  {BANK_LABEL[b]}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-ink-faint">
              Expected columns: <span className="font-mono">{requiredFields.join(', ')}</span>
            </p>
          </Card>

          <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
            }}
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={cn(
              'card flex cursor-pointer flex-col items-center justify-center gap-3 border-2 border-dashed px-6 py-14 text-center transition-colors',
              dragging ? 'border-brand bg-brand/5' : 'border-edge',
            )}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                void acceptFile(e.target.files?.[0])
              }}
            />
            <div className="font-mono text-3xl text-brand/60">⇪</div>
            <div className="text-sm font-semibold text-ink">
              Drag & drop your {BANK_LABEL[bank]} CSV here, or{' '}
              <span className="text-brand underline">browse</span>
            </div>
            <div className="font-mono text-[11px] text-ink-faint">.csv only · max 10 MB</div>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3">
              <Toast kind="err">{error}</Toast>
            </div>
          )}

          {phase === 'preview' && file && (
            <Card className="space-y-4 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-mono text-sm text-ink">
                  <span className="text-brand">$</span> {file.name}{' '}
                  <span className="text-ink-faint">
                    · {BANK_LABEL[bank]} · preview of first {preview.length} rows
                  </span>
                </div>
                <button type="button" className="btn btn-primary" onClick={() => void doImport()}>
                  Import transactions
                </button>
              </div>
              <div className="overflow-x-auto rounded-md border border-edge-soft">
                <table className="tbl">
                  <thead>
                    <tr>
                      {headers.map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i}>
                        {headers.map((h, j) => (
                          <td key={h} className="text-xs text-ink-dim">
                            {row[j] ?? ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="text-xs text-ink-faint">
                Importing runs through the {BANK_LABEL[bank]} parser and local LLM categorizer
                automatically.
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  )
}