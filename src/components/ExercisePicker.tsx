import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { Exercise } from '../db/types'
import { CATEGORY_STYLES } from '../lib/categories'

interface Props {
  /** Omit to browse the full global library regardless of any gym's
   *  enabled list — used when editing templates, which aren't gym-scoped. */
  gymId?: string
  /** Exercise ids already in today's session/template — hidden from results. */
  excludeIds: string[]
  onPick: (exercise: Exercise) => void
  onClose: () => void
}

/** Most-recently-logged-at-this-gym exercises first, for the empty-query view. */
function useRecentExerciseIds(gymId: string | undefined): string[] {
  return useLiveQuery(
    async () => {
      if (!gymId) return []
      const rows = await db.setLogs.where('gymId').equals(gymId).reverse().sortBy('loggedAt')
      const seen: string[] = []
      for (const row of rows) {
        if (!seen.includes(row.exerciseId)) seen.push(row.exerciseId)
        if (seen.length >= 8) break
      }
      return seen
    },
    [gymId],
    [],
  )
}

export default function ExercisePicker({ gymId, excludeIds, onPick, onClose }: Props) {
  const [query, setQuery] = useState('')

  const enabledExerciseIds = useLiveQuery(
    async () => {
      if (!gymId) return undefined // no gym filter — full library
      const rows = await db.gymExercises.where('gymId').equals(gymId).toArray()
      return new Set(rows.filter((r) => r.enabled).map((r) => r.exerciseId))
    },
    [gymId],
    undefined,
  )
  const allExercises = useLiveQuery(() => db.exercises.toArray(), [], [])
  const recentIds = useRecentExerciseIds(gymId)

  const candidates = useMemo(() => {
    return allExercises
      .filter(
        (e) =>
          !e.archived &&
          (!gymId || enabledExerciseIds?.has(e.id)) &&
          !excludeIds.includes(e.id),
      )
      .sort((a, b) => a.sortOrder - b.sortOrder)
  }, [allExercises, enabledExerciseIds, excludeIds, gymId])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) {
      const recentSet = new Set(recentIds)
      const recents = recentIds
        .map((id) => candidates.find((c) => c.id === id))
        .filter((c): c is Exercise => !!c)
      const rest = candidates.filter((c) => !recentSet.has(c.id))
      return [...recents, ...rest]
    }
    return candidates.filter((c) => c.name.toLowerCase().includes(q))
  }, [query, candidates, recentIds])

  return (
    <div className="fixed inset-0 z-20 flex flex-col bg-paper">
      <header className="flex items-center gap-2 border-b border-line p-3">
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search exercises…"
          className="tap-target flex-1 rounded-lg border border-line bg-card px-4 text-lg text-ink outline-none placeholder:text-ink-muted"
        />
        <button
          onClick={onClose}
          className="label-heading tap-target px-3 text-lg text-ink-muted"
        >
          Cancel
        </button>
      </header>
      <div className="flex-1 overflow-y-auto p-3">
        {!query && (
          <p className="label-heading mb-1 px-1 text-xs text-ink-muted">
            Recents first
          </p>
        )}
        <div className="flex flex-col gap-2">
          {results.map((exercise) => {
            const styles = CATEGORY_STYLES[exercise.category]
            return (
              <button
                key={exercise.id}
                onClick={() => onPick(exercise)}
                className={`heading-display tap-target flex items-center gap-2 rounded-lg border-l-4 bg-card px-4 text-left text-ink active:bg-card-alt ${styles.border}`}
              >
                <span className={`text-xs ${styles.text}`}>●</span>
                {exercise.name}
              </button>
            )
          })}
          {results.length === 0 && (
            <p className="pt-8 text-center text-ink-muted">No matches.</p>
          )}
        </div>
      </div>
    </div>
  )
}
