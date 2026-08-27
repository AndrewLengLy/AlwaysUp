import { describe, it, expect } from 'vitest'
import { parseChart } from './yahoo'
import { changeOf, reflect } from './flip'

/** The shape Yahoo's chart endpoint actually returns, trimmed to what the parser reads. */
const payload = (
  closes: (number | null)[],
  meta: Record<string, unknown> = {},
  stampStep = 300,
) => ({
  chart: {
    result: [
      {
        meta: {
          symbol: 'AAPL',
          longName: 'Apple Inc.',
          chartPreviousClose: 100,
          regularMarketVolume: 19_106_898,
          ...meta,
        },
        timestamp: closes.map((_, i) => 1_700_000_000 + i * stampStep),
        indicators: { quote: [{ close: closes }] },
      },
    ],
    error: null,
  },
})

describe('parseChart', () => {
  it('reads closes, name and volume off a well-formed payload', () => {
    const quote = parseChart(payload([101, 102, 103]), 'AAPL', '1M')
    expect(quote.name).toBe('Apple Inc.')
    expect(quote.volume).toBe(19_106_898)
    expect(quote.source).toBe('live')
    expect(quote.substituted).toBeUndefined()
    expect(quote.points.map((d) => d.p)).toEqual([101, 102, 103])
  })

  it('converts Yahoo seconds to the milliseconds the rest of the app uses', () => {
    const quote = parseChart(payload([101, 102]), 'AAPL', '1M')
    expect(quote.points[0].t).toBe(1_700_000_000_000)
  })

  /**
   * Yahoo leaves a null in the close array wherever a bar had no trade. Left in, a null
   * renders as a gap and sails through changeOf as a zero — a fabricated crash to $0.
   */
  it('drops bars with no close rather than charting them as zero', () => {
    const quote = parseChart(payload([101, null, 103, null]), 'AAPL', '1M')
    expect(quote.points.map((d) => d.p)).toEqual([101, 103])
    expect(quote.points.every((d) => Number.isFinite(d.p))).toBe(true)
  })

  it('anchors the day at the previous close, one interval before the first bar', () => {
    const quote = parseChart(payload([104, 106], { chartPreviousClose: 100 }), 'AAPL', '1D')
    expect(quote.points[0].p).toBe(100)
    expect(quote.points[1].t - quote.points[0].t).toBe(300_000)
    // The overnight gap is part of today's move, and now shows up in it.
    expect(changeOf(quote.points).pct).toBeCloseTo(6, 10)
  })

  it('leaves longer ranges starting on their own first bar', () => {
    const quote = parseChart(payload([104, 106], { chartPreviousClose: 100 }), 'AAPL', '1Y')
    expect(quote.points[0].p).toBe(104)
  })

  it('does not duplicate the previous close when the first bar already is it', () => {
    const quote = parseChart(payload([100, 106], { chartPreviousClose: 100 }), 'AAPL', '1D')
    expect(quote.points.map((d) => d.p)).toEqual([100, 106])
  })

  it('falls back to the first bar when no previous close is quoted', () => {
    const quote = parseChart(payload([104, 106], { chartPreviousClose: null }), 'AAPL', '1D')
    expect(quote.prevClose).toBe(104)
    expect(quote.points[0].p).toBe(104)
  })

  /**
   * The point of anchoring at the previous close: comfort mode reflects about p[0], so the
   * mirrored day now inverts the whole session including the overnight gap, rather than
   * quietly keeping the part of the loss that happened before the opening bell.
   */
  it('gives the comfort flip the whole day to mirror', () => {
    const quote = parseChart(payload([97, 95], { chartPreviousClose: 100 }), 'AAPL', '1D')
    const real = changeOf(quote.points)
    expect(real.pct).toBeCloseTo(-5, 10)
    expect(changeOf(reflect(quote.points)).pct).toBeCloseTo(5, 10)
  })

  it('throws on an error payload so the caller substitutes instead of charting nothing', () => {
    const bad = { chart: { result: null, error: { code: 'Not Found', description: 'No data found, symbol may be delisted' } } }
    expect(() => parseChart(bad, 'NOPE', '1D')).toThrow(/delisted/)
  })

  it('throws when a payload has too few usable bars to draw', () => {
    expect(() => parseChart(payload([101, null]), 'AAPL', '1M')).toThrow(/not enough data/)
    expect(() => parseChart({ chart: { result: [] } }, 'AAPL', '1M')).toThrow()
  })

  it('names the quote after the ticker when Yahoo omits a company name', () => {
    const quote = parseChart(payload([101, 102], { longName: undefined, shortName: undefined }), 'AAPL', '1M')
    expect(quote.name).toBe('AAPL')
  })
})
