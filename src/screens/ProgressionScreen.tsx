import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { db } from '../db/db'
import type { Exercise, ExerciseCategory } from '../db/types'
import { CATEGORY_STYLES } from '../lib/categories'
import { getBodyweightHistory, getExerciseProgression } from '../db/queries'
import { pivotByGym, summarizeProgression } from '../lib/progressionChart'

const CATEGORIES: ExerciseCategory[] = ['lower', 'pull', 'push', 'core', 'neck']
const LINE_COLORS = ['#1f9da3', '#cf4d80', '#4a8f5c', '#b8862a', '#3d6ea3', '#c1643a']
const CHART_LINE = '#e2c89e'
const CHART_TICK = '#8a7458'
const CHART_TOOLTIP_BG = '#fbf3e7'
const CHART_TOOLTIP_BORDER = '#e2c89e'
const CHART_TOOLTIP_LABEL = '#2a2015'

export default function ProgressionScreen() {
  const [selected, setSelected] = useState<Exercise | 'bodyweight' | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<ExerciseCategory>('lower')

  const exercises = useLiveQuery(
    async () => (await db.exercises.orderBy('sortOrder').toArray()).filter((e) => !e.archived),
    [],
    [],
  )
  const grouped = exercises.filter((e) => e.category === categoryFilter)

  if (selected === 'bodyweight') {
    return <BodyweightChartPage onBack={() => setSelected(null)} />
  }
  if (selected) {
    return <ExerciseProgressionPage exercise={selected} onBack={() => setSelected(null)} />
  }

  return (
    <div className="flex min-h-svh flex-col pb-24">
      <header className="sticky top-0 z-10 border-b border-line bg-paper/95 px-3 py-3 backdrop-blur">
        <h1 className="heading-display text-2xl text-ink">Progression</h1>
      </header>

      <main className="flex-1 space-y-2 px-3 py-3">
        <button
          onClick={() => setSelected('bodyweight')}
          className="heading-display tap-target w-full rounded-xl border border-line bg-card px-4 text-left text-ink active:bg-card-alt"
        >
          ⚖ Bodyweight
        </button>

        <div className="flex gap-1 overflow-x-auto pt-2">
          {CATEGORIES.map((cat) => {
            const styles = CATEGORY_STYLES[cat]
            const active = cat === categoryFilter
            return (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`tap-target label-heading whitespace-nowrap rounded-full border px-3 text-sm ${
                  active
                    ? `${styles.chipBg} ${styles.border} ${styles.text}`
                    : 'border-line text-ink-muted'
                }`}
              >
                {cat}
              </button>
            )
          })}
        </div>

        {grouped.length === 0 && (
          <p className="pt-6 text-center text-ink-muted">No {categoryFilter} exercises.</p>
        )}
        {grouped.map((exercise) => {
          const styles = CATEGORY_STYLES[exercise.category]
          return (
            <button
              key={exercise.id}
              onClick={() => setSelected(exercise)}
              className={`heading-display tap-target flex w-full items-center gap-2 rounded-lg border-l-4 bg-card px-3 text-left text-ink active:bg-card-alt ${styles.border}`}
            >
              {exercise.name}
            </button>
          )
        })}
      </main>
    </div>
  )
}

function BackHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-paper/95 px-3 py-3 backdrop-blur">
      <button onClick={onBack} className="label-heading tap-target -ml-2 px-2 text-ink-muted">
        ‹ Progression
      </button>
      <h1 className="heading-display text-2xl text-ink">{title}</h1>
    </header>
  )
}

function ExerciseProgressionPage({
  exercise,
  onBack,
}: {
  exercise: Exercise
  onBack: () => void
}) {
  const gyms = useLiveQuery(() => db.gyms.toArray(), [], [])
  const gymNameById = useMemo(() => new Map(gyms.map((g) => [g.id, g.name])), [gyms])

  const points = useLiveQuery(
    () => getExerciseProgression(exercise.id, exercise.bodyweight),
    [exercise.id],
    undefined,
  )

  if (points === undefined) return null

  const { rows, gymNames } = pivotByGym(points, gymNameById)
  const summary = summarizeProgression(points, gymNameById)
  const unit = exercise.bodyweight ? 'reps' : 'kg'

  return (
    <div className="flex min-h-svh flex-col pb-24">
      <BackHeader title={exercise.name} onBack={onBack} />
      <main className="flex-1 px-3 py-3">
        {points.length === 0 ? (
          <p className="pt-10 text-center text-ink-muted">No data logged yet.</p>
        ) : (
          <>
            <div className="mb-4 h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={rows} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke={CHART_LINE} strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: CHART_TICK }} />
                  <YAxis tick={{ fontSize: 10, fill: CHART_TICK }} width={36} />
                  <Tooltip
                    contentStyle={{ background: CHART_TOOLTIP_BG, border: `1px solid ${CHART_TOOLTIP_BORDER}` }}
                    labelStyle={{ color: CHART_TOOLTIP_LABEL }}
                  />
                  {gymNames.map((name, i) => (
                    <Line
                      key={name}
                      type="monotone"
                      dataKey={name}
                      stroke={LINE_COLORS[i % LINE_COLORS.length]}
                      dot={{ r: 3 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="font-numeric space-y-2">
              {summary.currentByGym.map((c) => (
                <div
                  key={c.gymId}
                  className="flex items-center justify-between rounded-lg border border-line bg-card px-3 py-2"
                >
                  <span className="label-heading text-ink-muted">{c.gymName}</span>
                  <span className="font-semibold text-ink">
                    {c.reps} × {c.value}
                    {exercise.bodyweight ? '' : unit}
                  </span>
                </div>
              ))}

              {summary.pr && (
                <div className="flex items-center justify-between rounded-lg border border-line bg-card px-3 py-2">
                  <span className="label-heading text-ink-muted">PR</span>
                  <span className="font-semibold text-ink">
                    {summary.pr.reps} × {summary.pr.value}
                    {exercise.bodyweight ? '' : unit} ({summary.pr.gymName})
                  </span>
                </div>
              )}

              {summary.trend && (
                <p className="px-1 font-body text-sm text-ink-muted">
                  {summary.trend.delta > 0 ? '↑' : summary.trend.delta < 0 ? '↓' : '→'}{' '}
                  {Math.abs(summary.trend.delta)}
                  {unit} over {summary.trend.sessionCount} sessions
                </p>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}

function BodyweightChartPage({ onBack }: { onBack: () => void }) {
  const points = useLiveQuery(() => getBodyweightHistory(), [], undefined)

  if (points === undefined) return null

  return (
    <div className="flex min-h-svh flex-col pb-24">
      <BackHeader title="Bodyweight" onBack={onBack} />
      <main className="flex-1 px-3 py-3">
        {points.length === 0 ? (
          <p className="pt-10 text-center text-ink-muted">No bodyweight logged yet.</p>
        ) : (
          <>
            <div className="mb-4 h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={points} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke={CHART_LINE} strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: CHART_TICK }} />
                  <YAxis tick={{ fontSize: 10, fill: CHART_TICK }} width={36} />
                  <Tooltip
                    contentStyle={{ background: CHART_TOOLTIP_BG, border: `1px solid ${CHART_TOOLTIP_BORDER}` }}
                    labelStyle={{ color: CHART_TOOLTIP_LABEL }}
                  />
                  <Line type="monotone" dataKey="kg" stroke="#1f9da3" dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="font-numeric px-1 text-sm text-ink-muted">
              Latest: {points[points.length - 1].kg}kg on {points[points.length - 1].date}
            </p>
          </>
        )}
      </main>
    </div>
  )
}
