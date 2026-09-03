import { exportAllData, importAllData, markBackedUpNow, type BackupFile } from '../backup'
import { getSupabase } from '../supabase/client'
import { mergeSnapshots } from './mergeSnapshots'

const LINKED_USER_KEY = 'liftlog-linked-user-id'
const LAST_CLOUD_BACKUP_KEY = 'liftlog-last-cloud-backup-at'

function requireClient() {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Cloud is not configured on this device.')
  return supabase
}

async function requireUserId(): Promise<string> {
  const supabase = requireClient()
  const { data, error } = await supabase.auth.getUser()
  if (error) throw new Error(`Not signed in: ${error.message}`)
  const id = data.user?.id
  if (!id) throw new Error('Not signed in.')
  return id
}

export async function uploadSnapshot(): Promise<BackupFile> {
  const supabase = requireClient()
  const userId = await requireUserId()
  const backup = await exportAllData()
  const { error } = await supabase.from('user_snapshots').upsert(
    {
      user_id: userId,
      exported_at: new Date(backup.exportedAt).toISOString(),
      payload: backup,
    },
    { onConflict: 'user_id' },
  )
  if (error) throw new Error(`Cloud backup failed: ${error.message}`)
  markBackedUpNow()
  localStorage.setItem(LAST_CLOUD_BACKUP_KEY, String(backup.exportedAt))
  return backup
}

export async function downloadSnapshot(): Promise<BackupFile | null> {
  const supabase = requireClient()
  const userId = await requireUserId()
  const { data, error } = await supabase
    .from('user_snapshots')
    .select('payload, exported_at')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw new Error(`Could not read cloud backup: ${error.message}`)
  if (!data?.payload) return null
  return data.payload as BackupFile
}

export async function restoreSnapshot(backup: BackupFile): Promise<void> {
  await importAllData(backup)
  markBackedUpNow()
  localStorage.setItem(LAST_CLOUD_BACKUP_KEY, String(backup.exportedAt))
}

export async function mergeAndKeepBoth(cloud: BackupFile): Promise<void> {
  const local = await exportAllData()
  const merged = mergeSnapshots(local, cloud)
  await importAllData(merged)
  await uploadSnapshot()
}

export function linkedUserId(): string | null {
  return localStorage.getItem(LINKED_USER_KEY)
}

export function markUserLinked(userId: string): void {
  localStorage.setItem(LINKED_USER_KEY, userId)
}

export function lastCloudBackupAt(): number | null {
  const raw = localStorage.getItem(LAST_CLOUD_BACKUP_KEY)
  if (!raw) return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

export function unlinkUser(): void {
  localStorage.removeItem(LINKED_USER_KEY)
  localStorage.removeItem(LAST_CLOUD_BACKUP_KEY)
}

export async function deleteCloudSnapshot(): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) return
  const { data } = await supabase.auth.getUser()
  if (!data.user) return
  const { error } = await supabase.from('user_snapshots').delete().eq('user_id', data.user.id)
  if (error) throw new Error(`Could not delete cloud backup: ${error.message}`)
}
