import { useEffect, useRef } from 'react'
import { prefersReducedMotion } from '../lib/useSize'

const COLORS = ['#21c97f', '#4ade9b', '#12a566', '#c8d0d8']

/**
 * Fires whenever `trigger` changes, and not at all while it is null. Delulu mode only;
 * every chart is a new high. The trigger names the chart being celebrated rather than
 * counting bursts, so the screen can derive it during render instead of keeping a tally
 * in state and incrementing it from an effect.
 */
export function Confetti({ trigger }: { trigger: string | null }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (trigger === null) return
    const canvas = ref.current
    if (!canvas || prefersReducedMotion()) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(devicePixelRatio || 1, 2)
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    canvas.width = w * dpr
    canvas.height = h * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const parts = Array.from({ length: 90 }, () => ({
      x: w * (0.2 + Math.random() * 0.6),
      y: h * 0.62 + Math.random() * 20,
      vx: (Math.random() - 0.5) * 6.5,
      vy: -6 - Math.random() * 7,
      size: 3 + Math.random() * 4,
      rot: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.3,
      color: COLORS[(Math.random() * COLORS.length) | 0],
      life: 1,
    }))

    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const elapsed = now - start
      ctx.clearRect(0, 0, w, h)
      for (const p of parts) {
        p.vy += 0.28
        p.vx *= 0.995
        p.x += p.vx
        p.y += p.vy
        p.rot += p.spin
        p.life = Math.max(0, 1 - elapsed / 2200)
        if (p.life <= 0) continue
        ctx.save()
        ctx.globalAlpha = p.life
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.6)
        ctx.restore()
      }
      if (elapsed < 2200) raf = requestAnimationFrame(tick)
      else ctx.clearRect(0, 0, w, h)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      ctx.clearRect(0, 0, w, h)
    }
  }, [trigger])

  return <canvas ref={ref} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" />
}
