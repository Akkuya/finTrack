import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { API_BASE } from '../api'
import { cn } from '../lib/cn'

const NAV = [
  { to: '/', label: 'Dashboard', icon: '◈', end: true },
  { to: '/transactions', label: 'Transactions', icon: '▤' },
  { to: '/import', label: 'Import CSV', icon: '⇪' },
  { to: '/breakdown', label: 'Breakdown', icon: '◔' },
  { to: '/goals', label: 'Goals', icon: '◎' },
  { to: '/categories', label: 'Categories', icon: '▦' },
]

type Status = 'checking' | 'up' | 'down'

function useApiStatus() {
  const [status, setStatus] = useState<Status>('checking')
  useEffect(() => {
    let active = true
    let timer: number
    const ping = async () => {
      try {
        const res = await fetch(`${API_BASE}/`, { signal: AbortSignal.timeout(4000) })
        if (!active) return
        setStatus(res.ok ? 'up' : 'down')
      } catch {
        if (active) setStatus('down')
      } finally {
        if (active) timer = window.setTimeout(ping, 20000)
      }
    }
    void ping()
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [])
  return status
}

const statusDot: Record<Status, { cls: string; label: string }> = {
  checking: { cls: 'bg-warn', label: 'checking…' },
  up: { cls: 'bg-income', label: 'api: up' },
  down: { cls: 'bg-expense', label: 'api: offline' },
}

function SidebarNav() {
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            cn(
              'group flex items-center gap-3 rounded-md border border-transparent px-3 py-2 transition-colors',
              isActive
                ? 'border-brand/25 bg-brand/10 text-brand'
                : 'text-ink-dim hover:bg-panel-2 hover:text-ink',
            )
          }
        >
          <span className="w-5 text-center text-sm">{item.icon}</span>
          <span className="text-sm">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

export default function Layout() {
  const status = useApiStatus()
  const dot = statusDot[status]

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col lg:flex-row">
      {/* Sidebar (desktop) */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-edge-soft p-5 lg:flex">
        <div className="mb-8">
          <div className="font-mono text-lg font-bold tracking-tight text-ink">
            fin<span className="text-brand">track</span>
            <span className="cursor-blink text-brand">_</span>
          </div>
          <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">
            personal finance terminal
          </div>
        </div>
        <div className="flex-1">
          <SidebarNav />
        </div>
        <div className="flex items-center gap-2 border-t border-edge-soft pt-4">
          <span className={cn('h-2 w-2 rounded-full', dot.cls)} />
          <span className="font-mono text-xs text-ink-dim">{dot.label}</span>
        </div>
      </aside>

      {/* Top bar (mobile) */}
      <header className="sticky top-0 z-20 border-b border-edge-soft bg-canvas/95 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="font-mono text-base font-bold text-ink">
            fin<span className="text-brand">track</span>
            <span className="cursor-blink text-brand">_</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn('h-2 w-2 rounded-full', dot.cls)} />
            <span className="font-mono text-[10px] text-ink-dim">{dot.label}</span>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors',
                  isActive
                    ? 'border-brand/25 bg-brand/10 text-brand'
                    : 'border-transparent text-ink-dim hover:bg-panel-2 hover:text-ink',
                )
              }
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </header>

      {/* Content */}
      <main className="h-full flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <Outlet />
      </main>
    </div>
  )
}