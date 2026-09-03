import type { Exercise } from '../db/types'

export interface SessionRow {
  /** A single exercise, or a superset pair rendered bracket-joined. */
  exercises: Exercise[]
}

/**
 * Groups adjacent exercises into superset pairs for bracket rendering.
 * Only groups if the pair is actually adjacent in session order — a
 * superset partner dragged elsewhere in the list just renders standalone
 * rather than silently re-joining across the list.
 */
export function groupSupersets(exercises: Exercise[]): SessionRow[] {
  const rows: SessionRow[] = []
  let i = 0
  while (i < exercises.length) {
    const current = exercises[i]
    const next = exercises[i + 1]
    if (
      current.setStructure === 'superset' &&
      next &&
      (current.supersetPartnerId === next.id || next.supersetPartnerId === current.id)
    ) {
      rows.push({ exercises: [current, next] })
      i += 2
    } else {
      rows.push({ exercises: [current] })
      i += 1
    }
  }
  return rows
}
