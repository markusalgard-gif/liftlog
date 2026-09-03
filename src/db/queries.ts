import Dexie from 'dexie'
import { db } from './db'
import type { BodyweightEntry, FootballSession, SetLog } from './types'

/**
 * The key query the whole app hinges on: the most recent session's sets
 * for a given exercise at a given gym. Drives pre-fill, the "number to
 * beat" display, and progression suggestions.
 *
 * Uses the compound index [exerciseId+gymId+loggedAt] so this is a single
 * indexed Dexie query, not a scan-and-filter.
 *
 * @param excludeSessionId Pass the active session's id so sets logged two
 * minutes ago don't become their own "number to beat".
 */
export async function getLastPerformance(
  exerciseId: string,
  gymId: string,
  excludeSessionId?: string,
): Promise<SetLog[]> {
  const rows = (
    await db.setLogs
      .where('[exerciseId+gymId+loggedAt]')
      .between([exerciseId, gymId, Dexie.minKey], [exerciseId, gymId, Dexie.maxKey])
      .toArray()
  ).filter((row) => row.sessionId !== excludeSessionId)

  if (rows.length === 0) return []

  // Find the most recent session (by loggedAt) and return only its sets.
  const latestSessionId = rows.reduce((latest, row) =>
    row.loggedAt > latest.loggedAt ? row : latest,
  ).sessionId

  return rows
    .filter((row) => row.sessionId === latestSessionId)
    .sort((a, b) => a.setNumber - b.setNumber)
}

export interface WeekData {
  /** exerciseId -> date -> that day's sets (across all sessions that day). */
  setsByExerciseAndDate: Map<string, Map<string, SetLog[]>>
  footballByDate: Map<string, FootballSession[]>
  bodyweightByDate: Map<string, BodyweightEntry[]>
}

/**
 * Everything the week grid needs for a Mon-Sun range, in three queries
 * (sessions-in-range → their setLogs, plus football and bodyweight by
 * date directly). SetLog has no `date` field of its own — it inherits the
 * date from its parent session, so sessions must be looked up first.
 */
export async function getWeekData(dates: string[]): Promise<WeekData> {
  const sessions = await db.sessions.where('date').anyOf(dates).toArray()
  const sessionDateById = new Map(sessions.map((s) => [s.id, s.date]))
  const setLogs = await db.setLogs
    .where('sessionId')
    .anyOf(sessions.map((s) => s.id))
    .toArray()

  const setsByExerciseAndDate = new Map<string, Map<string, SetLog[]>>()
  for (const log of setLogs) {
    const date = sessionDateById.get(log.sessionId)
    if (!date) continue
    if (!setsByExerciseAndDate.has(log.exerciseId)) {
      setsByExerciseAndDate.set(log.exerciseId, new Map())
    }
    const byDate = setsByExerciseAndDate.get(log.exerciseId)!
    if (!byDate.has(date)) byDate.set(date, [])
    byDate.get(date)!.push(log)
  }

  const football = await db.footballSessions.where('date').anyOf(dates).toArray()
  const footballByDate = new Map<string, FootballSession[]>()
  for (const f of football) {
    if (!footballByDate.has(f.date)) footballByDate.set(f.date, [])
    footballByDate.get(f.date)!.push(f)
  }

  const bodyweight = await db.bodyweightEntries.where('date').anyOf(dates).toArray()
  const bodyweightByDate = new Map<string, BodyweightEntry[]>()
  for (const b of bodyweight) {
    if (!bodyweightByDate.has(b.date)) bodyweightByDate.set(b.date, [])
    bodyweightByDate.get(b.date)!.push(b)
  }

  return { setsByExerciseAndDate, footballByDate, bodyweightByDate }
}

/** Best set of a day = highest weight (or highest reps for bodyweight). */
export function bestSet(sets: SetLog[], bodyweight: boolean): SetLog | undefined {
  if (sets.length === 0) return undefined
  return sets.reduce((best, s) => {
    const key = (x: SetLog) => (bodyweight ? x.reps : x.weight ?? -Infinity)
    return key(s) > key(best) ? s : best
  })
}

export interface ProgressionPoint {
  date: string
  gymId: string
  /** Top-set weight (bodyweight exercises: top-set reps instead). */
  value: number
  reps: number
}

/**
 * One point per session that logged this exercise: its top set (highest
 * weight, or highest reps for bodyweight), across all gyms. Powers the
 * progression chart — one line per gym, per spec.
 */
export async function getExerciseProgression(
  exerciseId: string,
  bodyweight: boolean,
): Promise<ProgressionPoint[]> {
  const logs = await db.setLogs.where('exerciseId').equals(exerciseId).toArray()
  if (logs.length === 0) return []

  const sessionIds = [...new Set(logs.map((l) => l.sessionId))]
  const sessions = await db.sessions.bulkGet(sessionIds)
  const dateBySession = new Map(sessions.filter((s) => !!s).map((s) => [s!.id, s!.date]))

  const bySession = new Map<string, SetLog[]>()
  for (const log of logs) {
    if (!bySession.has(log.sessionId)) bySession.set(log.sessionId, [])
    bySession.get(log.sessionId)!.push(log)
  }

  const points: ProgressionPoint[] = []
  for (const [sessionId, sets] of bySession) {
    const date = dateBySession.get(sessionId)
    const best = bestSet(sets, bodyweight)
    if (!date || !best) continue
    points.push({
      date,
      gymId: best.gymId,
      value: bodyweight ? best.reps : best.weight ?? 0,
      reps: best.reps,
    })
  }

  return points.sort((a, b) => a.date.localeCompare(b.date))
}

export interface BodyweightPoint {
  date: string
  kg: number
}

export async function getBodyweightHistory(): Promise<BodyweightPoint[]> {
  const entries = await db.bodyweightEntries.orderBy('date').toArray()
  return entries.map((e) => ({ date: e.date, kg: e.kg }))
}
