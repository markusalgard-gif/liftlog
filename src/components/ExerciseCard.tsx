import { useState, type PointerEvent as ReactPointerEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { getLastPerformance } from '../db/queries'
import type { Exercise, SetLog } from '../db/types'
import { CATEGORY_STYLES, FAILURE_RULE_ICON } from '../lib/categories'
import { fmtSet } from '../lib/format'
import { computePrefill, type SlotPrefill } from '../lib/prefill'
import { evaluateProgression } from '../lib/progression'
import { logSet, updateSet, deleteSet } from '../lib/sessionActions'
import { usePress } from '../lib/usePress'
import { hapticLog, hapticRemove } from '../lib/haptics'

interface Props {
  exercise: Exercise
  sessionId: string
  gymId: string
  /** This session's already-logged sets for this exercise. */
  loggedSets: SetLog[]
  /** Pointer-down on the drag handle; parent runs the reorder gesture. */
  onDragHandleDown?: (e: ReactPointerEvent) => void
}

const SET_MIN = 3

interface EditorState {
  setNumber: number
  logId?: string // present when editing an already-logged set
  weight: number | null
  reps: number
}

export default function ExerciseCard({
  exercise,
  sessionId,
  gymId,
  loggedSets,
  onDragHandleDown,
}: Props) {
  const [cueOpen, setCueOpen] = useState(false)
  const [editor, setEditor] = useState<EditorState | null>(null)
  const styles = CATEGORY_STYLES[exercise.category]

  const lastPerf = useLiveQuery(
    () => getLastPerformance(exercise.id, gymId, sessionId),
    [exercise.id, gymId, sessionId],
    undefined,
  )
  const gymExercise = useLiveQuery(
    () => db.gymExercises.where('[gymId+exerciseId]').equals([gymId, exercise.id]).first(),
    [gymId, exercise.id],
    undefined,
  )

  const ready = lastPerf !== undefined && gymExercise !== undefined

  const progression = ready ? evaluateProgression(exercise, lastPerf ?? []) : undefined

  const lastPerfLine =
    lastPerf && lastPerf.length > 0
      ? lastPerf.map((s) => fmtSet(s.reps, s.weight, exercise.bodyweight)).join(' · ')
      : 'first time here'

  const maxLogged = loggedSets.reduce((max, s) => Math.max(max, s.setNumber), 0)
  const slotCount = Math.max(SET_MIN, maxLogged)

  function slotPrefill(setNumber: number): SlotPrefill {
    const base = computePrefill(
      exercise,
      lastPerf ?? [],
      gymExercise?.weightOverride,
      setNumber,
    )
    // Cascade weight from this session's most recent logged set: if set 1
    // was corrected to 60kg, sets 2-3 should suggest 60 too. Reps keep
    // their per-set history.
    if (!exercise.bodyweight && loggedSets.length > 0) {
      const sessionLast = [...loggedSets].sort((a, b) => a.setNumber - b.setNumber).at(-1)!
      base.weight = sessionLast.weight
    }
    return base
  }

  function commitEditor(state: EditorState) {
    if (state.logId) {
      updateSet(state.logId, { weight: state.weight, reps: state.reps })
    } else {
      logSet({
        sessionId,
        exerciseId: exercise.id,
        gymId,
        setNumber: state.setNumber,
        weight: exercise.bodyweight ? null : state.weight,
        reps: state.reps,
      })
      hapticLog()
    }
    setEditor(null)
  }

  return (
    <div className={`rounded-xl border-l-4 bg-card p-3 ${styles.border}`}>
      <div className="flex items-baseline gap-2">
        <button
          onClick={() => setCueOpen((open) => !open)}
          className="flex min-w-0 flex-1 items-baseline gap-2 text-left"
        >
          <span className={`text-xs ${styles.text}`}>●</span>
          <span className="heading-display truncate text-lg text-ink">
            {exercise.name}
          </span>
          {progression?.triggered && (
            <span className="font-numeric whitespace-nowrap rounded-full bg-accent/15 px-2 py-0.5 text-xs font-semibold text-accent">
              ↑ +{exercise.weightIncrement}kg
            </span>
          )}
          <span className="font-numeric text-xs text-ink-muted">
            {FAILURE_RULE_ICON[exercise.failureRule]}
          </span>
        </button>
        {onDragHandleDown && (
          <span
            onPointerDown={onDragHandleDown}
            className="touch-none px-2 py-1 text-lg text-ink-muted"
          >
            ≡
          </span>
        )}
      </div>

      {cueOpen && exercise.formCue && (
        <p className="mt-1 text-sm text-ink-muted">{exercise.formCue}</p>
      )}

      <p className="font-numeric mt-1 text-sm text-ink-muted">{lastPerfLine}</p>

      <div className="mt-2 grid grid-cols-3 gap-2">
        {ready && (
          <>
            {Array.from({ length: slotCount }, (_, i) => i + 1).map((setNumber) => {
              const logged = loggedSets.find((s) => s.setNumber === setNumber)
              const prefill = slotPrefill(setNumber)
              return (
                <SetSlot
                  key={setNumber}
                  filled={!!logged}
                  editing={editor?.setNumber === setNumber}
                  label={
                    logged
                      ? fmtSet(logged.reps, logged.weight, exercise.bodyweight)
                      : fmtSet(prefill.reps, prefill.weight, exercise.bodyweight)
                  }
                  filledClass={styles.slotFilled}
                  onTap={() => {
                    if (logged) {
                      // Tap a logged slot → edit it (fix mistaps).
                      setEditor({
                        setNumber,
                        logId: logged.id,
                        weight: logged.weight,
                        reps: logged.reps,
                      })
                    } else {
                      logSet({
                        sessionId,
                        exerciseId: exercise.id,
                        gymId,
                        setNumber,
                        weight: prefill.weight,
                        reps: prefill.reps,
                      })
                      hapticLog()
                    }
                  }}
                  onLongPress={() => {
                    // Long-press an unlogged slot → adjust before logging.
                    if (!logged) {
                      setEditor({ setNumber, weight: prefill.weight, reps: prefill.reps })
                    }
                  }}
                />
              )
            })}
            {/* Ghost "+ set" slot for the rare 4th (or 5th…) set */}
            <GhostSlot
              onTap={() => {
                const setNumber = slotCount + 1
                const prefill = slotPrefill(setNumber)
                logSet({
                  sessionId,
                  exerciseId: exercise.id,
                  gymId,
                  setNumber,
                  weight: prefill.weight,
                  reps: prefill.reps,
                })
                hapticLog()
              }}
            />
          </>
        )}
      </div>

      {editor && (
        <SetEditor
          key={`${editor.setNumber}-${editor.logId ?? 'new'}`}
          state={editor}
          bodyweight={exercise.bodyweight}
          onChange={setEditor}
          onCommit={() => commitEditor(editor)}
          onCancel={() => setEditor(null)}
          onDelete={
            editor.logId
              ? () => {
                  deleteSet(editor.logId!)
                  hapticRemove()
                  setEditor(null)
                }
              : undefined
          }
        />
      )}
    </div>
  )
}

function SetSlot({
  filled,
  editing,
  label,
  filledClass,
  onTap,
  onLongPress,
}: {
  filled: boolean
  editing: boolean
  label: string
  filledClass: string
  onTap: () => void
  onLongPress: () => void
}) {
  const press = usePress({ onTap, onLongPress })
  return (
    <button
      {...press}
      className={`font-numeric tap-target rounded-lg border text-lg font-medium transition-colors ${
        filled
          ? `${filledClass} text-ink`
          : 'border-line bg-card-alt text-ink-muted active:bg-line'
      } ${editing ? 'ring-2 ring-accent' : ''}`}
    >
      {label}
    </button>
  )
}

function GhostSlot({ onTap }: { onTap: () => void }) {
  return (
    <button
      onClick={onTap}
      className="tap-target rounded-lg border border-dashed border-line text-xl text-ink-muted active:bg-card-alt"
    >
      +
    </button>
  )
}

const WEIGHT_STEP = 2.5
const WEIGHT_STEP_FINE = 1.25 // long-press
const REPS_STEP = 1

function SetEditor({
  state,
  bodyweight,
  onChange,
  onCommit,
  onCancel,
  onDelete,
}: {
  state: EditorState
  bodyweight: boolean
  onChange: (s: EditorState) => void
  onCommit: () => void
  onCancel: () => void
  onDelete?: () => void
}) {
  return (
    <div className="mt-2 rounded-lg border border-line bg-card-alt p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="label-heading text-sm text-ink-muted">
          Set {state.setNumber}
        </span>
        {onDelete && (
          <button onClick={onDelete} className="label-heading px-2 py-1 text-sm text-red-600">
            Remove set
          </button>
        )}
      </div>

      {!bodyweight && (
        <Stepper
          label="kg"
          value={state.weight ?? 0}
          step={WEIGHT_STEP}
          longStep={WEIGHT_STEP_FINE}
          min={0}
          onChange={(weight) => onChange({ ...state, weight })}
        />
      )}
      <Stepper
        label="reps"
        value={state.reps}
        step={REPS_STEP}
        min={0}
        integer
        onChange={(reps) => onChange({ ...state, reps })}
      />

      <div className="mt-3 flex gap-2">
        <button
          onClick={onCommit}
          className="label-heading tap-target flex-1 rounded-lg bg-accent text-accent-ink active:opacity-90"
        >
          {state.logId ? 'Save' : 'Log set'}
        </button>
        <button
          onClick={onCancel}
          className="label-heading tap-target rounded-lg border border-line px-5 text-ink-muted active:bg-line"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

/**
 * −/+ steppers; the number itself is tappable for keyboard entry
 * (the failure mode, but available).
 */
function Stepper({
  label,
  value,
  step,
  longStep,
  min,
  integer,
  onChange,
}: {
  label: string
  value: number
  step: number
  longStep?: number
  min: number
  integer?: boolean
  onChange: (v: number) => void
}) {
  const [typing, setTyping] = useState(false)

  const apply = (delta: number) => {
    const next = Math.max(min, Math.round((value + delta) * 100) / 100)
    onChange(next)
  }

  const minusPress = usePress({
    onTap: () => apply(-step),
    onLongPress: longStep ? () => apply(-longStep) : undefined,
  })
  const plusPress = usePress({
    onTap: () => apply(step),
    onLongPress: longStep ? () => apply(longStep) : undefined,
  })

  return (
    <div className="mt-2 flex items-center gap-2">
      <span className="label-heading w-10 text-sm text-ink-muted">{label}</span>
      <button
        {...minusPress}
        aria-label={`decrease ${label}`}
        className="tap-target flex-1 rounded-lg border border-line text-2xl text-ink active:bg-line"
      >
        −
      </button>
      {typing ? (
        <input
          autoFocus
          inputMode={integer ? 'numeric' : 'decimal'}
          defaultValue={value}
          onBlur={(e) => {
            const parsed = parseFloat(e.target.value.replace(',', '.'))
            if (!Number.isNaN(parsed)) onChange(Math.max(min, parsed))
            setTyping(false)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
          }}
          className="font-numeric w-20 rounded-lg border border-accent bg-card py-2 text-center text-xl text-ink outline-none"
        />
      ) : (
        <button
          onClick={() => setTyping(true)}
          className="font-numeric w-20 py-2 text-center text-xl font-semibold text-ink"
        >
          {value}
        </button>
      )}
      <button
        {...plusPress}
        aria-label={`increase ${label}`}
        className="tap-target flex-1 rounded-lg border border-line text-2xl text-ink active:bg-line"
      >
        +
      </button>
    </div>
  )
}
