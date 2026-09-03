import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { daysSinceLastBackup } from '../lib/backup'

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
export default function BackupNudge({ onOpenBackup }: { onOpenBackup: () => void }) {
  const [dismissed, setDismissed] = useState(false)
  const hasAnyData = useLiveQuery(async () => (await db.sessions.count()) > 0, [], undefined)

  if (dismissed || hasAnyData === undefined || !hasAnyData || isSnoozed()) return null

  const days = daysSinceLastBackup()
  const overdue = days === null || days >= NUDGE_INTERVAL_DAYS
  if (!overdue) return null

  return (
    <div className="mx-3 mt-3 flex items-center gap-3 rounded-lg border border-line bg-card p-3 text-sm text-ink-muted">
      <span className="flex-1">
        {days === null
          ? "You haven't backed up your data yet."
          : `It's been ${days} days since your last backup.`}
      </span>
      <button onClick={onOpenBackup} className="label-heading tap-target px-2 text-accent">
        Back up
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
