import { db } from '../db/db'

const BACKUP_VERSION = 1
const LAST_BACKUP_KEY = 'liftlog-last-backup-at'

export interface BackupFile {
  version: number
  exportedAt: number
  data: {
    gyms: unknown[]
    exercises: unknown[]
    gymExercises: unknown[]
    sessions: unknown[]
    setLogs: unknown[]
    templates: unknown[]
    bodyweightEntries: unknown[]
    footballSessions: unknown[]
    appState: unknown[]
  }
}

export async function exportAllData(): Promise<BackupFile> {
  const [
    gyms,
    exercises,
    gymExercises,
    sessions,
    setLogs,
    templates,
    bodyweightEntries,
    footballSessions,
    appState,
  ] = await Promise.all([
    db.gyms.toArray(),
    db.exercises.toArray(),
    db.gymExercises.toArray(),
    db.sessions.toArray(),
    db.setLogs.toArray(),
    db.templates.toArray(),
    db.bodyweightEntries.toArray(),
    db.footballSessions.toArray(),
    db.appState.toArray(),
  ])

  return {
    version: BACKUP_VERSION,
    exportedAt: Date.now(),
    data: {
      gyms,
      exercises,
      gymExercises,
      sessions,
      setLogs,
      templates,
      bodyweightEntries,
      footballSessions,
      appState,
    },
  }
}

/** Triggers a browser file download — works on iOS Safari too (opens the share sheet). */
export function downloadBackup(backup: BackupFile): void {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const date = new Date(backup.exportedAt).toISOString().slice(0, 10)
  a.href = url
  a.download = `liftlog-backup-${date}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  markBackedUpNow()
}

/** Replaces ALL local data with the contents of `backup`. Destructive — caller must confirm. */
export async function importAllData(backup: BackupFile): Promise<void> {
  if (backup.version !== BACKUP_VERSION || !backup.data) {
    throw new Error('Unrecognised backup file format.')
  }

  await db.transaction(
    'rw',
    [
      db.gyms,
      db.exercises,
      db.gymExercises,
      db.sessions,
      db.setLogs,
      db.templates,
      db.bodyweightEntries,
      db.footballSessions,
      db.appState,
    ],
    async () => {
      await Promise.all([
        db.gyms.clear(),
        db.exercises.clear(),
        db.gymExercises.clear(),
        db.sessions.clear(),
        db.setLogs.clear(),
        db.templates.clear(),
        db.bodyweightEntries.clear(),
        db.footballSessions.clear(),
        db.appState.clear(),
      ])

      await Promise.all([
        db.gyms.bulkAdd(backup.data.gyms as never[]),
        db.exercises.bulkAdd(backup.data.exercises as never[]),
        db.gymExercises.bulkAdd(backup.data.gymExercises as never[]),
        db.sessions.bulkAdd(backup.data.sessions as never[]),
        db.setLogs.bulkAdd(backup.data.setLogs as never[]),
        db.templates.bulkAdd(backup.data.templates as never[]),
        db.bodyweightEntries.bulkAdd(backup.data.bodyweightEntries as never[]),
        db.footballSessions.bulkAdd(backup.data.footballSessions as never[]),
        db.appState.bulkAdd(backup.data.appState as never[]),
      ])
    },
  )
}

export function markBackedUpNow(): void {
  localStorage.setItem(LAST_BACKUP_KEY, String(Date.now()))
}

export function daysSinceLastBackup(): number | null {
  const raw = localStorage.getItem(LAST_BACKUP_KEY)
  if (!raw) return null
  return Math.floor((Date.now() - Number(raw)) / (24 * 60 * 60 * 1000))
}

export function clearBackupMarkers(): void {
  localStorage.removeItem(LAST_BACKUP_KEY)
}
