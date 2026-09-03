import { useRef, useState, type ReactNode } from 'react'
import { hapticRemove } from '../lib/haptics'

const SWIPE_START_PX = 14
const REMOVE_THRESHOLD_PX = -100

/**
 * Swipe left to remove. Once horizontal intent is clear the wrapper takes
 * pointer capture, so children (set slots) stop receiving events and can't
 * accidentally log a set mid-swipe. Vertical scrolling stays native via
 * touch-action: pan-y.
 */
export default function SwipeableCard({
  onRemove,
  children,
}: {
  onRemove: () => void
  children: ReactNode
}) {
  const [dx, setDx] = useState(0)
  const [pastThreshold, setPastThreshold] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const gesture = useRef<{ x: number; y: number; swiping: boolean; crossed: boolean } | null>(
    null,
  )

  return (
    <div className="relative">
      <div
        className={`absolute inset-0 flex items-center justify-end rounded-xl pr-5 transition-colors ${
          pastThreshold ? 'bg-red-600' : 'bg-red-200'
        }`}
      >
        <span className={`label-heading ${pastThreshold ? 'text-red-50' : 'text-red-700'}`}>
          Remove
        </span>
      </div>
      <div
        ref={ref}
        style={{
          transform: `translateX(${dx}px)`,
          transition: gesture.current?.swiping ? 'none' : 'transform 150ms ease-out',
          touchAction: 'pan-y',
        }}
        onPointerDown={(e) => {
          gesture.current = { x: e.clientX, y: e.clientY, swiping: false, crossed: false }
        }}
        onPointerMove={(e) => {
          const g = gesture.current
          if (!g) return
          const deltaX = e.clientX - g.x
          const deltaY = e.clientY - g.y
          if (
            !g.swiping &&
            deltaX < -SWIPE_START_PX &&
            Math.abs(deltaX) > Math.abs(deltaY) * 1.5
          ) {
            g.swiping = true
            ref.current?.setPointerCapture(e.pointerId)
          }
          if (g.swiping) {
            setDx(Math.min(0, deltaX))
            const nowPast = deltaX < REMOVE_THRESHOLD_PX
            if (nowPast !== g.crossed) {
              g.crossed = nowPast
              setPastThreshold(nowPast)
              if (nowPast) hapticRemove() // tactile "this will remove it" tick
            }
          }
        }}
        onPointerUp={(e) => {
          const g = gesture.current
          gesture.current = null
          if (g?.swiping) {
            if (e.clientX - g.x < REMOVE_THRESHOLD_PX) {
              onRemove()
            }
            setDx(0)
            setPastThreshold(false)
          }
        }}
        onPointerCancel={() => {
          gesture.current = null
          setDx(0)
          setPastThreshold(false)
        }}
      >
        {children}
      </div>
    </div>
  )
}
