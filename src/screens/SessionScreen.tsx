import { useState, type PointerEvent as ReactPointerEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { Exercise, Session, SetLog } from '../db/types'
import ExerciseCard from '../components/ExerciseCard'
import ExercisePicker from '../components/ExercisePicker'
import ReorderableList from '../components/ReorderableList'
import SwipeableCard from '../components/SwipeableCard'
import { groupSupersets, type SessionRow } from '../lib/supersets'
import {
  addExerciseToSession,
  finishSession,
  removeExerciseFromSession,
  reorderSessionExercises,
  updateSessionNote,
} from '../lib/sessionActions'
import { hapticFinish, hapticRemove } from '../lib/haptics'

export default function SessionScreen({ session }: { session: Session }) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [note, setNote] = useState(session.note ?? '')

  const gym = useLiveQuery(() => db.gyms.get(session.gymId), [session.gymId])
  const template = useLiveQuery(
    () => (session.templateId ? db.templates.get(session.templateId) : undefined),
    [session.templateId],
  )

  // Exercises in session order (bulkGet preserves input order).
  const exercises = useLiveQuery(
    async () => {
      const rows = await db.exercises.bulkGet(session.exerciseIds)
      return rows.filter((row): row is Exercise => row !== undefined)
    },
    [session.exerciseIds.join(',')],
    undefined,
  )

  const setLogs = useLiveQuery(
    () => db.setLogs.where('sessionId').equals(session.id).toArray(),
    [session.id],
    [],
  )

  const rows = exercises ? groupSupersets(exercises) : undefined

  async function handleReorder(newRows: SessionRow[]) {
    const newExerciseIds = newRows.flatMap((row) => row.exercises.map((e) => e.id))
    await reorderSessionExercises(session.id, newExerciseIds)
  }

  async function handleRemoveRow(row: SessionRow) {
    for (const exercise of row.exercises) {
      await removeExerciseFromSession(session.id, exercise.id)
    }
    hapticRemove()
  }

  async function handleFinish() {
    if (note !== (session.note ?? '')) {
      await updateSessionNote(session.id, note)
    }
    await finishSession(session.id)
    hapticFinish()
  }

  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-10 border-b border-line bg-paper/95 px-4 py-3 backdrop-blur">
        <h1 className="heading-display text-2xl text-ink">{template?.name ?? 'Freestyle'}</h1>
        <p className="label-heading text-sm text-ink-muted">{gym?.name}</p>
      </header>

      <main className="flex-1 space-y-3 px-3 py-3 pb-40">
        {rows && (
          <ReorderableList
            items={rows}
            keyOf={(row) => row.exercises[0].id}
            signatureOf={(row) => row.exercises.map((e) => e.id).join('+')}
            onReorder={handleReorder}
            renderItem={(row, dragHandleProps) => (
              <SwipeableCard onRemove={() => handleRemoveRow(row)}>
                {row.exercises.length === 2 ? (
                  <SupersetPair
                    row={row}
                    sessionId={session.id}
                    gymId={session.gymId}
                    setLogs={setLogs}
                    dragHandleProps={dragHandleProps}
                  />
                ) : (
                  <ExerciseCard
                    exercise={row.exercises[0]}
                    sessionId={session.id}
                    gymId={session.gymId}
                    loggedSets={setLogs.filter((s) => s.exerciseId === row.exercises[0].id)}
                    onDragHandleDown={dragHandleProps.onPointerDown}
                  />
                )}
              </SwipeableCard>
            )}
          />
        )}

        {rows && rows.length === 0 && (
          <p className="pt-10 text-center text-ink-muted">
            Freestyle — add exercises below to get started.
          </p>
        )}

        <button
          onClick={() => setPickerOpen(true)}
          className="label-heading tap-target w-full rounded-xl border border-dashed border-line text-ink-muted active:bg-card"
        >
          + Add exercise
        </button>
      </main>

      <footer className="fixed inset-x-0 bottom-0 border-t border-line bg-paper/95 p-3 backdrop-blur">
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Session note (optional)"
          className="tap-target mb-2 w-full rounded-lg border border-line bg-card px-3 text-base text-ink outline-none placeholder:text-ink-muted"
        />
        <button
          onClick={handleFinish}
          className="label-heading tap-target w-full rounded-xl bg-accent text-lg text-accent-ink active:opacity-90"
        >
          Finish
        </button>
      </footer>

      {pickerOpen && (
        <ExercisePicker
          gymId={session.gymId}
          excludeIds={session.exerciseIds}
          onClose={() => setPickerOpen(false)}
          onPick={(exercise) => {
            addExerciseToSession(session.id, exercise.id)
            setPickerOpen(false)
          }}
        />
      )}
    </div>
  )
}

function SupersetPair({
  row,
  sessionId,
  gymId,
  setLogs,
  dragHandleProps,
}: {
  row: SessionRow
  sessionId: string
  gymId: string
  setLogs: SetLog[]
  dragHandleProps: { onPointerDown: (e: ReactPointerEvent) => void }
}) {
  return (
    <div className="rounded-xl border border-line bg-card-alt p-1.5">
      <div className="label-heading mb-1 flex items-center justify-center gap-1 text-xs text-ink-muted">
        <span
          onPointerDown={dragHandleProps.onPointerDown}
          className="touch-none px-2 text-base text-ink-muted"
        >
          ≡
        </span>
        <span>superset</span>
      </div>
      <div className="space-y-1.5">
        {row.exercises.map((exercise) => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            sessionId={sessionId}
            gymId={gymId}
            loggedSets={setLogs.filter((s) => s.exerciseId === exercise.id)}
          />
        ))}
      </div>
    </div>
  )
}
