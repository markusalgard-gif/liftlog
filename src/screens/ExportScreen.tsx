import { useEffect, useState } from 'react'
import { addWeeks, mondayOf, weekRangeLabel } from '../lib/week'
import { generateWeekMarkdown } from '../lib/exportMarkdown'

export default function ExportScreen() {
  const [mondayIso, setMondayIso] = useState(() => mondayOf())
  const [markdown, setMarkdown] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setCopied(false)
    generateWeekMarkdown(mondayIso).then(setMarkdown)
  }, [mondayIso])

  async function copy() {
    await navigator.clipboard.writeText(markdown)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex min-h-svh flex-col pb-24">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-paper/95 px-3 py-3 backdrop-blur">
        <button
          onClick={() => setMondayIso((m) => addWeeks(m, -1))}
          className="tap-target px-3 text-xl text-ink-muted"
        >
          ‹
        </button>
        <h1 className="heading-display text-lg text-ink">{weekRangeLabel(mondayIso)}</h1>
        <button
          onClick={() => setMondayIso((m) => addWeeks(m, 1))}
          className="tap-target px-3 text-xl text-ink-muted"
        >
          ›
        </button>
      </header>

      <main className="flex-1 space-y-3 px-3 py-3">
        <button
          onClick={copy}
          className="label-heading tap-target w-full rounded-xl bg-accent text-accent-ink active:opacity-90"
        >
          {copied ? 'Copied ✓' : 'Copy week as markdown'}
        </button>

        <pre className="font-numeric whitespace-pre-wrap rounded-lg border border-line bg-card-alt p-3 text-xs text-ink-muted">
          {markdown || 'Nothing logged this week.'}
        </pre>
      </main>
    </div>
  )
}
