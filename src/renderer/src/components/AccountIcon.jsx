import { useEffect, useState } from 'react'

import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip.jsx'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from './ui/dropdown-menu.jsx'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog.jsx'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from './ui/alert-dialog.jsx'
import { Button } from './ui/button.jsx'
import { Input } from './ui/input.jsx'
import IconChooser from './IconChooser.jsx'
import { cn } from '../lib/utils.js'
import { getServiceIcon } from '../assets/icons/services/index.js'

const NAME_MAX = 40

// Mirror of the swatches used in AddAccountModal so the rest-of-app palette
// stays consistent. Order matters: the visual flow purple → gray reads as
// "warm-cool" left to right in the picker grid.
const COLOR_SWATCHES = [
  { name: 'purple', value: '#A78BFA' },
  { name: 'blue', value: '#60A5FA' },
  { name: 'teal', value: '#5EEAD4' },
  { name: 'green', value: '#86EFAC' },
  { name: 'orange', value: '#FDBA74' },
  { name: 'red', value: '#FCA5A5' },
  { name: 'pink', value: '#F9A8D4' },
  { name: 'gray', value: '#A1A1AA' }
]

/**
 * One sidebar account icon.
 *
 * - 56x56 hit target so the icon feels generous and easy to click
 * - 40x40 circular avatar (monogram fallback while no PNG exists)
 * - active state: nested ring drawn with two box-shadows so the gap is solid
 *   against the sidebar background instead of bleeding the page bg through
 * - color tag dot: 12px circle in bottom-right with a 2px sidebar-colored
 *   border so it reads as a sticker on top of the avatar
 * - hover tooltip (right side, 400ms open delay) shows the display name
 * - right-click opens a context menu with all per-account actions
 */
