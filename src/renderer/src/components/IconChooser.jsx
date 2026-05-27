import { useState } from 'react'

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog.jsx'
import { Button } from './ui/button.jsx'
import { SERVICE_ICONS } from '../assets/icons/services/index.js'
import { EMOJIS } from '../lib/emojis.js'
import { EmojiPicker } from './EmojiPicker.jsx'
import { cn } from '../lib/utils.js'

export default function IconChooser({ open, onOpenChange, account }) {
  const [selectedEmoji, setSelectedEmoji] = useState(null)
  const [emojiColor, setEmojiColor] = useState('#A78BFA')
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  if (!account) return null

  const activePresetId = !account.emoji ? account.service : null

  const handlePresetClick = async (serviceId) => {
    try {
      setError(null)
      await window.mosh.updateAccount(account.id, { emoji: null, emojiColor: null, iconPath: null, service: serviceId })
      onOpenChange?.(false)
    } catch (err) {
      console.error('[IconChooser] preset selection failed', err)
      setError('Could not update icon.')
    }
  }

  const handleEmojiSave = async () => {
    if (!selectedEmoji || saving) return
    setSaving(true)
    try {
      await window.mosh.updateAccount(account.id, { emoji: selectedEmoji, emojiColor, iconPath: null })
      onOpenChange?.(false)
    } catch (err) {
      console.error('[IconChooser] emoji save failed', err)
      setError('Could not update icon.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setSelectedEmoji(null); setError(null) } onOpenChange?.(v) }}>
      <DialogContent className="w-[440px] max-w-[calc(100vw-2rem)] gap-0 text-zinc-100 sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Change icon</DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-5">
          <section>
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Service presets</h3>
            <div role="radiogroup" className="grid grid-cols-4 gap-2">
              {Object.entries(SERVICE_ICONS).map(([serviceId, iconSrc]) => (
                <button
                  key={serviceId} type="button" role="radio"
                  aria-checked={activePresetId === serviceId} aria-label={serviceId}
                  onClick={() => handlePresetClick(serviceId)}
                  className={cn(
                    'flex items-center justify-center rounded-lg border bg-[#222226] p-2 transition-colors',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
                    activePresetId === serviceId ? 'border-white/80 bg-[#2a2a2e]' : 'border-white/5 hover:border-white/20 hover:bg-[#26262a]'
                  )}
                >
                  <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-[#2c2c2f]">
                    <img src={iconSrc} alt="" className="h-full w-full object-cover" draggable={false} />
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Emoji</h3>
            <EmojiPicker
              selected={selectedEmoji}
              onSelect={setSelectedEmoji}
              color={emojiColor}
              onColorChange={setEmojiColor}
            />
            {selectedEmoji && (
              <Button
                type="button"
                onClick={handleEmojiSave}
                disabled={saving}
                className="mt-3 w-full bg-white text-zinc-900 hover:bg-zinc-200"
              >
                {saving ? 'Saving…' : 'Set emoji'}
              </Button>
            )}
          </section>
        </div>

        {error && <p role="alert" className="mt-3 text-xs text-red-400">{error}</p>}

        <DialogFooter className="mt-4">
          <Button type="button" variant="ghost" onClick={() => onOpenChange?.(false)} className="text-zinc-300 hover:bg-white/5 hover:text-zinc-100">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
