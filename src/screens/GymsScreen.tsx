import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { Gym } from '../db/types'
import { CATEGORY_STYLES } from '../lib/categories'
import { createGym, renameGym } from '../lib/gymActions'
import { setGymExerciseEnabled, setGymExerciseOverride } from '../lib/exerciseActions'

export default function GymsScreen() {
  const [addingGym, setAddingGym] = useState(false)
  const [openGym, setOpenGym] = useState<Gym | null>(null)
  const gyms = useLiveQuery(() => db.gyms.toArray(), [], [])

  return (
    <div className="flex min-h-svh flex-col pb-24">
      <header className="sticky top-0 z-10 border-b border-line bg-paper/95 px-3 py-3 backdrop-blur">
        <h1 className="heading-display text-2xl text-ink">Gyms</h1>
      </header>

      <main className="flex-1 space-y-2 px-3 py-3">
        {gyms.map((gym) => (
          <GymRow key={gym.id} gym={gym} onOpen={() => setOpenGym(gym)} />
        ))}

        <button
          onClick={() => setAddingGym(true)}
          className="label-heading tap-target w-full rounded-xl border border-dashed border-line text-ink-muted active:bg-card"
        >
          + New gym
        </button>
      </main>

      {addingGym && <NewGymSheet onClose={() => setAddingGym(false)} />}
      {openGym && <PerGymLibrary gym={openGym} onClose={() => setOpenGym(null)} />}
    </div>
  )
}

function GymRow({ gym, onOpen }: { gym: Gym; onOpen: () => void }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(gym.name)

  if (editing) {
    return (
      <div className="flex gap-2 rounded-lg border border-line bg-card p-2">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="tap-target flex-1 rounded-lg border border-line bg-card-alt px-3 text-ink outline-none"
        />
        <button
          onClick={async () => {
            if (name.trim()) await renameGym(gym.id, name.trim())
            setEditing(false)
          }}
          className="label-heading tap-target rounded-lg bg-accent px-4 text-accent-ink"
        >
          Save
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1 rounded-xl border border-line bg-card">
      <button
        onClick={onOpen}
        className="heading-display tap-target min-w-0 flex-1 truncate px-4 text-left text-ink"
      >
        {gym.name}
      </button>
      <button
        onClick={() => setEditing(true)}
        className="label-heading tap-target px-4 text-sm text-ink-muted"
      >
        Rename
      </button>
    </div>
  )
}

function NewGymSheet({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('')
  return (
    <div className="fixed inset-0 z-30 flex items-end bg-ink/40" onClick={onClose}>
      <div
        className="w-full rounded-t-2xl bg-card p-4 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="heading-display mb-3 text-xl text-ink">New gym</h2>
        <p className="mb-3 text-sm text-ink-muted">
          Starts as a full copy of the default library — disable what doesn't apply here.
        </p>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Hotel Gym"
          className="tap-target w-full rounded-lg border border-line bg-card-alt px-3 text-ink outline-none placeholder:text-ink-muted"
        />
        <button
          onClick={async () => {
            if (name.trim()) {
              await createGym(name.trim())
              onClose()
            }
          }}
          disabled={!name.trim()}
          className="label-heading tap-target mt-3 w-full rounded-lg bg-accent text-accent-ink disabled:opacity-40"
        >
          Create gym
        </button>
      </div>
    </div>
  )
}

function PerGymLibrary({ gym, onClose }: { gym: Gym; onClose: () => void }) {
  const exercises = useLiveQuery(
    async () => (await db.exercises.orderBy('sortOrder').toArray()).filter((e) => !e.archived),
    [],
    [],
  )
  const gymExercises = useLiveQuery(
    () => db.gymExercises.where('gymId').equals(gym.id).toArray(),
    [gym.id],
    [],
  )
  const stateByExercise = new Map(gymExercises.map((ge) => [ge.exerciseId, ge]))

  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-paper">
      <header className="flex items-center justify-between border-b border-line p-3">
        <h1 className="heading-display text-xl text-ink">{gym.name}</h1>
        <button onClick={onClose} className="label-heading tap-target px-3 text-ink-muted">
          Done
        </button>
      </header>
      <div className="flex-1 overflow-y-auto p-3">
        <div className="space-y-2">
          {exercises.length === 0 && (
            <p className="pt-10 text-center text-ink-muted">
              No exercises in the library yet.
            </p>
          )}
          {exercises.map((exercise) => {
            const styles = CATEGORY_STYLES[exercise.category]
            const ge = stateByExercise.get(exercise.id)
            const enabled = ge?.enabled ?? false
            return (
              <div
                key={exercise.id}
                className={`rounded-lg border-l-4 bg-card p-2 ${styles.border} ${
                  enabled ? '' : 'opacity-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="heading-display min-w-0 flex-1 truncate text-ink">{exercise.name}</span>
                  <button
                    onClick={() => setGymExerciseEnabled(gym.id, exercise.id, !enabled)}
                    className={`label-heading tap-target rounded-full border px-4 text-sm ${
                      enabled
                        ? 'border-accent bg-accent text-accent-ink'
                        : 'border-line text-ink-muted'
                    }`}
                  >
                    {enabled ? 'On' : 'Off'}
                  </button>
                </div>
                {enabled && !exercise.bodyweight && (
                  <div className="font-numeric mt-1 flex items-center gap-2">
                    <span className="font-body text-xs text-ink-muted">Weight override (kg)</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      defaultValue={ge?.weightOverride ?? ''}
                      placeholder="—"
                      onBlur={(e) => {
                        const val = e.target.value.trim()
                        setGymExerciseOverride(
                          gym.id,
                          exercise.id,
                          val === '' ? undefined : Number(val),
                        )
                      }}
                      className="w-20 rounded border border-line bg-card-alt px-2 py-1 text-sm text-ink outline-none"
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
