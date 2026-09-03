import { db } from '../../db/db'
import { getSupabase } from '../supabase/client'
import { planOpenSync } from './autoSyncPlan'
import {
  downloadSnapshot,
  lastCloudBackupAt,
  mergeAndKeepBoth,
  restoreSnapshot,
  uploadSnapshot,
} from './snapshotSync'
import { setSyncStatus } from './syncStatus'

let pushInFlight: Promise<void> | null = null

function canSync(): boolean {
  return getSupabase() !== null && navigator.onLine
}

async function signedInUser(): Promise<boolean> {
  const supabase = getSupabase()
  if (!supabase) return false
  const { data } = await supabase.auth.getUser()
  return Boolean(data.user)
}

async function withStatus(work: () => Promise<void>): Promise<void> {
  setSyncStatus({ phase: 'syncing', at: Date.now(), error: null })
  try {
    await work()
    setSyncStatus({ phase: 'ok', at: Date.now(), error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sync failed.'
    console.error('LiftLog: auto-sync failed', err)
    setSyncStatus({ phase: 'error', at: Date.now(), error: message })
  }
}

/** Fire-and-forget upload. Safe to call after Finish — never from logSet. */
export function schedulePush(reason: string): void {
  if (!canSync()) return
  if (pushInFlight) return
  pushInFlight = (async () => {
    if (!(await signedInUser())) return
    await withStatus(async () => {
      console.info('LiftLog: auto-sync push', reason)
      await uploadSnapshot()
    })
  })().finally(() => {
    pushInFlight = null
  })
}

/** Pull newer cloud data when opening the app, then merge/restore if needed. */
export async function syncOnOpen(): Promise<void> {
  if (!canSync()) return
  if (pushInFlight) await pushInFlight
  await withStatus(async () => {
    const [cloud, localSessionCount] = await Promise.all([
      downloadSnapshot(),
      db.sessions.count(),
    ])
    const plan = planOpenSync({
      cloudExportedAt: cloud?.exportedAt ?? null,
      lastLocalUploadAt: lastCloudBackupAt(),
      localSessionCount,
    })
    console.info('LiftLog: auto-sync open', plan)
    if (plan === 'upload') await uploadSnapshot()
    else if (plan === 'restore' && cloud) await restoreSnapshot(cloud)
    else if (plan === 'merge' && cloud) await mergeAndKeepBoth(cloud)
  })
}
