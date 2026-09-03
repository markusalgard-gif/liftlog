import { useState } from 'react'

const DISMISS_KEY = 'liftlog-install-banner-dismissed'

function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function isStandalone(): boolean {
  // iOS Safari exposes navigator.standalone; other browsers use the
  // display-mode media query.
  return (
    (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches
  )
}

/**
 * "Add to Home Screen" isn't automatable on iOS Safari (no beforeinstallprompt),
 * so the only zero-friction move is telling the user exactly what to tap —
 * once, dismissible, never blocking.
 */
export default function InstallBanner() {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === '1')

  if (dismissed || !isIOS() || isStandalone()) return null

  return (
    <div className="fixed inset-x-0 bottom-14 z-30 flex items-center gap-3 border-t border-line bg-card p-3 text-sm text-ink-muted">
      <span className="flex-1">
        Install LiftLog: tap <span className="font-semibold text-ink">Share</span> →{' '}
        <span className="font-semibold text-ink">Add to Home Screen</span>
      </span>
      <button
        onClick={() => {
          localStorage.setItem(DISMISS_KEY, '1')
          setDismissed(true)
        }}
        className="tap-target px-3 text-ink-muted"
      >
        ✕
      </button>
    </div>
  )
}
