import { useCallback, useRef, useState } from 'react'

const HOLD_MS = 240

/**
 * Distinguishes a tap from a press-and-hold, so a row can both navigate and
 * reveal the truth without the two gestures fighting.
 */
export function useHold(onTap?: () => void) {
  const [held, setHeld] = useState(false)
  const timer = useRef<number | null>(null)
  const fired = useRef(false)

  const clear = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }, [])

  const handlers = {
    onPointerDown: (e: React.PointerEvent) => {
      if (e.button !== undefined && e.button !== 0) return
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
      if (!fired.current) onTap?.()
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
