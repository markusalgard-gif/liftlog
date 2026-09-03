import { useState } from 'react'
import { logBodyweight } from '../lib/quickLog'

export default function BodyweightQuickLogSheet({ onClose }: { onClose: () => void }) {
  const [kg, setKg] = useState('')

  return (
    <div className="fixed inset-0 z-30 flex items-end bg-ink/40" onClick={onClose}>
      <div
        className="w-full rounded-t-2xl bg-card p-4 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="heading-display mb-3 text-xl text-ink">Log bodyweight</h2>
        <input
          autoFocus
          inputMode="decimal"
          value={kg}
          onChange={(e) => setKg(e.target.value)}
          placeholder="kg"
          className="tap-target font-numeric w-full rounded-lg border border-line bg-card-alt px-4 text-xl text-ink outline-none"
        />
        <button
          onClick={async () => {
            const parsed = parseFloat(kg.replace(',', '.'))
            if (!Number.isNaN(parsed)) {
              await logBodyweight(parsed)
              onClose()
            }
          }}
          className="label-heading tap-target mt-3 w-full rounded-lg bg-accent text-accent-ink"
        >
          Save
        </button>
      </div>
    </div>
  )
}
