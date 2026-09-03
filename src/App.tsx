import { lazy, Suspense, useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db/db'
import type { AppState, Session } from './db/types'
import type { BackupFile } from './lib/backup'
import StartScreen from './screens/StartScreen'
import SessionScreen from './screens/SessionScreen'
import WeekGridScreen from './screens/WeekGridScreen'
import SettingsScreen from './screens/SettingsScreen'
import InstallBanner from './components/InstallBanner'
import BackupNudge from './components/BackupNudge'
import FirstSignInSync, { type FirstSignInMode } from './components/FirstSignInSync'
import BottomNav, { type Tab } from './components/BottomNav'
import { todayISO } from './lib/format'
import { useAuth } from './lib/auth/AuthProvider'
import {
  downloadSnapshot,
  linkedUserId,
  markUserLinked,
  mergeAndKeepBoth,
  restoreSnapshot,
  uploadSnapshot,
} from './lib/sync/snapshotSync'
import { syncOnOpen } from './lib/sync/autoSync'
import { useSyncStatus } from './lib/sync/useSyncStatus'
import { formatSyncStatus } from './lib/sync/syncStatus'

// Recharts is the single biggest dependency in the app (~250kB) and is only
// ever needed on the Progress tab — code-split it out of the initial bundle
// so the first paint (and the offline install) stays as light as possible.
const ProgressionScreen = lazy(() => import('./screens/ProgressionScreen'))

interface RootState {
  appState: AppState
  activeSession: Session | null
}

function App() {
  const [tab, setTab] = useState<Tab>('log')
  const { ready: authReady, session } = useAuth()
  const syncStatus = useSyncStatus()
  const [firstSignIn, setFirstSignIn] = useState<{
    mode: FirstSignInMode
    cloud: BackupFile
  } | null>(null)

  // Single live query for both appState and active session, so there is
  // never a frame where the start screen flashes before the session opens.
  const root = useLiveQuery<RootState | undefined>(async () => {
    const appState = await db.appState.get('singleton')
    if (!appState) return undefined // still seeding on very first launch

    let activeSession: Session | null = null
    if (appState.activeSessionId) {
      const session = await db.sessions.get(appState.activeSessionId)
      // Only auto-resume an unfinished session from today.
      if (session && !session.finishedAt && session.date === todayISO()) {
        activeSession = session
      }
    }
    return { appState, activeSession }
  }, [])

  useEffect(() => {
    if (!authReady || !session || firstSignIn) return
    if (linkedUserId() === session.user.id) return

    let cancelled = false
    void (async () => {
      try {
        const [localCount, cloud] = await Promise.all([
          db.sessions.count(),
          downloadSnapshot(),
        ])
        if (cancelled) return
        if (cloud && localCount > 0) {
          setFirstSignIn({ mode: 'both', cloud })
          return
        }
        if (cloud && localCount === 0) {
          setFirstSignIn({ mode: 'cloud-only', cloud })
          return
        }
        if (localCount > 0) await uploadSnapshot()
        markUserLinked(session.user.id)
      } catch (err) {
        console.error('LiftLog: first-sign-in sync failed', err)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [authReady, session, firstSignIn])

  useEffect(() => {
    if (!authReady || !session || firstSignIn) return
    if (linkedUserId() !== session.user.id) return
    if (root?.activeSession) return
    void syncOnOpen()
  }, [authReady, session, firstSignIn, root?.activeSession])

  if (!root) return null // brief; dark background only

  // Mid-session: the screen IS the app, full-stop. No tabs, no banner.
  if (root.activeSession) {
    return <SessionScreen session={root.activeSession} />
  }

  return (
    <>
      {tab === 'log' && (
        <>
          <BackupNudge onNeedSignIn={() => setTab('settings')} />
          {session && (
            <p className="px-5 pt-3 text-center text-xs text-ink-muted">
              {formatSyncStatus(syncStatus)}
            </p>
          )}
          <StartScreen appState={root.appState} />
        </>
      )}
      {tab === 'week' && <WeekGridScreen onJumpToLog={() => setTab('log')} />}
      {tab === 'progress' && (
        <Suspense fallback={null}>
          <ProgressionScreen />
        </Suspense>
      )}
      {tab === 'settings' && <SettingsScreen currentGymId={root.appState.currentGymId} />}
      <BottomNav active={tab} onChange={setTab} />
      <InstallBanner />
      {firstSignIn && session && (
        <FirstSignInSync
          mode={firstSignIn.mode}
          cloud={firstSignIn.cloud}
          onUseDevice={async () => {
            await uploadSnapshot()
            markUserLinked(session.user.id)
            setFirstSignIn(null)
          }}
          onUseCloud={async () => {
            await restoreSnapshot(firstSignIn.cloud)
            markUserLinked(session.user.id)
            setFirstSignIn(null)
          }}
          onMerge={async () => {
            await mergeAndKeepBoth(firstSignIn.cloud)
            markUserLinked(session.user.id)
            setFirstSignIn(null)
          }}
        />
      )}
    </>
  )
}

export default App
