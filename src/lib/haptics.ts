/**
 * Thin wrapper around navigator.vibrate — no-ops silently where unsupported
 * (most desktop browsers, iOS Safari as of writing). Kept to short, subtle
 * pulses only; haptics should confirm an action, never distract from it.
 */
function fire(pattern: number | number[]): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(pattern)
  }
}

/** A set was logged — the single most common action in the app. */
export function hapticLog(): void {
  fire(10)
}

/** A set slot was removed / an exercise swiped out — slightly longer, distinct from logging. */
export function hapticRemove(): void {
  fire(20)
}

/** Session finished — a small double-pulse to mark the milestone. */
export function hapticFinish(): void {
  fire([10, 40, 10])
}
