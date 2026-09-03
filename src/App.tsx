import { lazy, Suspense, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db/db'
import type { AppState, Session } from './db/types'
import StartScreen from './screens/StartScreen'
import SessionScreen from './screens/SessionScreen'
import WeekGridScreen from './screens/WeekGridScreen'
import SettingsScreen from './screens/SettingsScreen'
import InstallBanner from './components/InstallBanner'
import BackupNudge from './components/BackupNudge'
import BottomNav, { type Tab } from './components/BottomNav'
import { todayISO } from './lib/format'

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

  if (!root) return null // brief; dark background only

  // Mid-session: the screen IS the app, full-stop. No tabs, no banner.
  if (root.activeSession) {
    return <SessionScreen session={root.activeSession} />
  }

  return (
    <>
      {tab === 'log' && (
        <>
          <BackupNudge onOpenBackup={() => setTab('settings')} />
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
    </>
  )
}

export default App
