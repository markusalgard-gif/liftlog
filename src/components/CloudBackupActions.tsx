import { useState } from 'react'
import { useAuth } from '../lib/auth/AuthProvider'
import {
  downloadSnapshot,
  lastCloudBackupAt,
  restoreSnapshot,
  uploadSnapshot,
} from '../lib/sync/snapshotSync'
import type { BackupFile } from '../lib/backup'

export default function CloudBackupActions() {
  const { session } = useAuth()
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState<BackupFile | null>(null)

  if (!session) return null

  const last = lastCloudBackupAt()

  async function run(action: () => Promise<void>, ok: string) {
    setBusy(true)
    setStatus(null)
    try {
      await action()
      setStatus(ok)
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2">
      {last != null && (
        <p className="text-xs text-ink-muted">
          Last cloud backup: {new Date(last).toLocaleString()}
        </p>
      )}
      <button
        disabled={busy}
        onClick={() => void run(async () => { await uploadSnapshot() }, 'Saved to the cloud.')}
        className="heading-display tap-target w-full rounded-xl bg-accent px-4 text-left text-accent-ink disabled:opacity-50"
      >
        {busy ? 'Working…' : 'Back up to cloud'}
      </button>
      <button
        disabled={busy}
        onClick={() =>
          void run(async () => {
            const cloud = await downloadSnapshot()
            if (!cloud) throw new Error('No cloud backup yet. Tap Back up to cloud first.')
            setConfirming(cloud)
          }, '')
        }
        className="heading-display tap-target w-full rounded-xl border border-line bg-card px-4 text-left text-ink active:bg-card-alt disabled:opacity-50"
      >
        Restore from cloud
      </button>
      {status && <p className="text-sm text-ink-muted">{status}</p>}

      {confirming && (
        <div className="fixed inset-0 z-30 flex items-end bg-ink/40">
          <div className="w-full rounded-t-2xl bg-card p-4 pb-8">
            <h2 className="heading-display mb-2 text-xl text-ink">Restore cloud backup?</h2>
            <p className="mb-4 text-sm text-ink-muted">
              This replaces ALL current data with the cloud backup from{' '}
              {new Date(confirming.exportedAt).toLocaleString()}. This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const backup = confirming
                  setConfirming(null)
                  void run(async () => { await restoreSnapshot(backup) }, 'Cloud backup restored.')
                }}
                className="label-heading tap-target flex-1 rounded-lg bg-red-600 text-white"
              >
                Replace everything
              </button>
              <button
                onClick={() => setConfirming(null)}
                className="label-heading tap-target rounded-lg border border-line px-5 text-ink-muted"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
