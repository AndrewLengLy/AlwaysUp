import { useCallback, useRef, useState } from 'react'

const HOLD_MS = 240

/** Anything inside a held element that already has a press gesture of its own. */
const CONTROLS = 'button, a, input, select, textarea'

/**
 * Distinguishes a tap from a press-and-hold, so a row can both navigate and
 * reveal the truth without the two gestures fighting.
 */
export function useHold(onTap?: () => void) {
  const [held, setHeld] = useState(false)
  const timer = useRef<number | null>(null)
  const fired = useRef(false)
  const ignored = useRef(false)

  const clear = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }, [])

  const handlers = {
    onPointerDown: (e: React.PointerEvent) => {
      if (e.button !== undefined && e.button !== 0) return
      /**
       * A press that lands on a control inside the held element belongs to that control.
       * Capturing the pointer here would retarget its click to the element doing the
       * capturing, and a button inside a press-and-hold card would silently never fire.
       * Only controls strictly inside count — the held element itself is the gesture.
       */
      const control = (e.target as Element | null)?.closest?.(CONTROLS) ?? null
      ignored.current = control !== null && control !== e.currentTarget && e.currentTarget.contains(control)
      if (ignored.current) return
      fired.current = false
      try {
        e.currentTarget.setPointerCapture?.(e.pointerId)
      } catch {
        /* synthetic or already-released pointer */
      }
      timer.current = window.setTimeout(() => {
        fired.current = true
        setHeld(true)
      }, HOLD_MS)
    },
    onPointerUp: () => {
      clear()
      setHeld(false)
      if (!ignored.current && !fired.current) onTap?.()
    },
    onPointerCancel: () => {
      clear()
      setHeld(false)
    },
    onPointerLeave: () => {
      clear()
      setHeld(false)
    },
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onTap?.()
      }
    },
  }

  return { held, handlers }
}
