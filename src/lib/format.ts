/** Today's date as ISO yyyy-mm-dd in local time. */
export function todayISO(): string {
  const d = new Date()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}

/** 32.5 → "32.5", 40 → "40", null → "—" */
export function fmtWeight(weight: number | null): string {
  if (weight == null) return '—'
  return String(weight)
}

/** One set as "reps × weight" (or just reps for bodyweight). */
export function fmtSet(reps: number, weight: number | null, bodyweight: boolean): string {
  return bodyweight ? String(reps) : `${reps} × ${fmtWeight(weight)}`
}
