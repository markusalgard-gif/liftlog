import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { AppState } from '../db/types'
import { startSession, setCurrentGym } from '../lib/sessionActions'
import BodyweightQuickLogSheet from '../components/BodyweightQuickLogSheet'
import FootballQuickLogSheet from '../components/FootballQuickLogSheet'

export default function StartScreen({ appState }: { appState: AppState }) {
  const gyms = useLiveQuery(() => db.gyms.toArray(), [], [])
  const templates = useLiveQuery(() => db.templates.toArray(), [], [])
  const [gymPickerOpen, setGymPickerOpen] = useState(false)
  const [quickLogOpen, setQuickLogOpen] = useState<'bodyweight' | 'football' | null>(null)

  const currentGym = gyms.find((g) => g.id === appState.currentGymId)
  const sortedTemplates = [...templates].sort((a, b) => a.id.localeCompare(b.id))

  return (
    <div className="flex min-h-svh flex-col px-5 pt-14 pb-24">
      {/* Gym chip — silently assumes last-used, tap to switch */}
      <div className="mb-10 flex justify-center">
        <button
          onClick={() => setGymPickerOpen((open) => !open)}
          className="label-heading tap-target rounded-full border border-line bg-card px-5 text-sm text-ink active:bg-card-alt"
        >
          {currentGym?.name ?? '…'}
        </button>
      </div>

      {gymPickerOpen && (
        <div className="mb-8 flex flex-col gap-2">
          {gyms.map((gym) => (
            <button
              key={gym.id}
              onClick={async () => {
                await setCurrentGym(gym.id)
                setGymPickerOpen(false)
              }}
              className={`label-heading tap-target rounded-xl border px-4 text-base ${
                gym.id === appState.currentGymId
                  ? 'border-accent bg-card-alt text-ink'
                  : 'border-line bg-card text-ink active:bg-card-alt'
              }`}
            >
              {gym.name}
            </button>
          ))}
        </div>
      )}

      {/* The five big buttons */}
      <div className="flex flex-1 flex-col justify-center gap-4">
        {sortedTemplates.map((template) => (
          <button
            key={template.id}
            onClick={() => startSession(template.id)}
            className="min-h-20 rounded-2xl border border-line bg-card px-6 text-left active:bg-card-alt"
          >
            <span className="heading-display text-3xl text-ink">{template.id}</span>
            <span className="heading-display ml-4 text-lg text-ink-muted">
              {template.name.replace(/^[A-D]\s*—\s*/, '')}
            </span>
          </button>
        ))}
        <button
          onClick={() => startSession()}
          className="heading-display min-h-16 rounded-2xl border border-dashed border-line bg-transparent px-6 text-xl text-ink-muted active:bg-card"
        >
          Freestyle
        </button>
      </div>

      {/* Ad-hoc logging, no schedule — deliberately small/secondary vs. the
          five session buttons above, which are the primary action. */}
      <div className="mt-4 flex gap-2">
        <button
          onClick={() => setQuickLogOpen('bodyweight')}
          className="label-heading tap-target flex-1 rounded-lg border border-line text-sm text-ink-muted active:bg-card"
        >
          + log bodyweight
        </button>
        <button
          onClick={() => setQuickLogOpen('football')}
          className="label-heading tap-target flex-1 rounded-lg border border-line text-sm text-ink-muted active:bg-card"
        >
          ⚽ + log football
        </button>
      </div>

      {quickLogOpen === 'bodyweight' && (
        <BodyweightQuickLogSheet onClose={() => setQuickLogOpen(null)} />
      )}
      {quickLogOpen === 'football' && (
        <FootballQuickLogSheet onClose={() => setQuickLogOpen(null)} />
      )}
    </div>
  )
}
