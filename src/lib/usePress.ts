import { useCallback, useRef } from 'react'

/**
 * Tap vs long-press on one element, via pointer events.
 *
 * Long-press fires after `delay` ms while still held; a release before that
 * fires the tap. Scrolling (browser takes over via touch-action) fires
 * pointercancel, which cancels both — so a scroll that starts on a slot
 * never logs a set.
 */
export function usePress(handlers: {
  onTap?: () => void
  onLongPress?: () => void
  delay?: number
}) {
  const { onTap, onLongPress, delay = 450 } = handlers
  const timer = useRef<number | undefined>(undefined)
  const longFired = useRef(false)

  const onPointerDown = useCallback(() => {
    longFired.current = false
    window.clearTimeout(timer.current)
    if (onLongPress) {
      timer.current = window.setTimeout(() => {
        longFired.current = true
        onLongPress()
      }, delay)
    }
  }, [onLongPress, delay])

  const onPointerUp = useCallback(() => {
    window.clearTimeout(timer.current)
    if (!longFired.current) onTap?.()
  }, [onTap])

  const cancel = useCallback(() => {
    window.clearTimeout(timer.current)
  }, [])

  return {
    onPointerDown,
    onPointerUp,
    onPointerLeave: cancel,
    onPointerCancel: cancel,
  }
}
