import { useEffect, useState } from 'react'

import Sidebar from './components/Sidebar.jsx'
import { TooltipProvider } from './components/ui/tooltip.jsx'

/**
 * App shell.
 *
 * The <main> div sits behind the WebContentsViews — when a view is ready and
 * visible, the user sees the native WebContents on top, not this div. When no
 * view is loaded (empty state) or the view is loading/erroring, the <main>
 * fallback shows through.
 *
 * We track accounts to decide between "empty state" and "view status" UI, and
 * we listen for view:status pushes from main to flip between loading / error /
 * ready for the currently active account.
 */
export default function App() {
  const [accounts, setAccounts] = useState([])
  const [activeId, setActiveId] = useState(null)
  // status is per-active-account: 'loading' | 'ready' | 'error' (or null until
  // the first event arrives). We only render the slot for the active id.
  const [viewStatus, setViewStatus] = useState(null)
  const [viewError, setViewError] = useState(null)

  useEffect(() => {
    let cancelled = false

    window.mosh.listAccounts().then((snap) => {
      if (cancelled) return
      setAccounts(snap.accounts)
      setActiveId(snap.activeAccountId)
    })

    const unsubAccounts = window.mosh.onAccountsChanged((snap) => {
      setAccounts(snap.accounts)
      setActiveId(snap.activeAccountId)
    })

    const unsubStatus = window.mosh.onViewStatus?.((data) => {
      // Only react to events for what's currently active. Older events for
      // background tabs would otherwise overwrite the foreground state.
      setActiveId((currentActive) => {
        if (data.accountId === currentActive) {
          setViewStatus(data.status)
          setViewError(data.status === 'error' ? data.errorCode || null : null)
        }
        return currentActive
      })
    })

    return () => {
      cancelled = true
      unsubAccounts?.()
      unsubStatus?.()
    }
  }, [])

  // When the active account changes, reset the local status until main pushes
  // a fresh event for the new view. Avoids stale "ready" leaking across tabs.
  useEffect(() => {
    setViewStatus(null)
    setViewError(null)
  }, [activeId])

  const handleReload = () => {
    if (activeId) {
      window.mosh.reloadView(activeId)
    }
  }

  const showEmpty = accounts.length === 0
  const showLoading = !showEmpty && viewStatus === 'loading'
  const showError = !showEmpty && viewStatus === 'error'

  return (
    <TooltipProvider delayDuration={400}>
      <div className="flex h-screen w-screen overflow-hidden bg-[#0f0f10] text-zinc-100">
        <Sidebar />
        <main className="relative flex-1">
          {showEmpty && (
            <div className="flex h-full w-full items-center justify-center">
              <p className="text-sm text-zinc-600">Click + to add your first account</p>
            </div>
          )}

          {showLoading && (
            <div className="flex h-full w-full items-center justify-center">
              <div
                role="status"
                aria-live="polite"
                className="flex items-center gap-3 text-sm text-zinc-600"
              >
                <span
                  aria-hidden
                  className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-300"
                />
                <span>Loading…</span>
              </div>
            </div>
          )}

          {showError && (
            <div className="flex h-full w-full items-center justify-center">
              <div
                role="alert"
                className="flex max-w-sm flex-col items-center gap-3 text-center"
              >
                <p className="text-sm text-zinc-300">
                  Couldn{'’'}t load this account
                  {viewError ? ` (${viewError})` : ''}.
                </p>
                <button
                  type="button"
                  onClick={handleReload}
                  className="rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-200 transition-colors hover:border-white/30 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                >
                  Reload
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </TooltipProvider>
  )
}
