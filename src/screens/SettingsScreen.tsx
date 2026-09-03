import { useState, type ReactNode } from 'react'
import ExerciseLibraryScreen from './ExerciseLibraryScreen'
import GymsScreen from './GymsScreen'
import TemplatesScreen from './TemplatesScreen'
import ExportScreen from './ExportScreen'
import BackupScreen from './BackupScreen'
import BodyweightQuickLogSheet from '../components/BodyweightQuickLogSheet'

type SubScreen = 'library' | 'gyms' | 'templates' | 'export' | 'backup' | null

export default function SettingsScreen({ currentGymId }: { currentGymId: string }) {
  const [sub, setSub] = useState<SubScreen>(null)
  const [loggingBodyweight, setLoggingBodyweight] = useState(false)

  if (sub === 'library') return <BackableScreen onBack={() => setSub(null)}><ExerciseLibraryScreen currentGymId={currentGymId} /></BackableScreen>
  if (sub === 'gyms') return <BackableScreen onBack={() => setSub(null)}><GymsScreen /></BackableScreen>
  if (sub === 'templates') return <BackableScreen onBack={() => setSub(null)}><TemplatesScreen /></BackableScreen>
  if (sub === 'export') return <BackableScreen onBack={() => setSub(null)}><ExportScreen /></BackableScreen>
  if (sub === 'backup') return <BackableScreen onBack={() => setSub(null)}><BackupScreen /></BackableScreen>

  return (
    <div className="flex min-h-svh flex-col pb-24">
      <header className="sticky top-0 z-10 border-b border-line bg-paper/95 px-3 py-3 backdrop-blur">
        <h1 className="heading-display text-2xl text-ink">Settings</h1>
      </header>

      <main className="flex-1 space-y-2 px-3 py-3">
        <SettingsRow label="Exercise Library" hint="Edit, add, archive exercises" onClick={() => setSub('library')} />
        <SettingsRow label="Gyms" hint="Add gyms, toggle per-gym library" onClick={() => setSub('gyms')} />
        <SettingsRow label="Templates" hint="Edit A / B / C / D" onClick={() => setSub('templates')} />
        <SettingsRow label="Export week" hint="Copy a week as markdown" onClick={() => setSub('export')} />
        <SettingsRow label="Backup & Restore" hint="Export/import full JSON backup" onClick={() => setSub('backup')} />
        <SettingsRow label="+ log bodyweight" hint="No schedule — log whenever" onClick={() => setLoggingBodyweight(true)} />
      </main>

      {loggingBodyweight && (
        <BodyweightQuickLogSheet onClose={() => setLoggingBodyweight(false)} />
      )}
    </div>
  )
}

function SettingsRow({
  label,
  hint,
  onClick,
}: {
  label: string
  hint: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="tap-target flex w-full flex-col items-start rounded-xl border border-line bg-card px-4 py-2 text-left active:bg-card-alt"
    >
      <span className="heading-display text-ink">{label}</span>
      <span className="text-xs text-ink-muted">{hint}</span>
    </button>
  )
}

function BackableScreen({
  onBack,
  children,
}: {
  onBack: () => void
  children: ReactNode
}) {
  return (
    <div className="flex min-h-svh flex-col">
      {/* Plain flow (not sticky/fixed) so it never overlaps the screen's
          own sticky header rendered right below it. */}
      <div className="border-b border-line bg-paper px-1 py-1">
        <button
          onClick={onBack}
          className="label-heading tap-target rounded-lg px-3 text-ink-muted active:bg-card"
        >
          ‹ Settings
        </button>
      </div>
      {children}
    </div>
  )
}
