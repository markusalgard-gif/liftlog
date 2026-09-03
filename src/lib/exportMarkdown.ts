import { db } from '../db/db'
import { dayLabel, weekDates, weekRangeLabel } from './week'

/** Compact "10×60" (no spaces) to match the spec's markdown export format
 *  exactly — distinct from the UI's spaced "10 × 60" display format. */
function fmtSetCompact(reps: number, weight: number | null, bodyweight: boolean): string {
  return bodyweight ? String(reps) : `${reps}×${weight ?? '—'}`
}

/**
 * Renders one week as clean markdown, formatted for pasting into a chat —
 * matches the exact structure from the spec: header, optional bodyweight/
 * football summary lines, then one section per day that had a session.
 */
export async function generateWeekMarkdown(mondayIso: string): Promise<string> {
  const dates = weekDates(mondayIso)
  const dateIndex = new Map(dates.map((d, i) => [d, i]))

  const [sessions, bodyweightEntries, footballEntries, gyms, exercises] = await Promise.all([
    db.sessions.where('date').anyOf(dates).toArray(),
    db.bodyweightEntries.where('date').anyOf(dates).toArray(),
    db.footballSessions.where('date').anyOf(dates).toArray(),
    db.gyms.toArray(),
    db.exercises.toArray(),
  ])

  const gymNameById = new Map(gyms.map((g) => [g.id, g.name]))
  const exerciseById = new Map(exercises.map((e) => [e.id, e]))

  const lines: string[] = []
  lines.push(`## Week ${weekRangeLabel(mondayIso)}`)

  if (bodyweightEntries.length > 0) {
    const sorted = [...bodyweightEntries].sort((a, b) => a.date.localeCompare(b.date))
    const parts = sorted.map((e) => `${e.kg}kg (${dayLabel(dateIndex.get(e.date) ?? 0)})`)
    lines.push(`**Bodyweight:** ${parts.join(', ')}`)
  }

  if (footballEntries.length > 0) {
    const sorted = [...footballEntries].sort((a, b) => a.date.localeCompare(b.date))
    const parts = sorted.map(
      (f) => `${dayLabel(dateIndex.get(f.date) ?? 0)} ${f.type}`,
    )
    lines.push(`**Football:** ${parts.join(', ')}`)
  }

  const sortedSessions = [...sessions].sort((a, b) => a.date.localeCompare(b.date))

  for (const session of sortedSessions) {
    const setLogs = await db.setLogs.where('sessionId').equals(session.id).toArray()
    if (setLogs.length === 0) continue // don't clutter with sessions that logged nothing

    const gymName = gymNameById.get(session.gymId) ?? 'Unknown gym'
    // Matches the spec's exact format: "Session B", not the full template
    // name — keeps the export terse and matching the user's own shorthand.
    const sessionLabel = session.templateId
      ? `Session ${session.templateId}`
      : 'Freestyle'

    lines.push('')
    lines.push(`### ${dayLabel(dateIndex.get(session.date) ?? 0)} — ${sessionLabel} (${gymName})`)
    if (session.note) lines.push(`*Note: ${session.note}*`)

    const byExercise = new Map<string, typeof setLogs>()
    for (const log of setLogs) {
      if (!byExercise.has(log.exerciseId)) byExercise.set(log.exerciseId, [])
      byExercise.get(log.exerciseId)!.push(log)
    }

    // Preserve session's exercise order where possible, then any extras.
    const orderedIds = [
      ...session.exerciseIds.filter((id) => byExercise.has(id)),
      ...[...byExercise.keys()].filter((id) => !session.exerciseIds.includes(id)),
    ]

    for (const exerciseId of orderedIds) {
      const exercise = exerciseById.get(exerciseId)
      const sets = byExercise
        .get(exerciseId)!
        .sort((a, b) => a.setNumber - b.setNumber)
      const setsStr = sets
        .map((s) => fmtSetCompact(s.reps, s.weight, exercise?.bodyweight ?? false))
        .join(', ')
      lines.push(`- ${exercise?.name ?? 'Unknown exercise'}: ${setsStr}`)
    }
  }

  return lines.join('\n')
}
