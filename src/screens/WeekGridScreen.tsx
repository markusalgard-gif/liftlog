import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { getWeekData, bestSet } from '../db/queries'
import type { SetLog } from '../db/types'
import { CATEGORY_STYLES } from '../lib/categories'
import { fmtSet, todayISO } from '../lib/format'
import { addWeeks, dayLabel, mondayOf, weekDates, weekRangeLabel } from '../lib/week'
import BodyweightQuickLogSheet from '../components/BodyweightQuickLogSheet'
import FootballQuickLogSheet from '../components/FootballQuickLogSheet'

export default function WeekGridScreen({ onJumpToLog }: { onJumpToLog: () => void }) {
  const [mondayIso, setMondayIso] = useState(() => mondayOf())
  const [expandedCell, setExpandedCell] = useState<{
    exerciseName: string
    date: string
    sets: SetLog[]
    bodyweight: boolean
  } | null>(null)
  const [quickLogOpen, setQuickLogOpen] = useState<'bodyweight' | 'football' | null>(null)

  const dates = useMemo(() => weekDates(mondayIso), [mondayIso])
  const today = todayISO()

  const exercises = useLiveQuery(
    async () => {
      const all = await db.exercises.orderBy('sortOrder').toArray()
      return all.filter((e) => !e.archived)
    },
    [],
    [],
  )
  const weekData = useLiveQuery(() => getWeekData(dates), [dates.join(',')], undefined)

  return (
    <div className="flex min-h-svh flex-col pb-24">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-paper/95 px-3 py-3 backdrop-blur">
        <button
          onClick={() => setMondayIso((m) => addWeeks(m, -1))}
          className="tap-target px-3 text-xl text-ink-muted"
        >
          ‹
        </button>
        <h1 className="heading-display text-lg text-ink">{weekRangeLabel(mondayIso)}</h1>
        <button
          onClick={() => setMondayIso((m) => addWeeks(m, 1))}
          className="tap-target px-3 text-xl text-ink-muted"
        >
          ›
        </button>
      </header>

      <div className="flex gap-2 px-3 py-2">
        <button
          onClick={() => setQuickLogOpen('bodyweight')}
          className="label-heading tap-target flex-1 rounded-lg border border-line text-sm text-ink active:bg-card"
        >
          + log bodyweight
        </button>
        <button
          onClick={() => setQuickLogOpen('football')}
          className="label-heading tap-target flex-1 rounded-lg border border-line text-sm text-ink active:bg-card"
        >
          ⚽ + log football
        </button>
      </div>

      <div className="flex-1 overflow-x-auto">
        <table className="font-numeric w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 w-24 min-w-24 bg-paper p-2 text-left text-ink-muted">
                &nbsp;
              </th>
              {dates.map((date) => (
                <th
                  key={date}
                  className={`label-heading min-w-14 p-1 text-center font-normal ${
                    date === today ? 'text-ink' : 'text-ink-muted'
                  }`}
                >
                  <div>{dayLabel(dates.indexOf(date))}</div>
                  <div className="text-[10px]">{date.slice(8, 10)}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Football row */}
            <tr className="border-t border-line">
              <td className="sticky left-0 z-10 bg-paper p-2 text-ink-muted">⚽</td>
              {dates.map((date) => {
                const entries = weekData?.footballByDate.get(date) ?? []
                return (
                  <td key={date} className="p-1 text-center text-ink">
                    {entries.map((f) => (f.type === 'match' ? 'M' : 'T')).join(' ')}
                  </td>
                )
              })}
            </tr>
            {/* Bodyweight row */}
            <tr className="border-b border-line">
              <td className="sticky left-0 z-10 bg-paper p-2 text-ink-muted">⚖</td>
              {dates.map((date) => {
                const entries = weekData?.bodyweightByDate.get(date) ?? []
                const last = entries[entries.length - 1]
                return (
                  <td key={date} className="p-1 text-center text-ink">
                    {last ? `${last.kg}` : ''}
                  </td>
                )
              })}
            </tr>

            {exercises.map((exercise) => {
              const styles = CATEGORY_STYLES[exercise.category]
              const byDate = weekData?.setsByExerciseAndDate.get(exercise.id)
              return (
                <tr key={exercise.id} className="border-b border-line/60">
                  <td
                    className={`heading-display sticky left-0 z-10 max-w-24 truncate border-l-2 bg-paper p-2 text-[11px] ${styles.border} ${styles.text}`}
                  >
                    {exercise.name}
                  </td>
                  {dates.map((date) => {
                    const sets = byDate?.get(date) ?? []
                    const best = bestSet(sets, exercise.bodyweight)
                    const isEmptyToday = sets.length === 0 && date === today
                    return (
                      <td
                        key={date}
                        onClick={() => {
                          if (best) {
                            setExpandedCell({
                              exerciseName: exercise.name,
                              date,
                              sets: [...sets].sort((a, b) => a.setNumber - b.setNumber),
                              bodyweight: exercise.bodyweight,
                            })
                          } else if (isEmptyToday) {
                            onJumpToLog()
                          }
                        }}
                        className={`p-1 text-center ${
                          best
                            ? 'text-ink'
                            : isEmptyToday
                              ? 'text-accent underline'
                              : 'text-ink-muted/50'
                        }`}
                      >
                        {best ? fmtSet(best.reps, best.weight, exercise.bodyweight) : isEmptyToday ? '+' : '·'}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {expandedCell && (
        <div
          className="fixed inset-0 z-30 flex items-end bg-ink/40"
          onClick={() => setExpandedCell(null)}
        >
          <div className="w-full rounded-t-2xl bg-card p-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="heading-display mb-2 text-lg text-ink">
              {expandedCell.exerciseName} — {expandedCell.date}
            </h2>
            <p className="font-numeric text-ink-muted">
              {expandedCell.sets
                .map((s) => fmtSet(s.reps, s.weight, expandedCell.bodyweight))
                .join(' · ')}
            </p>
            <button
              onClick={() => setExpandedCell(null)}
              className="label-heading tap-target mt-4 w-full rounded-lg border border-line text-ink-muted"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {quickLogOpen === 'bodyweight' && (
        <BodyweightQuickLogSheet onClose={() => setQuickLogOpen(null)} />
      )}
      {quickLogOpen === 'football' && (
        <FootballQuickLogSheet onClose={() => setQuickLogOpen(null)} />
      )}
    </div>
  )
}
