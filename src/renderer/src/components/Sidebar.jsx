import { useEffect, useRef, useState } from 'react'
import Sortable from 'sortablejs'
import AccountIcon from './AccountIcon.jsx'
import AddAccountModal from './AddAccountModal.jsx'

/**
 * Sidebar — 72px vertical strip on the left.
 *
 * Renders one icon per account, with a "+" button pinned at the bottom.
 * The "+" button is wired but inert in M1; the add-account modal lands in M2.
 *
 * State syncs from the main process via two channels:
 *  1. initial load: window.mosh.listAccounts() in useEffect
 *  2. live updates: window.mosh.onAccountsChanged subscription
 */
export default function Sidebar() {
  const [accounts, setAccounts] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [addOpen, setAddOpen] = useState(false)
  const listRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    window.mosh.listAccounts().then((snap) => {
      if (cancelled) return
      setAccounts(snap.accounts)
      setActiveId(snap.activeAccountId)
    })

    const unsubscribe = window.mosh.onAccountsChanged((snap) => {
      setAccounts(snap.accounts)
      setActiveId(snap.activeAccountId)
    })

    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [])

  // Wire SortableJS to the icon list. Sortable mutates the DOM directly,
  // but we recompute the new order from the React `accounts` array via
  // oldIndex/newIndex — never from the DOM. The reorder IPC triggers an
  // accounts:changed push, which re-renders the sidebar from authoritative
  // state and undoes Sortable's transient DOM mutation.
  useEffect(() => {
    if (!listRef.current) return
    const sortable = Sortable.create(listRef.current, {
      animation: 150,
      delay: 200,         // hold 200ms before drag starts; keeps quick taps as clicks
      ghostClass: 'sortable-ghost',
      chosenClass: 'sortable-chosen',
      dragClass: 'sortable-drag',
      onEnd: (evt) => {
        if (evt.oldIndex === evt.newIndex) return
        const reordered = [...accounts]
        const [moved] = reordered.splice(evt.oldIndex, 1)
        reordered.splice(evt.newIndex, 0, moved)
        window.mosh.reorderAccounts(reordered.map((a) => a.id))
      }
    })
    return () => sortable.destroy()
  }, [accounts])

  const handleSelect = (id) => {
    if (id === activeId) return
    window.mosh.setActive(id)
  }

  // Hide the active WebContentsView while the modal is open — views are main-
  // process children that paint above the HTML layer, so without this the modal
  // appears behind the loaded site.
  useEffect(() => {
    if (addOpen) {
      window.mosh.coverViews()
    } else {
      window.mosh.uncoverViews()
    }
  }, [addOpen])

  const handleAdd = () => {
    setAddOpen(true)
  }

  return (
    <>
    <aside
      className="flex h-full w-[84px] shrink-0 flex-col items-center border-r border-white/5 bg-[#1a1a1c] pb-3 pt-8"
      style={{ WebkitAppRegion: 'drag' }}
    >
      <span
        className="mb-2 mt-1 select-none text-[9px] font-bold uppercase tracking-[0.25em] text-zinc-700"
        style={{ WebkitAppRegion: 'no-drag' }}
      >
        Mosh
      </span>

      <div
        ref={listRef}
        className="scrollbar-none flex flex-1 flex-col items-center gap-2 overflow-y-auto"
        style={{ WebkitAppRegion: 'no-drag' }}
      >
        {accounts.map((account) => (
          <AccountIcon
            key={account.id}
            account={account}
            active={account.id === activeId}
            onClick={() => handleSelect(account.id)}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={handleAdd}
        title="Add account"
        aria-label="Add account"
        style={{ WebkitAppRegion: 'no-drag' }}
        className="mt-2 flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-white/20 text-white/40 transition-colors hover:border-white/40 hover:text-white/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
          aria-hidden
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
    </aside>
    <AddAccountModal open={addOpen} onOpenChange={setAddOpen} />
    </>
  )
}
