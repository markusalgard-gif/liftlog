import { useState } from 'react'
import { logFootball } from '../lib/quickLog'

export default function FootballQuickLogSheet({ onClose }: { onClose: () => void }) {
  const [note, setNote] = useState('')

  return (
    <div className="fixed inset-0 z-30 flex items-end bg-ink/40" onClick={onClose}>
      <div
        className="w-full rounded-t-2xl bg-card p-4 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="heading-display mb-3 text-xl text-ink">Log football</h2>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note (optional)"
          className="tap-target mb-3 w-full rounded-lg border border-line bg-card-alt px-4 text-ink outline-none placeholder:text-ink-muted"
        />
        <div className="flex gap-2">
          <button
            onClick={() => logFootball('training', undefined, note || undefined).then(onClose)}
            className="label-heading tap-target flex-1 rounded-lg border border-line text-ink active:bg-card-alt"
          >
            Training
          </button>
          <button
            onClick={() => logFootball('match', undefined, note || undefined).then(onClose)}
            className="label-heading tap-target flex-1 rounded-lg border border-line text-ink active:bg-card-alt"
          >
            Match
          </button>
        </div>
      </div>
    </div>
  )
}
