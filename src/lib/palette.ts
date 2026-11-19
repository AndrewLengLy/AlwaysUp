import { useSyncExternalStore } from 'react'

/**
 * The direction colors as plain hex, for the places that animate between them. framer-motion
 * interpolates color strings, and it cannot interpolate var(--up), so these repeat the values in
 * src/index.css. Keep the two in step.
 */
export type Palette = { up: string; down: string; confetti: string[] }

const LIGHT: Palette = { up: '#1d7a5b', down: '#b8432e', confetti: ['#1d7a5b', '#0f2c24', '#3a987d', '#1f37b5'] }
const DARK: Palette = { up: '#3a987d', down: '#e0715b', confetti: ['#3a987d', '#5cb89b', '#edebe6', '#6b82ff'] }

const QUERY = '(prefers-color-scheme: dark)'

function subscribe(onChange: () => void) {
  const media = window.matchMedia(QUERY)
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

export const paletteNow = (): Palette =>
  typeof window !== 'undefined' && window.matchMedia(QUERY).matches ? DARK : LIGHT

/** Follows the system light or dark setting, as the stylesheet does. */
export function usePalette(): Palette {
  return useSyncExternalStore(subscribe, paletteNow, () => LIGHT)
}
