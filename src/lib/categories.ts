import type { ExerciseCategory, FailureRule } from '../db/types'

/**
 * Colour language mirrors the user's spreadsheet — non-negotiable:
 * lower = blue, pull = red/pink, push = green, core/neck = yellow/gold.
 * Full literal class strings so Tailwind's scanner picks them up.
 */
export const CATEGORY_STYLES: Record<
  ExerciseCategory,
  { border: string; text: string; chipBg: string; slotFilled: string }
> = {
  lower: {
    border: 'border-lower',
    text: 'text-lower',
    chipBg: 'bg-lower/12',
    slotFilled: 'bg-lower/25 border-lower',
  },
  pull: {
    border: 'border-pull',
    text: 'text-pull',
    chipBg: 'bg-pull/12',
    slotFilled: 'bg-pull/25 border-pull',
  },
  push: {
    border: 'border-push',
    text: 'text-push',
    chipBg: 'bg-push/12',
    slotFilled: 'bg-push/25 border-push',
  },
  core: {
    border: 'border-core',
    text: 'text-core',
    chipBg: 'bg-core/12',
    slotFilled: 'bg-core/25 border-core',
  },
  neck: {
    border: 'border-neck',
    text: 'text-neck',
    chipBg: 'bg-neck/12',
    slotFilled: 'bg-neck/25 border-neck',
  },
}

/** Tiny failure-rule glyphs shown on exercise cards — no text per spec. */
export const FAILURE_RULE_ICON: Record<FailureRule, string> = {
  never: '∅',
  lastSetOnly: 'L',
  allSets: 'F',
}
