import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Standard shadcn cn() helper: merge Tailwind classes while resolving conflicts.
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
