import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { Exercise } from '../db/types'
import { CATEGORY_STYLES } from '../lib/categories'
import ReorderableList from '../components/ReorderableList'
import ExercisePicker from '../components/ExercisePicker'
import {
  addExerciseToTemplate,
  removeExerciseFromTemplate,
  renameTemplate,
  setTemplateExercises,
} from '../lib/templateActions'

export default function TemplatesScreen() {
  const [openTemplateId, setOpenTemplateId] = useState<string | null>(null)
  const templates = useLiveQuery(
    async () => (await db.templates.toArray()).sort((a, b) => a.id.localeCompare(b.id)),
    [],
    [],
  )

  return (
    <div className="flex min-h-svh flex-col pb-24">
      <header className="sticky top-0 z-10 border-b border-line bg-paper/95 px-3 py-3 backdrop-blur">
        <h1 className="heading-display text-2xl text-ink">Templates</h1>
        <p className="text-xs text-ink-muted">These are starting points — edit freely.</p>
      </header>

      <main className="flex-1 space-y-2 px-3 py-3">
        {templates.map((template) => (
          <button
            key={template.id}
            onClick={() => setOpenTemplateId(template.id)}
            className="tap-target w-full rounded-xl border border-line bg-card px-4 text-left"
          >
            <span className="heading-display text-xl text-ink">{template.id}</span>
            <span className="heading-display ml-3 text-ink-muted">{template.name}</span>
            <span className="ml-2 text-xs text-ink-muted/70">
              ({template.exerciseIds.length} exercises)
            </span>
          </button>
        ))}
      </main>

      {openTemplateId && (
        <TemplateEditor templateId={openTemplateId} onClose={() => setOpenTemplateId(null)} />
      )}
    </div>
  )
}

function TemplateEditor({
  templateId,
  onClose,
}: {
  templateId: string
  onClose: () => void
}) {
  // Live query, not a snapshot — so exerciseIds updates (add/remove/reorder)
  // immediately re-render this editor instead of going stale.
  const template = useLiveQuery(() => db.templates.get(templateId), [templateId])
  const [name, setName] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)

  const exercises = useLiveQuery(
    async () => {
      if (!template) return undefined
      const rows = await db.exercises.bulkGet(template.exerciseIds)
      return rows.filter((r): r is Exercise => r !== undefined)
    },
    [template?.exerciseIds.join(',')],
    undefined,
  )

  if (!template) return null
  const displayName = name ?? template.name

  async function handleReorder(newExercises: Exercise[]) {
    await setTemplateExercises(templateId, newExercises.map((e) => e.id))
  }

  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-paper">
      <header className="flex items-center justify-between border-b border-line p-3">
        <span className="heading-display text-xl text-ink">{template.id}</span>
        <button onClick={onClose} className="label-heading tap-target px-3 text-ink-muted">
          Done
        </button>
      </header>

      <div className="border-b border-line p-3">
        <input
          value={displayName}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name?.trim() && renameTemplate(template.id, name.trim())}
          className="tap-target w-full rounded-lg border border-line bg-card px-3 text-ink outline-none"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {exercises && (
          <ReorderableList
            items={exercises}
            keyOf={(e) => e.id}
            onReorder={handleReorder}
            renderItem={(exercise, dragHandleProps) => {
              const styles = CATEGORY_STYLES[exercise.category]
              return (
                <div
                  className={`mb-2 flex items-center gap-2 rounded-lg border-l-4 bg-card p-2 ${styles.border}`}
                >
                  <span className="heading-display min-w-0 flex-1 truncate text-ink">{exercise.name}</span>
                  <button
                    onClick={() => removeExerciseFromTemplate(template.id, exercise.id)}
                    className="label-heading tap-target px-2 text-sm text-red-600"
                  >
                    Remove
                  </button>
                  <span
                    onPointerDown={dragHandleProps.onPointerDown}
                    className="touch-none px-2 text-lg text-ink-muted"
                  >
                    ≡
                  </span>
                </div>
              )
            }}
          />
        )}

        <button
          onClick={() => setPickerOpen(true)}
          className="label-heading tap-target mt-2 w-full rounded-xl border border-dashed border-line text-ink-muted active:bg-card"
        >
          + Add exercise
        </button>
      </div>

      {pickerOpen && (
        <ExercisePicker
          excludeIds={template.exerciseIds}
          onClose={() => setPickerOpen(false)}
          onPick={(exercise) => {
            addExerciseToTemplate(template.id, exercise.id)
            setPickerOpen(false)
          }}
        />
      )}
    </div>
  )
}
