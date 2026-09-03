import type { BackupFile } from '../backup'

const TABLES = [
  'gyms',
  'exercises',
  'gymExercises',
  'sessions',
  'setLogs',
  'templates',
  'bodyweightEntries',
  'footballSessions',
] as const

type TableName = (typeof TABLES)[number]

function rowId(row: unknown): string | undefined {
  if (row && typeof row === 'object' && 'id' in row) {
    const id = (row as { id: unknown }).id
    if (id != null) return String(id)
  }
  return undefined
}

export function rowTimestamp(row: unknown, table: TableName): number {
  if (!row || typeof row !== 'object') return 0
  const r = row as Record<string, unknown>
  if (table === 'setLogs' && typeof r.loggedAt === 'number') return r.loggedAt
  if (table === 'sessions') {
    if (typeof r.finishedAt === 'number') return r.finishedAt
    if (typeof r.startedAt === 'number') return r.startedAt
  }
  if (table === 'gyms' && typeof r.createdAt === 'number') return r.createdAt
  if ((table === 'bodyweightEntries' || table === 'footballSessions') && typeof r.date === 'string') {
    const parsed = Date.parse(r.date)
    return Number.isNaN(parsed) ? 0 : parsed
  }
  return 0
}

function mergeRows(local: unknown[], cloud: unknown[], table: TableName): unknown[] {
  const map = new Map<string, unknown>()
  for (const row of cloud) {
    const id = rowId(row)
    if (id) map.set(id, row)
  }
  for (const row of local) {
    const id = rowId(row)
    if (!id) continue
    const existing = map.get(id)
    if (!existing) {
      map.set(id, row)
      continue
    }
    const localTime = rowTimestamp(row, table)
    const cloudTime = rowTimestamp(existing, table)
    if (localTime >= cloudTime) map.set(id, row)
  }
  return [...map.values()]
}

/** Union by id. Newer timestamp wins; ties keep the local (this device) row.
 *  AppState stays local because active-session is device-specific. */
export function mergeSnapshots(local: BackupFile, cloud: BackupFile): BackupFile {
  const data = { ...local.data }
  for (const table of TABLES) {
    data[table] = mergeRows(local.data[table] ?? [], cloud.data[table] ?? [], table)
  }
  data.appState = local.data.appState?.length ? local.data.appState : cloud.data.appState
  return {
    version: 1,
    exportedAt: Date.now(),
    data,
  }
}
