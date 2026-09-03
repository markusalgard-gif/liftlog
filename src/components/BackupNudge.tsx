import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { daysSinceLastBackup } from '../lib/backup'
import { useAuth } from '../lib/auth/AuthProvider'
import { uploadSnapshot } from '../lib/sync/snapshotSync'

const SNOOZE_KEY = 'liftlog-backup-nudge-snoozed-until'
const NUDGE_INTERVAL_DAYS = 30
const SNOOZE_DAYS = 7

function isSnoozed(): boolean {
  const raw = localStorage.getItem(SNOOZE_KEY)
  return raw != null && Date.now() < Number(raw)
}

/**
 * Monthly, dismissible reminder to back up — never nags a brand new
 * install with zero history, and dismissing snoozes for a week rather
 * than forever (so it's not permanently silenced by one tap).
 */
export default function BackupNudge({ onNeedSignIn }: { onNeedSignIn: () => void }) {
  const { session } = useAuth()
  const [dismissed, setDismissed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasAnyData = useLiveQuery(async () => (await db.sessions.count()) > 0, [], undefined)

  if (dismissed || hasAnyData === undefined || !hasAnyData || isSnoozed()) return null

  const days = daysSinceLastBackup()
  const overdue = days === null || days >= NUDGE_INTERVAL_DAYS
  if (!overdue && !error) return null

  async function handleBackUp() {
    if (!session) {
      onNeedSignIn()
      return
    }
    setBusy(true)
    setError(null)
    try {
      await uploadSnapshot()
      setDismissed(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cloud backup failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-3 mt-3 flex items-center gap-3 rounded-lg border border-line bg-card p-3 text-sm text-ink-muted">
      <span className="flex-1">
        {error
          ? error
          : days === null
            ? session
              ? 'Save this device to the cloud so your phone can restore it.'
              : "You haven't backed up your data yet."
            : `It's been ${days} days since your last backup.`}
      </span>
      <button
        disabled={busy}
        onClick={() => void handleBackUp()}
        className="label-heading tap-target px-2 text-accent disabled:opacity-50"
      >
        {busy ? 'Saving…' : session ? 'Back up' : 'Sign in'}
      </button>
      <button
        onClick={() => {
          localStorage.setItem(
            SNOOZE_KEY,
            String(Date.now() + SNOOZE_DAYS * 24 * 60 * 60 * 1000),
          )
          setDismissed(true)
        }}
        className="tap-target px-2 text-ink-muted"
      >
        ✕
      </button>
    </div>
  )
}
