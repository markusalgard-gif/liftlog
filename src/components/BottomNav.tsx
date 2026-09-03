export type Tab = 'log' | 'week' | 'progress' | 'settings'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'log', label: 'Log', icon: '●' },
  { id: 'week', label: 'Week', icon: '▦' },
  { id: 'progress', label: 'Progress', icon: '📈' },
  { id: 'settings', label: 'Settings', icon: '⚙' },
]

/**
 * Only rendered outside an active session — during logging the screen IS
 * the app, per spec; nothing should compete with the Finish button or
 * set slots for taps.
 */
export default function BottomNav({
  active,
  onChange,
}: {
  active: Tab
  onChange: (tab: Tab) => void
}) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-line bg-paper/95 backdrop-blur">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`tap-target label-heading flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs ${
            active === tab.id ? 'text-accent' : 'text-ink-muted'
          }`}
        >
          <span className="text-base">{tab.icon}</span>
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
