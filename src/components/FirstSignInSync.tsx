import { useState } from 'react'
import type { BackupFile } from '../lib/backup'

export type FirstSignInMode = 'both' | 'cloud-only'

export default function FirstSignInSync({
  mode,
  cloud,
  onUseDevice,
  onUseCloud,
  onMerge,
}: {
  mode: FirstSignInMode
  cloud: BackupFile
  onUseDevice: () => Promise<void>
  onUseCloud: () => Promise<void>
  onMerge: () => Promise<void>
}) {
  const [busy, setBusy] = useState<'device' | 'cloud' | 'merge' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const when = new Date(cloud.exportedAt).toLocaleString()

  async function run(which: 'device' | 'cloud' | 'merge', action: () => Promise<void>) {
    setBusy(which)
    setError(null)
    try {
      await action()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setBusy(null)
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-ink/40">
      <div className="w-full rounded-t-2xl bg-card p-4 pb-8">
        <h2 className="heading-display mb-2 text-xl text-ink">
          {mode === 'both' ? 'This device and the cloud both have data' : 'Cloud backup found'}
        </h2>
        <p className="mb-4 text-sm text-ink-muted">
          {mode === 'both'
            ? `A cloud backup from ${when} exists. Choose what to keep. Merge keeps unique rows from both.`
            : `A cloud backup from ${when} exists. This device has no logged sessions yet.`}
        </p>

        <div className="flex flex-col gap-2">
          {mode === 'both' && (
            <button
              disabled={busy != null}
              onClick={() => void run('device', onUseDevice)}
              className="heading-display tap-target w-full rounded-xl bg-accent px-4 text-accent-ink disabled:opacity-50"
            >
              {busy === 'device' ? 'Saving…' : 'Use this device'}
            </button>
          )}
          <button
            disabled={busy != null}
            onClick={() => void run('cloud', onUseCloud)}
            className="heading-display tap-target w-full rounded-xl border border-line bg-card px-4 text-ink disabled:opacity-50"
          >
            {busy === 'cloud' ? 'Restoring…' : 'Use cloud backup'}
          </button>
          {mode === 'both' && (
            <button
              disabled={busy != null}
              onClick={() => void run('merge', onMerge)}
              className="heading-display tap-target w-full rounded-xl border border-line bg-card px-4 text-ink disabled:opacity-50"
            >
              {busy === 'merge' ? 'Merging…' : 'Merge both'}
            </button>
          )}
        </div>
        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      </div>
    </div>
  )
}
