import { describe, it, expect } from 'vitest'
import { cents, fmtPct, fmtSigned } from './format'

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

