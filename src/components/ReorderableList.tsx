import { useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'

interface Props<T> {
  items: T[]
  keyOf: (item: T) => string
  /**
   * Full-content fingerprint used to decide whether an item actually
   * changed (not just whether its key is still present). Defaults to
   * `keyOf`, which is only safe when items never change shape under a
   * stable key — e.g. a superset row whose key is its first exercise's id
   * can silently gain/lose its second exercise while the key stays put, so
   * callers with composite items (like session rows) MUST pass this.
   */
  signatureOf?: (item: T) => string
  onReorder: (newOrder: T[]) => void
  renderItem: (item: T, dragHandleProps: { onPointerDown: (e: ReactPointerEvent) => void }) => ReactNode
}

/**
 * Drag-to-reorder via a dedicated handle (≡), not the whole card — so
 * scrolling and set-slot taps are never mistaken for a reorder gesture.
 * Reorders happen by swapping list positions once the pointer crosses a
 * neighbour's midpoint; each swap resets the drag origin so it feels like
 * a continuous list re-sort rather than absolute pixel dragging.
 */
export default function ReorderableList<T>({
  items,
  keyOf,
  signatureOf = keyOf,
  onReorder,
  renderItem,
}: Props<T>) {
  const [order, setOrder] = useState(items)
  const [draggingKey, setDraggingKey] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState(0)
  const refs = useRef<Map<string, HTMLDivElement>>(new Map())
  const startY = useRef(0)
  const liveOrder = useRef(items)

  // Keep local order in sync when not actively dragging (e.g. exercise
  // added/removed elsewhere while this list is mounted, or a superset pair
  // forming/breaking under an otherwise-unchanged leading key).
  if (draggingKey === null && items !== liveOrder.current) {
    const unchanged =
      items.length === liveOrder.current.length &&
      items.every((it, i) => signatureOf(it) === signatureOf(liveOrder.current[i]))
    if (!unchanged) {
      liveOrder.current = items
      setOrder(items)
    }
  }

  function beginDrag(key: string, e: ReactPointerEvent) {
    setDraggingKey(key)
    startY.current = e.clientY
    setDragOffset(0)

    const onMove = (ev: PointerEvent) => {
      const delta = ev.clientY - startY.current
      setDragOffset(delta)

      const draggedEl = refs.current.get(key)
      if (!draggedEl) return
      const draggedRect = draggedEl.getBoundingClientRect()
      const draggedMid = draggedRect.top + draggedRect.height / 2 + delta

      const currentIndex = liveOrder.current.findIndex((it) => keyOf(it) === key)
      for (let i = 0; i < liveOrder.current.length; i++) {
        if (i === currentIndex) continue
        const otherKey = keyOf(liveOrder.current[i])
        const otherEl = refs.current.get(otherKey)
        if (!otherEl) continue
        const otherRect = otherEl.getBoundingClientRect()
        const otherMid = otherRect.top + otherRect.height / 2
        const crossed = i < currentIndex ? draggedMid < otherMid : draggedMid > otherMid
        if (crossed) {
          const next = [...liveOrder.current]
          const [moved] = next.splice(currentIndex, 1)
          next.splice(i, 0, moved)
          liveOrder.current = next
          setOrder(next)
          startY.current = ev.clientY
          setDragOffset(0)
          break
        }
      }
    }

    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      setDraggingKey(null)
      setDragOffset(0)
      onReorder(liveOrder.current)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  return (
    <>
      {order.map((item) => {
        const key = keyOf(item)
        const isDragging = draggingKey === key
        return (
          <div
            key={key}
            ref={(el) => {
              if (el) refs.current.set(key, el)
              else refs.current.delete(key)
            }}
            style={{
              transform: isDragging ? `translateY(${dragOffset}px)` : undefined,
              position: isDragging ? 'relative' : undefined,
              zIndex: isDragging ? 10 : undefined,
              opacity: isDragging ? 0.9 : 1,
            }}
          >
            {renderItem(item, { onPointerDown: (e) => beginDrag(key, e) })}
          </div>
        )
      })}
    </>
  )
}
