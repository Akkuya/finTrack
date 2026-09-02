export const API_BASE = 'http://localhost:8000'

/** The CSV bank formats supported by the ingestion parsers. */
export const BANKS = ['simplii', 'tangerine'] as const
export type Bank = (typeof BANKS)[number]

/* ---------------------------------- Types --------------------------------- */

export interface Transaction {
  id: number
  date: string
  name: string
  amount: number
  direction: number // 1 = income, -1 = expense
  account: string | null
  currency: string | null
  category_id: number | null
  updated_at?: string | null
}

export interface TransactionUpdate {
  date: string
  name: string
  amount: number
  direction: number
  account: string | null
  currency: string | null
  category_id: number | null
}

export interface Category {
  id: number
  name: string
  budget_limit: number | null
  colour: string | null
  counts_as_cashflow: boolean
}

export interface CategoryInput {
  name: string
  budget_limit?: number | null
  colour?: string | null
  counts_as_cashflow?: boolean
}

export interface Goal {
  id: number
  item_name: string
  target_price: number
  description: string
  necessity: number | null
  necessity_source: number
  status: number
  target_date: string
}

export interface GoalInput {
  item_name: string
  target_price: number
  description: string
  necessity: number
  necessity_source: number
  status: number
  target_date: string
}

export interface SummaryRow {
  category_id: number | null
  category_name: string
  total: number
  count: number
  percentage: number
}

export interface Summary {
  categories: SummaryRow[]
  total: number
  transaction_count: number
}

export interface ImportResult {
  imported: number
  categorized: number
  llm_unavailable: boolean
}

export interface OpResult {
  status: string
  item?: string
  id?: number
}

export interface AdviceResponse {
  advice: string
}

/* -------------------------------- Transport ------------------------------- */

export class ApiError extends Error {
  status: number
  constructor(status: number, detail: string) {
    super(detail)
    this.name = 'ApiError'
    this.status = status
  }
}

const DEFAULT_TIMEOUT_MS = 30000
const ADVICE_TIMEOUT_MS = 120000

async function readDetail(res: Response): Promise<string> {
  try {
    const data = await res.json()
    if (typeof data?.detail === 'string') return data.detail
    if (Array.isArray(data?.detail)) {
      return data.detail
        .map((d: { msg?: string }) => d.msg ?? JSON.stringify(d))
        .join('; ')
    }
    if (typeof data?.message === 'string') return data.message
    return JSON.stringify(data)
  } catch {
    return res.statusText || `Request failed (${res.status})`
  }
}

async function request<T>(
  path: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, headers, ...rest } = init
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...rest,
      headers: { 'Content-Type': 'application/json', ...headers },
      signal: init.signal ?? controller.signal,
    })
    if (!res.ok) {
      throw new ApiError(res.status, await readDetail(res))
    }
    if (res.status === 204) return undefined as T
    return (await res.json()) as T
  } catch (err) {
    if (err instanceof ApiError) throw err
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError(0, 'Request timed out. The backend may be down.')
    }
    throw new ApiError(0, 'Cannot reach the backend. Is the API running on localhost:8000?')
  } finally {
    clearTimeout(timer)
  }
}

/* --------------------------------- Client -------------------------------- */

export const api = {
  listTransactions(): Promise<Transaction[]> {
    return request('/transactions')
  },

  transactionsByCategory(categoryId: number): Promise<Transaction[]> {
    return request(`/transactions/by-category?category_id=${categoryId}`)
  },

  summary(params: {
    direction?: number
    dateFrom?: string | null
    dateTo?: string | null
  }): Promise<Summary> {
    const search = new URLSearchParams()
    if (params.direction !== undefined) search.set('direction', String(params.direction))
    if (params.dateFrom) search.set('date_from', params.dateFrom)
    if (params.dateTo) search.set('date_to', params.dateTo)
    const qs = search.toString()
    return request(`/transactions/summary${qs ? `?${qs}` : ''}`)
  },

  importCsv(
    file: File,
    params: { bank: Bank },
    onProgress?: (percent: number) => void,
    signal?: AbortSignal,
  ): Promise<ImportResult> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      const form = new FormData()
      form.append('file', file, file.name)
      form.append('bank', params.bank)

      xhr.open('POST', `${API_BASE}/transactions/import`)
      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
        })
      }
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText) as ImportResult)
          } catch {
            reject(new ApiError(xhr.status, 'Unexpected response from server'))
          }
        } else {
          let detail = xhr.responseText
          try {
            const data = JSON.parse(xhr.responseText)
            if (typeof data?.detail === 'string') detail = data.detail
          } catch {
            /* keep raw text */
          }
          reject(new ApiError(xhr.status, detail))
        }
      })
      xhr.addEventListener('error', () =>
        reject(new ApiError(0, 'Upload failed. Is the API running on localhost:8000?')),
      )
      xhr.addEventListener('abort', () =>
        reject(new ApiError(0, 'Upload cancelled')),
      )
      signal?.addEventListener('abort', () => xhr.abort())
      xhr.send(form)
    })
  },

  updateTransaction(id: number, body: TransactionUpdate): Promise<Transaction> {
    return request(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(body) })
  },

  listGoals(): Promise<Goal[]> {
    return request('/goals')
  },

  getGoal(id: number): Promise<Goal> {
    return request(`/goals/${id}`)
  },

  createGoal(input: GoalInput): Promise<OpResult> {
    return request<OpResult>('/goals', { method: 'POST', body: JSON.stringify(input) })
  },

  listCategories(): Promise<Category[]> {
    return request('/categories')
  },

  getCategory(id: number): Promise<Category> {
    return request(`/categories/${id}`)
  },

  createCategory(input: CategoryInput): Promise<OpResult> {
    return request<OpResult>('/categories', {
      method: 'POST',
      body: JSON.stringify({
        name: input.name,
        budget_limit: input.budget_limit ?? null,
        colour: input.colour ?? null,
        counts_as_cashflow: input.counts_as_cashflow ?? true,
      }),
    })
  },

  updateCategory(id: number, input: CategoryInput): Promise<OpResult> {
    return request<OpResult>(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(input) })
  },

  deleteCategory(id: number): Promise<OpResult> {
    return request(`/categories/${id}`, { method: 'DELETE' })
  },

  generalAdvice(): Promise<AdviceResponse> {
    return request('/advice/general', { timeoutMs: ADVICE_TIMEOUT_MS })
  },

  goalAdvice(goalId: number): Promise<AdviceResponse> {
    return request(`/advice/goal/${goalId}`, { timeoutMs: ADVICE_TIMEOUT_MS })
  },
}