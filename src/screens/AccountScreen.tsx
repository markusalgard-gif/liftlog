import { useState } from 'react'
import { useAuth } from '../lib/auth/AuthProvider'
import CloudBackupActions from '../components/CloudBackupActions'
import { useSyncStatus } from '../lib/sync/useSyncStatus'
import { formatSyncStatus } from '../lib/sync/syncStatus'

export default function AccountScreen() {
  const { ready, cloudEnabled, session, signInWithGoogle, signOut } = useAuth()
  const syncStatus = useSyncStatus()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const email = session?.user.email ?? session?.user.user_metadata?.email

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-svh flex-col pb-24">
      <header className="sticky top-0 z-10 border-b border-line bg-paper/95 px-3 py-3 backdrop-blur">
        <h1 className="heading-display text-2xl text-ink">Account</h1>
      </header>

      <main className="flex-1 space-y-3 px-3 py-3">
        {!cloudEnabled && (
          <p className="text-sm text-ink-muted">
            Cloud is not set up on this device. You can still log workouts
            locally.
          </p>
        )}

        {cloudEnabled && !ready && (
          <p className="text-sm text-ink-muted">Checking sign-in…</p>
        )}

        {cloudEnabled && ready && !session && (
          <>
            <p className="text-sm text-ink-muted">
              Sign in with Google so your workouts can back up to the cloud.
              You can keep using the app without signing in.
            </p>
            <button
              disabled={busy}
              onClick={() => void run(signInWithGoogle)}
              className="heading-display tap-target w-full rounded-xl bg-accent px-4 text-accent-ink active:opacity-90 disabled:opacity-50"
            >
              {busy ? 'Opening Google…' : 'Sign in with Google'}
            </button>
          </>
        )}

        {cloudEnabled && ready && session && (
          <>
            <p className="text-sm text-ink-muted">Signed in as</p>
            <p className="heading-display text-xl text-ink">{email ?? 'Google account'}</p>
            <p className="text-sm text-ink-muted">{formatSyncStatus(syncStatus)}</p>
            <CloudBackupActions />
            <button
              disabled={busy}
              onClick={() => void run(signOut)}
              className="heading-display tap-target w-full rounded-xl border border-line bg-card px-4 text-ink active:bg-card-alt disabled:opacity-50"
            >
              {busy ? 'Signing out…' : 'Sign out'}
            </button>
          </>
        )}

        {error && <p className="text-sm text-red-700">{error}</p>}
      </main>
    </div>
  )
}
