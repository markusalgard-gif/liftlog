import type { ProgressionPoint } from '../db/queries'

/** Recharts wants one row per date with a column per gym (nulls = no line segment). */
export function pivotByGym(
  points: ProgressionPoint[],
  gymNameById: Map<string, string>,
): { rows: Record<string, number | string>[]; gymNames: string[] } {
  const dates = [...new Set(points.map((p) => p.date))].sort()
  const gymNames = [...new Set(points.map((p) => gymNameById.get(p.gymId) ?? p.gymId))]

  const rows = dates.map((date) => {
    const row: Record<string, number | string> = { date }
    for (const point of points.filter((p) => p.date === date)) {
      const name = gymNameById.get(point.gymId) ?? point.gymId
      row[name] = point.value
    }
    return row
  })

  return { rows, gymNames }
}

export interface ProgressionSummary {
  currentByGym: { gymId: string; gymName: string; value: number; reps: number; date: string }[]
  pr: { value: number; reps: number; gymId: string; gymName: string; date: string } | undefined
  /** Simple, plain trend: first point vs most recent, no analytics theatre. */
  trend: { delta: number; sessionCount: number } | undefined
}

export function summarizeProgression(
  points: ProgressionPoint[],
  gymNameById: Map<string, string>,
): ProgressionSummary {
  const byGym = new Map<string, ProgressionPoint[]>()
  for (const p of points) {
    if (!byGym.has(p.gymId)) byGym.set(p.gymId, [])
    byGym.get(p.gymId)!.push(p)
  }

  const currentByGym = [...byGym.entries()].map(([gymId, pts]) => {
    const latest = pts[pts.length - 1]
    return {
      gymId,
      gymName: gymNameById.get(gymId) ?? gymId,
      value: latest.value,
      reps: latest.reps,
      date: latest.date,
    }
  })

  const pr = points.reduce<ProgressionSummary['pr']>((best, p) => {
    if (!best || p.value > best.value) {
      return { value: p.value, reps: p.reps, gymId: p.gymId, gymName: gymNameById.get(p.gymId) ?? p.gymId, date: p.date }
    }
    return best
  }, undefined)

  const trend =
    points.length >= 2
      ? { delta: points[points.length - 1].value - points[0].value, sessionCount: points.length }
      : undefined

  return { currentByGym, pr, trend }
}