export default function AccountIcon({ account, active, onClick }) {
  const monogram = (account.displayName || account.service || '?').charAt(0).toUpperCase()
  const serviceIcon = account.service ? getServiceIcon(account.service) : null
  const firstEmoji = account.emoji ? [...new Intl.Segmenter().segment(account.emoji)][0]?.segment : null

  // --- Context menu ---------------------------------------------------------
  // The dropdown is opened by onContextMenu (right click), and positioned at
  // the cursor via a hidden anchor span we move under the cursor before
  // showing the menu. Radix's DropdownMenu uses its trigger element to anchor
  // the floating content, so a 1×1 anchor at the click location gives us
  // "show at cursor" behaviour without a custom popper.
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 })

  // --- Sub-dialog open state -----------------------------------------------
  const [renameOpen, setRenameOpen] = useState(false)
  const [colorOpen, setColorOpen] = useState(false)
  const [iconOpen, setIconOpen] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  // --- Rename form state ----------------------------------------------------
  const [renameValue, setRenameValue] = useState(account.displayName || '')
  const [renameSaving, setRenameSaving] = useState(false)

  // --- Color picker form state ---------------------------------------------
  const [colorValue, setColorValue] = useState(account.colorTag ?? null)
  const [colorSaving, setColorSaving] = useState(false)

  // Cover/uncover the active WebContentsView around any open dialog so the
  // modal isn't painted behind the site. The context menu itself (menuOpen)
  // doesn't need this — it only floats over the sidebar.
  // Cover whenever the menu OR any sub-dialog is open — both extend beyond the
  // sidebar into the WebContentsView area and would be painted underneath it.
  const anyOverlayOpen = menuOpen || renameOpen || colorOpen || iconOpen || logoutOpen || deleteOpen
  useEffect(() => {
    if (anyOverlayOpen) {
      window.mosh.coverViews()
    } else {
      window.mosh.uncoverViews()
    }
  }, [anyOverlayOpen])

  const handleContextMenu = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setMenuPos({ x: e.clientX, y: e.clientY })
    setMenuOpen(true)
  }

  // Open helpers seed the form state from the current account values just
  // before opening the dialog. Doing this here (instead of in a useEffect)
  // avoids the React 19 "setState in effect" cascade warning and keeps the
  // input in lockstep with the source of truth at open time.
  const openRename = () => {
    setRenameValue(account.displayName || '')
    setRenameSaving(false)
    setRenameOpen(true)
  }

  const openColor = () => {
    setColorValue(account.colorTag ?? null)
    setColorSaving(false)
    setColorOpen(true)
  }

  const handleRenameSave = async () => {
    const trimmed = renameValue.trim()
    if (trimmed.length === 0 || trimmed === account.displayName || renameSaving) {
      // Nothing to save — just close.
      if (trimmed.length > 0 && trimmed === account.displayName) {
        setRenameOpen(false)
      }
      return
    }
    setRenameSaving(true)
    try {
      await window.mosh.updateAccount(account.id, { displayName: trimmed })
      setRenameOpen(false)
    } catch (err) {
      console.error('[AccountIcon] rename failed', err)
      setRenameSaving(false)
    }
  }

  const handleColorSave = async () => {
    if (colorSaving) return
    setColorSaving(true)
    try {
      await window.mosh.updateAccount(account.id, { colorTag: colorValue })
      setColorOpen(false)
    } catch (err) {
      console.error('[AccountIcon] color tag update failed', err)
      setColorSaving(false)
    }
  }

  const handleReload = () => {
    window.mosh.reloadView(account.id)
  }

  const handleLogoutConfirm = async () => {
    try {
      await window.mosh.logoutView(account.id)
    } catch (err) {
      console.error('[AccountIcon] logout failed', err)
    }
  }

  const handleDeleteConfirm = async () => {
    try {
      await window.mosh.deleteAccount(account.id)
    } catch (err) {
      console.error('[AccountIcon] delete failed', err)
    }
  }

  const renameTrimmed = renameValue.trim()
  const renameCanSave =
    renameTrimmed.length > 0 && renameTrimmed !== account.displayName && !renameSaving

  return (
    <>
      <Tooltip delayDuration={400}>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onClick}
            onContextMenu={handleContextMenu}
            aria-label={account.displayName}
            aria-pressed={active}
            className={cn(
              'relative flex h-14 w-14 items-center justify-center rounded-full',
              'transition-transform duration-200 ease-out',
              'hover:scale-105 active:scale-95',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40'
            )}
          >
            <span
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full',
                'bg-[#2c2c2f] text-zinc-200 font-mono text-sm font-semibold tracking-wide',
                'overflow-hidden select-none'
              )}
              style={
                active
                  ? {
                      boxShadow: '0 0 0 2px #1a1a1c, 0 0 0 4px #ffffff'
                    }
                  : undefined
              }
            >
              {firstEmoji ? (
                <span
                  className="flex h-full w-full items-center justify-center rounded-full text-xl leading-none"
                  style={{ backgroundColor: account.emojiColor || '#3f3f46' }}
                >
                  {firstEmoji}
                </span>
              ) : serviceIcon ? (
                <img
                  src={serviceIcon}
                  alt=""
                  className="h-full w-full object-cover"
                  draggable={false}
                />
              ) : (
                monogram
              )}
            </span>

            {account.colorTag && (
              <span
                aria-hidden
                className="absolute bottom-1 right-1 h-3 w-3 rounded-full"
                style={{
                  backgroundColor: account.colorTag,
                  boxShadow: '0 0 0 2px #1a1a1c'
                }}
              />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          {account.displayName}
        </TooltipContent>
      </Tooltip>

      {/* CONTEXT MENU
          The trigger is an invisible 1×1 element positioned at the last
          right-click location. We render it inside a fixed-position wrapper so
          its DOM location doesn't perturb the sidebar's flex layout. */}
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <span
            aria-hidden
            tabIndex={-1}
            style={{
              position: 'fixed',
              left: menuPos.x,
              top: menuPos.y,
              width: 1,
              height: 1,
              pointerEvents: 'none'
            }}
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={4} className="min-w-[180px]">
          <DropdownMenuItem onSelect={openRename}>Rename</DropdownMenuItem>
          <DropdownMenuItem onSelect={openColor}>Change color tag</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setIconOpen(true)}>Change icon</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={handleReload}>Reload</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setLogoutOpen(true)}>Log out</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => setDeleteOpen(true)}
            className="text-red-400 focus:bg-red-500/10 focus:text-red-300"
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* RENAME DIALOG */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="w-[400px] max-w-[calc(100vw-2rem)] gap-0 text-zinc-100 sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Rename account</DialogTitle>
          </DialogHeader>

          <div className="mt-4">
            <label htmlFor={`rename-${account.id}`} className="mb-1 block text-xs text-zinc-400">
              Display name
            </label>
            <Input
              id={`rename-${account.id}`}
              type="text"
              maxLength={NAME_MAX}
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && renameCanSave) {
                  e.preventDefault()
                  handleRenameSave()
                }
              }}
              placeholder="e.g. Work, Personal"
              className="bg-[#222226] text-zinc-100 placeholder:text-zinc-600"
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setRenameOpen(false)}
              className="text-zinc-300 hover:bg-white/5 hover:text-zinc-100"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleRenameSave}
              disabled={!renameCanSave}
              className="bg-white text-zinc-900 hover:bg-zinc-200"
            >
              {renameSaving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* COLOR TAG DIALOG */}
      <Dialog open={colorOpen} onOpenChange={setColorOpen}>
        <DialogContent className="w-[400px] max-w-[calc(100vw-2rem)] gap-0 text-zinc-100 sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Change color tag</DialogTitle>
          </DialogHeader>

          <div className="mt-4">
            <div
              role="radiogroup"
              aria-label="Color tag"
              className="flex flex-wrap items-center gap-2"
            >
              <button
                type="button"
                role="radio"
                aria-checked={colorValue === null}
                aria-label="No color tag"
                onClick={() => setColorValue(null)}
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full border text-[10px] text-zinc-400 transition-colors',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
                  colorValue === null
                    ? 'border-white/80 bg-white/5'
                    : 'border-white/20 hover:border-white/40'
                )}
              >
                <span aria-hidden>/</span>
              </button>
              {COLOR_SWATCHES.map((swatch) => {
                const swatchActive = colorValue === swatch.value
                return (
                  <button
                    key={swatch.name}
                    type="button"
                    role="radio"
                    aria-checked={swatchActive}
                    aria-label={swatch.name}
                    onClick={() => setColorValue(swatch.value)}
                    className={cn(
                      'h-6 w-6 rounded-full transition-transform',
                      'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60',
                      swatchActive
                        ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1a1a1c]'
                        : 'hover:scale-110'
                    )}
                    style={{ backgroundColor: swatch.value }}
                  />
                )
              })}
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setColorOpen(false)}
              className="text-zinc-300 hover:bg-white/5 hover:text-zinc-100"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleColorSave}
              disabled={colorSaving}
              className="bg-white text-zinc-900 hover:bg-zinc-200"
            >
              {colorSaving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ICON CHOOSER DIALOG */}
      <IconChooser open={iconOpen} onOpenChange={setIconOpen} account={account} />

      {/* LOG OUT CONFIRMATION */}
      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent className="text-zinc-100">
          <AlertDialogHeader>
            <AlertDialogTitle>Log out of {account.displayName}?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              This will clear saved cookies and session data. You{'’'}ll need to sign in again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/15 bg-transparent text-zinc-200 hover:bg-white/10 hover:text-zinc-100">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogoutConfirm}
              className="bg-red-500 text-white hover:bg-red-500/90"
            >
              Log out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* DELETE CONFIRMATION */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="text-zinc-100">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {account.displayName}?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              This account and its session data will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/15 bg-transparent text-zinc-200 hover:bg-white/10 hover:text-zinc-100">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-500 text-white hover:bg-red-500/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
