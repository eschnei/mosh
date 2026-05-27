import { EMOJIS } from '../lib/emojis.js'
import { cn } from '../lib/utils.js'

const COLOR_SWATCHES = [
  { name: 'purple', value: '#A78BFA' },
  { name: 'blue',   value: '#60A5FA' },
  { name: 'teal',   value: '#5EEAD4' },
  { name: 'green',  value: '#86EFAC' },
  { name: 'orange', value: '#FDBA74' },
  { name: 'red',    value: '#FCA5A5' },
  { name: 'pink',   value: '#F9A8D4' },
  { name: 'gray',   value: '#A1A1AA' },
]

/**
 * Reusable emoji + background-color picker.
 *
 * Props:
 *   selected      — currently selected emoji string or null
 *   onSelect      — (emoji: string | null) => void
 *   color         — current background color hex
 *   onColorChange — (hex: string) => void
 */
export function EmojiPicker({ selected, onSelect, color, onColorChange }) {
  return (
    <div className="space-y-3">
      {/* Emoji grid */}
      <div
        role="radiogroup"
        aria-label="Pick an emoji"
        className="grid grid-cols-8 gap-1 overflow-y-auto rounded-lg bg-[#1f1f22] p-2"
        style={{ maxHeight: 160 }}
      >
        {EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            role="radio"
            aria-checked={selected === emoji}
            aria-label={emoji}
            onClick={() => onSelect(selected === emoji ? null : emoji)}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-md text-lg leading-none transition-colors',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
              selected === emoji
                ? 'bg-white/15 ring-1 ring-white/40'
                : 'hover:bg-white/10'
            )}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Color swatches — only shown when an emoji is selected */}
      {selected && (
        <div className="flex items-center gap-2">
          {/* live preview */}
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base leading-none"
            style={{ backgroundColor: color }}
          >
            {selected}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {COLOR_SWATCHES.map((s) => (
              <button
                key={s.name}
                type="button"
                aria-label={s.name}
                onClick={() => onColorChange(s.value)}
                className={cn(
                  'h-5 w-5 rounded-full transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60',
                  color === s.value
                    ? 'ring-2 ring-white ring-offset-1 ring-offset-[#1f1f22]'
                    : 'hover:scale-110'
                )}
                style={{ backgroundColor: s.value }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
