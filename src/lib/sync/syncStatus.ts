export type SyncPhase = 'idle' | 'syncing' | 'ok' | 'error'

export interface SyncStatus {
  phase: SyncPhase
  at: number | null
  error: string | null
}

const LISTENERS = new Set<(status: SyncStatus) => void>()

let status: SyncStatus = { phase: 'idle', at: null, error: null }

export function getSyncStatus(): SyncStatus {
  return status
}

export function subscribeSyncStatus(listener: (status: SyncStatus) => void): () => void {
  LISTENERS.add(listener)
  return () => {
    LISTENERS.delete(listener)
  }
}

export function setSyncStatus(next: SyncStatus): void {
  status = next
  for (const listener of LISTENERS) listener(status)
}

export function formatSyncStatus(s: SyncStatus): string {
  if (s.phase === 'syncing') return 'Syncing…'
  if (s.phase === 'error') return s.error ?? 'Sync failed — will retry when you open the app.'
  if (s.phase === 'ok' && s.at != null) {
    return `Synced ${new Date(s.at).toLocaleTimeString()}`
  }
  return 'Auto-sync is on when you are signed in.'
}
