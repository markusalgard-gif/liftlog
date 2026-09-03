/** Monday-start ISO week helpers. All dates are yyyy-mm-dd strings (local time). */

function toISO(d: Date): string {
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}

function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Monday of the week containing `iso` (or today if omitted). */
export function mondayOf(iso?: string): string {
  const d = iso ? parseISO(iso) : new Date()
  const dayOfWeek = d.getDay() // 0 = Sunday
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  d.setDate(d.getDate() + diffToMonday)
  return toISO(d)
}

/** The 7 ISO dates Mon..Sun for the week starting at `mondayIso`. */
export function weekDates(mondayIso: string): string[] {
  const start = parseISO(mondayIso)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    return toISO(d)
  })
}

export function addWeeks(mondayIso: string, delta: number): string {
  const d = parseISO(mondayIso)
  d.setDate(d.getDate() + delta * 7)
  return toISO(d)
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function dayLabel(index: number): string {
  return DAY_LABELS[index]
}

/** e.g. "24–30 Aug 2026" for a Monday-start week, for headers/export. */
export function weekRangeLabel(mondayIso: string): string {
  const start = parseISO(mondayIso)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  const sameMonth = start.getMonth() === end.getMonth()
  const startStr = start.toLocaleDateString('en-GB', { day: 'numeric', month: sameMonth ? undefined : 'short' })
  const endStr = end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  return `${startStr}–${endStr}`
}
