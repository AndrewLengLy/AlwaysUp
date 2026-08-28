import { describe, it, expect } from 'vitest'
import { cents, fmtPct, fmtSigned, fmtSpokenReturn } from './format'

describe('signing a figure at zero', () => {
  /**
   * Parking a flip exactly half way lands the change on a floating-point hair either side
   * of zero. Both halves of the same figure have to agree about which side that is, or
   * the app prints a red "−0.00" beside a green "+0.00" of the same quantity.
   */
  it('writes zero the same way however it was arrived at', () => {
    for (const n of [0, -0, 1e-9, -1e-9, 0.0049, -0.0049]) {
      expect(fmtSigned(n)).toBe('+0.00')
      expect(fmtPct(n)).toBe('+0.00%')
    }
  })

  it('still signs anything that survives rounding', () => {
    // Math.round takes a half toward +Infinity, so the exact half-cent tie rounds to
    // zero on the way down and prints as zero. Anything past it keeps its sign.
    expect(fmtSigned(-0.005)).toBe('+0.00')
    expect(fmtSigned(-0.006)).toBe('−0.01')
    expect(fmtSigned(412.5)).toBe('+412.50')
    expect(fmtPct(-11.2149)).toBe('−11.21%')
  })

  it('collapses a negative zero into something that compares as positive', () => {
    expect(cents(-1e-9) >= 0).toBe(true)
    expect(cents(-0.02) >= 0).toBe(false)
  })
})

describe('a return spoken to a screen reader', () => {
  /**
   * The sentence has already said which way it went in words, so the figure beside it
   * must not carry a sign of its own: "down +2,018.00" is a contradiction, and the
   * accessibility layer is the one place this app does not get to be wrong.
   */
  it('states the direction in words and the size without a sign', () => {
    expect(fmtSpokenReturn(-2018, -18.82)).toBe('down 2,018.00, 18.82 percent')
    expect(fmtSpokenReturn(787.5, 14.34)).toBe('up 787.50, 14.34 percent')
  })

  it('never puts a sign character next to the direction word', () => {
    for (const [gain, pct] of [
      [-2018, -18.82],
      [787.5, 14.34],
      [-0.006, -0.01],
      [0, 0],
    ]) {
      expect(fmtSpokenReturn(gain, pct)).not.toMatch(/[+−-]/)
    }
  })

  it('agrees with the visible figure about which side of zero a rounding hair falls', () => {
    // The same rule fmtSigned follows: decided on the number that gets printed, so a row
    // cannot say "down" about a position the screen is showing as "+0.00".
    expect(fmtSpokenReturn(-1e-9, -1e-9)).toBe('up 0.00, 0.00 percent')
    expect(fmtSigned(-1e-9)).toBe('+0.00')
  })
})
