import { useMemo, useState, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { Exercise, ExerciseCategory, FailureRule } from '../db/types'
import { CATEGORY_STYLES } from '../lib/categories'
import {
  createExercise,
  defaultNewExercise,
  setArchived,
  moveExerciseInCategory,
  setGymExerciseEnabled,
  updateExercise,
  type NewExerciseInput,
} from '../lib/exerciseActions'

const CATEGORIES: ExerciseCategory[] = ['lower', 'pull', 'push', 'core', 'neck']
const FAILURE_RULES: FailureRule[] = ['never', 'lastSetOnly', 'allSets']

export default function ExerciseLibraryScreen({ currentGymId }: { currentGymId: string }) {
  const [categoryFilter, setCategoryFilter] = useState<ExerciseCategory>('lower')
  const [editing, setEditing] = useState<Exercise | null>(null)
  const [creating, setCreating] = useState(false)

  const exercises = useLiveQuery(
    async () => (await db.exercises.orderBy('sortOrder').toArray()).filter((e) => !e.archived),
    [],
    [],
  )

  const grouped = useMemo(
    () => exercises.filter((e) => e.category === categoryFilter),
    [exercises, categoryFilter],
  )

  return (
    <div className="flex min-h-svh flex-col pb-24">
      <header className="sticky top-0 z-10 border-b border-line bg-paper/95 px-3 py-3 backdrop-blur">
        <h1 className="heading-display text-2xl text-ink">Exercise Library</h1>
        <div className="mt-2 flex gap-1 overflow-x-auto">
          {CATEGORIES.map((cat) => {
            const styles = CATEGORY_STYLES[cat]
            const active = cat === categoryFilter
            return (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`tap-target label-heading whitespace-nowrap rounded-full border px-3 text-sm ${
                  active ? `${styles.chipBg} ${styles.border} ${styles.text}` : 'border-line text-ink-muted'
                }`}
              >
                {cat}
              </button>
            )
          })}
        </div>
      </header>

      <main className="flex-1 space-y-2 px-3 py-3">
        {grouped.length === 0 && (
          <p className="pt-10 text-center text-ink-muted">
            No {categoryFilter} exercises yet — add one below.
          </p>
        )}
        {grouped.map((exercise, i) => {
          const styles = CATEGORY_STYLES[exercise.category]
          return (
            <div
              key={exercise.id}
              className={`flex items-center gap-1 rounded-lg border-l-4 bg-card pr-1 ${styles.border}`}
            >
              <button
                onClick={() => setEditing(exercise)}
                className="heading-display tap-target min-w-0 flex-1 truncate px-3 text-left text-ink"
              >
                {exercise.name}
                {exercise.bodyweight && (
                  <span className="label-heading ml-2 text-xs text-ink-muted">BW</span>
                )}
              </button>
              <button
                onClick={() => moveExerciseInCategory(exercise.id, 'up')}
                disabled={i === 0}
                className="tap-target w-9 text-ink-muted disabled:opacity-20"
              >
                ⌃
              </button>
              <button
                onClick={() => moveExerciseInCategory(exercise.id, 'down')}
                disabled={i === grouped.length - 1}
                className="tap-target w-9 text-ink-muted disabled:opacity-20"
              >
                ⌄
              </button>
            </div>
          )
        })}

        <button
          onClick={() => setCreating(true)}
          className="label-heading tap-target w-full rounded-xl border border-dashed border-line text-ink-muted active:bg-card"
        >
          + New exercise
        </button>
      </main>

      {editing && <ExerciseEditor exercise={editing} onClose={() => setEditing(null)} />}

      {creating && (
        <NewExerciseSheet
          initialCategory={categoryFilter}
          currentGymId={currentGymId}
          onClose={() => setCreating(false)}
        />
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="mb-3 block">
      <span className="label-heading mb-1 block text-xs text-ink-muted">
        {label}
      </span>
      {children}
    </label>
  )
}

const inputClass =
  'tap-target w-full rounded-lg border border-line bg-card-alt px-3 text-base text-ink outline-none'
const segButtonClass = (active: boolean) =>
  `label-heading tap-target flex-1 rounded-lg border text-sm ${
    active ? 'border-accent bg-accent text-accent-ink' : 'border-line text-ink-muted'
  }`

function ExerciseEditor({
  exercise,
  onClose,
}: {
  exercise: Exercise
  onClose: () => void
}) {
  const [form, setForm] = useState(exercise)
  const gyms = useLiveQuery(() => db.gyms.toArray(), [], [])
  const enabledAtGyms = useLiveQuery(
    async () => {
      const rows = await db.gymExercises.where('exerciseId').equals(exercise.id).toArray()
      return new Set(rows.filter((r) => r.enabled).map((r) => r.gymId))
    },
    [exercise.id],
    new Set<string>(),
  )

  const otherExercises = useLiveQuery(
    async () => (await db.exercises.toArray()).filter((e) => !e.archived && e.id !== exercise.id),
    [exercise.id],
    [],
  )

  async function save() {
    await updateExercise(exercise.id, {
      name: form.name,
      category: form.category,
      formCue: form.formCue,
      failureRule: form.failureRule,
      repTarget: form.repTarget,
      weightIncrement: form.weightIncrement,
      bodyweight: form.bodyweight,
      supersetPartnerId: form.supersetPartnerId,
      setStructure: form.supersetPartnerId ? 'superset' : 'straight',
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end bg-ink/40" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full overflow-y-auto rounded-t-2xl bg-card p-4 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="heading-display mb-3 text-xl text-ink">{exercise.name}</h2>

        <Field label="Name">
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={inputClass}
          />
        </Field>

        <Field label="Category">
          <div className="flex flex-wrap gap-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setForm({ ...form, category: cat })}
                className={segButtonClass(form.category === cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Form cue">
          <input
            value={form.formCue}
            onChange={(e) => setForm({ ...form, formCue: e.target.value })}
            className={inputClass}
          />
        </Field>

        <Field label="Failure rule">
          <div className="flex gap-1">
            {FAILURE_RULES.map((rule) => (
              <button
                key={rule}
                onClick={() => setForm({ ...form, failureRule: rule })}
                className={segButtonClass(form.failureRule === rule)}
              >
                {rule === 'never' ? 'never' : rule === 'lastSetOnly' ? 'last set' : 'all sets'}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Superset partner">
          <select
            value={form.supersetPartnerId ?? ''}
            onChange={(e) =>
              setForm({ ...form, supersetPartnerId: e.target.value || undefined })
            }
            className={inputClass}
          >
            <option value="">None — straight sets</option>
            {otherExercises.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </Field>

        <div className="flex gap-3">
          <Field label="Rep target">
            <input
              type="number"
              inputMode="numeric"
              value={form.repTarget}
              onChange={(e) => setForm({ ...form, repTarget: Number(e.target.value) })}
              className={inputClass}
            />
          </Field>
          <Field label="Increment (kg)">
            <input
              type="number"
              inputMode="decimal"
              value={form.weightIncrement}
              onChange={(e) => setForm({ ...form, weightIncrement: Number(e.target.value) })}
              className={inputClass}
              disabled={form.bodyweight}
            />
          </Field>
        </div>

        <Field label="Bodyweight (reps-only, no weight)">
          <button
            onClick={() => setForm({ ...form, bodyweight: !form.bodyweight })}
            className={`label-heading tap-target w-full rounded-lg border text-sm ${
              form.bodyweight ? 'border-accent bg-accent text-accent-ink' : 'border-line text-ink-muted'
            }`}
          >
            {form.bodyweight ? 'Yes — bodyweight' : 'No — weighted'}
          </button>
        </Field>

        <Field label="Enabled at gyms">
          <div className="flex flex-wrap gap-1">
            {gyms.map((gym) => {
              const enabled = enabledAtGyms.has(gym.id)
              return (
                <button
                  key={gym.id}
                  onClick={() => setGymExerciseEnabled(gym.id, exercise.id, !enabled)}
                  className={segButtonClass(enabled)}
                >
                  {gym.name}
                </button>
              )
            })}
          </div>
        </Field>

        <div className="mt-4 flex gap-2">
          <button
            onClick={save}
            className="label-heading tap-target flex-1 rounded-lg bg-accent text-accent-ink active:opacity-90"
          >
            Save
          </button>
          <button
            onClick={onClose}
            className="label-heading tap-target rounded-lg border border-line px-5 text-ink-muted"
          >
            Cancel
          </button>
        </div>
        <button
          onClick={async () => {
            await setArchived(exercise.id, true)
            onClose()
          }}
          className="label-heading tap-target mt-3 w-full text-sm text-red-600"
        >
          Archive (hide without deleting history)
        </button>
      </div>
    </div>
  )
}

function NewExerciseSheet({
  initialCategory,
  currentGymId,
  onClose,
}: {
  initialCategory: ExerciseCategory
  currentGymId: string
  onClose: () => void
}) {
  const [form, setForm] = useState<NewExerciseInput>(defaultNewExercise(initialCategory))

  async function save() {
    if (!form.name.trim()) return
    await createExercise(form, currentGymId)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end bg-ink/40" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full overflow-y-auto rounded-t-2xl bg-card p-4 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="heading-display mb-3 text-xl text-ink">New exercise</h2>

        <Field label="Name">
          <input
            autoFocus
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Cable Row"
            className={inputClass}
          />
        </Field>

        <Field label="Category">
          <div className="flex flex-wrap gap-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setForm({ ...form, category: cat })}
                className={segButtonClass(form.category === cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </Field>

        <div className="flex gap-3">
          <Field label="Rep target">
            <input
              type="number"
              inputMode="numeric"
              value={form.repTarget}
              onChange={(e) => setForm({ ...form, repTarget: Number(e.target.value) })}
              className={inputClass}
            />
          </Field>
          <Field label="Increment (kg)">
            <input
              type="number"
              inputMode="decimal"
              value={form.weightIncrement}
              onChange={(e) => setForm({ ...form, weightIncrement: Number(e.target.value) })}
              className={inputClass}
              disabled={form.bodyweight}
            />
          </Field>
        </div>

        <Field label="Bodyweight (reps-only, no weight)">
          <button
            onClick={() => setForm({ ...form, bodyweight: !form.bodyweight })}
            className={`label-heading tap-target w-full rounded-lg border text-sm ${
              form.bodyweight ? 'border-accent bg-accent text-accent-ink' : 'border-line text-ink-muted'
            }`}
          >
            {form.bodyweight ? 'Yes — bodyweight' : 'No — weighted'}
          </button>
        </Field>

        <p className="mb-3 text-xs text-ink-muted">
          Failure rule defaults to "never" — edit later if needed.
        </p>

        <button
          onClick={save}
          disabled={!form.name.trim()}
          className="label-heading tap-target w-full rounded-lg bg-accent text-accent-ink disabled:opacity-40"
        >
          Add exercise
        </button>
      </div>
    </div>
  )
}
