import { useEffect, useMemo, useState } from 'react'

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from './ui/dialog.jsx'
import { Button } from './ui/button.jsx'
import { Input } from './ui/input.jsx'
import { getServiceIcon } from '../assets/icons/services/index.js'
import { EmojiPicker } from './EmojiPicker.jsx'
import { cn } from '../lib/utils.js'

const NAME_MAX = 40

// Color swatches for the optional account "tag" dot in the sidebar.
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
 * Add Account modal — three sections (service / name / tag) shown together
 * on one screen rather than wizard-style. Save is disabled until a service
 * is picked and a display name exists.
 */
export default function AddAccountModal({ open, onOpenChange }) {
  const [services, setServices] = useState([])
  const [selectedService, setSelectedService] = useState(null)
  const [customUrl, setCustomUrl] = useState('')
  const [name, setName] = useState('')
  // null = no color tag; otherwise a hex string.
  const [selectedColor, setSelectedColor] = useState(null)
  const [selectedEmoji, setSelectedEmoji] = useState(null)
  const [emojiColor, setEmojiColor] = useState('#A78BFA')
  const [saving, setSaving] = useState(false)

  // Load services once on mount. Memoizing the array reference isn't useful;
  // it never changes after the initial fetch.
  useEffect(() => {
    let cancelled = false
    window.mosh.listServices?.().then((list) => {
      if (cancelled) return
      setServices(Array.isArray(list) ? list : [])
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Reset transient state whenever the modal closes so reopening starts clean.
  useEffect(() => {
    if (!open) {
      setSelectedService(null)
      setCustomUrl('')
      setName('')
      setSelectedColor(null)
      setSelectedEmoji(null)
      setEmojiColor('#A78BFA')
      setSaving(false)
    }
  }, [open])

  // When a service is selected, default the name to its label (only if the
  // user hasn't typed something already).
  const handleSelectService = (service) => {
    setSelectedService(service)
    setName((prev) => (prev.trim().length === 0 ? service.name : prev))
    if (service.id !== 'custom') {
      setCustomUrl('')
    }
  }

  const isCustom = selectedService?.id === 'custom'
  const trimmedName = name.trim()
  const trimmedUrl = customUrl.trim()

  const canSave = useMemo(() => {
    if (!selectedService) return false
    if (trimmedName.length === 0) return false
    if (isCustom && trimmedUrl.length === 0) return false
    return true
  }, [selectedService, trimmedName, isCustom, trimmedUrl])

  const handleSave = async () => {
    if (!canSave || saving) return
    setSaving(true)
    try {
      await window.mosh.createAccount({
        service: selectedService.id,
        url: isCustom ? trimmedUrl : selectedService.url,
        displayName: trimmedName,
        colorTag: selectedColor,
        emoji: selectedEmoji || null,
        emojiColor: selectedEmoji ? emojiColor : null
      })
      onOpenChange?.(false)
    } catch (err) {
      // Surface failures in the console for now; visual error UI lands later.
      console.error('[AddAccountModal] createAccount failed', err)
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[480px] max-w-[calc(100vw-2rem)] gap-0 text-zinc-100 sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Add account</DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-6">
          {/* PICK A SERVICE */}
          <section aria-labelledby="add-account-service-label">
            <h3
              id="add-account-service-label"
              className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-500"
            >
              Pick a service
            </h3>
            <div
              role="radiogroup"
              aria-labelledby="add-account-service-label"
              className="grid grid-cols-4 gap-2"
            >
              {services.map((service) => {
                const active = selectedService?.id === service.id
                const icon = getServiceIcon(service.id)
                return (
                  <button
                    key={service.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => handleSelectService(service)}
                    className={cn(
                      'group flex flex-col items-center justify-center gap-1.5 rounded-lg border bg-[#222226] px-2 py-3 transition-colors',
                      'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
                      active
                        ? 'border-white/80 bg-[#2a2a2e]'
                        : 'border-white/5 hover:border-white/20 hover:bg-[#26262a]'
                    )}
                  >
                    <span
                      className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[#2c2c2f]"
                      aria-hidden
                    >
                      <img
                        src={icon}
                        alt=""
                        className="h-full w-full object-cover"
                        draggable={false}
                      />
                    </span>
                    <span className="text-xs text-zinc-300">{service.name}</span>
                  </button>
                )
              })}
            </div>

            {isCustom && (
              <div className="mt-3">
                <label
                  htmlFor="add-account-custom-url"
                  className="mb-1 block text-xs text-zinc-400"
                >
                  URL
                </label>
                <Input
                  id="add-account-custom-url"
                  type="url"
                  inputMode="url"
                  placeholder="https://example.com"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  className="bg-[#222226] text-zinc-100 placeholder:text-zinc-600"
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
            )}
          </section>

          {/* NAME IT */}
          <section aria-labelledby="add-account-name-label">
            <h3
              id="add-account-name-label"
              className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-500"
            >
              Name it
            </h3>
            <Input
              id="add-account-name"
              type="text"
              maxLength={NAME_MAX}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Work, Personal"
              className="bg-[#222226] text-zinc-100 placeholder:text-zinc-600"
              autoComplete="off"
              spellCheck={false}
              aria-labelledby="add-account-name-label"
            />
          </section>

          {/* TAG IT */}
          <section aria-labelledby="add-account-color-label">
            <h3
              id="add-account-color-label"
              className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-500"
            >
              Tag it
            </h3>
            <div
              role="radiogroup"
              aria-labelledby="add-account-color-label"
              className="flex flex-wrap items-center gap-2"
            >
              <button
                type="button"
                role="radio"
                aria-checked={selectedColor === null}
                aria-label="No color tag"
                onClick={() => setSelectedColor(null)}
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full border text-[10px] text-zinc-400 transition-colors',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
                  selectedColor === null
                    ? 'border-white/80 bg-white/5'
                    : 'border-white/20 hover:border-white/40'
                )}
              >
                <span aria-hidden>/</span>
              </button>
              {COLOR_SWATCHES.map((swatch) => {
                const active = selectedColor === swatch.value
                return (
                  <button
                    key={swatch.name}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    aria-label={swatch.name}
                    onClick={() => setSelectedColor(swatch.value)}
                    className={cn(
                      'h-6 w-6 rounded-full transition-transform',
                      'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60',
                      active
                        ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1a1a1c]'
                        : 'hover:scale-110'
                    )}
                    style={{ backgroundColor: swatch.value }}
                  />
                )
              })}
            </div>
          </section>

          {/* ICON (optional) */}
          <section aria-labelledby="add-account-icon-label">
            <h3
              id="add-account-icon-label"
              className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-500"
            >
              Icon <span className="normal-case tracking-normal text-zinc-600">(optional)</span>
            </h3>
            <EmojiPicker
              selected={selectedEmoji}
              onSelect={setSelectedEmoji}
              color={emojiColor}
              onColorChange={setEmojiColor}
            />
          </section>
        </div>

        <DialogFooter className="mt-6">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange?.(false)}
            className="text-zinc-300 hover:bg-white/5 hover:text-zinc-100"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!canSave || saving}
            className="bg-white text-zinc-900 hover:bg-zinc-200"
          >
            {saving ? 'Adding…' : 'Add account'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
