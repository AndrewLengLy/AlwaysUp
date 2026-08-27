import type { DataSource, Point, Quote, Range } from './types'

/**
 * Deterministic market fiction. Same ticker, same range, same chart, forever —
 * so the flip animation can be developed offline and reasoned about.
 */

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Box-Muller, so the walk has fat-ish normal steps instead of uniform mush. */
function gauss(rnd: () => number): number {
  const u = Math.max(rnd(), 1e-9)
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd())
}

type Character = {
  name: string
  /** Annualised-ish drift for the long walk. */
  trend: number
  /** Daily volatility. */
  vol: number
  /** Forced move for the most recent session, as a fraction. */
  dayPct: number
  /** Extra intraday chop, multiplier on vol. */
  chop: number
  base: number
  note: string
}

/**
 * Fictional tickers on purpose: nothing here should ever be mistaken for a real
 * company's real price history. Each one exists to exercise a specific case.
 */
export const FIXTURES: Record<string, Character> = {
  ASCND: { name: 'Ascendant Dynamics', trend: 0.55, vol: 0.018, dayPct: 0.0412, chop: 1, base: 184.2, note: 'strongly up' },
  PLNGE: { name: 'Plunge Capital Group', trend: -0.42, vol: 0.026, dayPct: -0.0637, chop: 1.1, base: 61.8, note: 'strongly down' },
  FLATT: { name: 'Flatline Industries', trend: 0.0, vol: 0.002, dayPct: 0.0, chop: 0.6, base: 42.0, note: 'flat' },
  WHIPS: { name: 'Whipsaw Semiconductor', trend: 0.1, vol: 0.03, dayPct: -0.0089, chop: 3.4, base: 312.55, note: 'whipsawing intraday' },
  COPE: { name: 'Cope Holdings', trend: -0.12, vol: 0.014, dayPct: -0.0193, chop: 1.2, base: 27.34, note: 'mildly down' },
  HODL: { name: 'Hodl Brothers Trust', trend: 0.22, vol: 0.016, dayPct: 0.0075, chop: 0.9, base: 96.11, note: 'mildly up' },
}

export const DEFAULT_TICKERS = ['ASCND', 'PLNGE', 'WHIPS', 'COPE', 'FLATT', 'HODL']

/** Anything the user types gets a stable invented character rather than an error. */
function characterFor(ticker: string): Character {
  const fixture = FIXTURES[ticker]
  if (fixture) return fixture
  const rnd = mulberry32(hash(ticker))
  const trend = (rnd() - 0.45) * 0.9
  return {
    name: `${ticker} Holdings`,
    trend,
    vol: 0.008 + rnd() * 0.025,
    dayPct: (rnd() - 0.5) * 0.07,
    chop: 0.7 + rnd() * 2,
    base: 8 + rnd() * 400,
    note: 'invented',
  }
}

const DAY = 86_400_000
const SESSION_POINTS = 79 // 5-minute bars across 6.5 hours
const HISTORY_DAYS = 620

/** One master daily walk per ticker; every range but 1D is a slice of its tail. */
function dailyWalk(ticker: string, now: number): Point[] {
  const c = characterFor(ticker)
  const rnd = mulberry32(hash(ticker) ^ 0x9e3779b9)
  const perDay = c.trend / 252
  const out: Point[] = []
  let p = c.base * (1 - c.trend * 0.6)

  // Damped relative to the intraday walk: over a year, undamped noise swamps the drift
  // and a ticker called Plunge Capital ends up quietly compounding.
  const dailyVol = c.vol * 0.55

  for (let i = 0; i < HISTORY_DAYS; i++) {
    p *= 1 + perDay + gauss(rnd) * dailyVol
    // Occasional regime wobble, so long ranges do not look like one smooth curve.
    if (i % 61 === 0) p *= 1 + gauss(rnd) * dailyVol * 2.5
    p = Math.max(p, 0.5)
    out.push({ t: now - (HISTORY_DAYS - 1 - i) * DAY, p })
  }

  // Pin the most recent session to the character's headline move.
  const prev = out[out.length - 2].p
  out[out.length - 1] = { t: out[out.length - 1].t, p: prev * (1 + c.dayPct) }
  return out
}

/**
 * A Brownian bridge: walk freely, then subtract the accumulated error linearly so
 * the session opens at yesterday's close and shuts at today's, exactly.
 */
function intraday(ticker: string, prevClose: number, close: number, now: number): Point[] {
  const c = characterFor(ticker)
  const rnd = mulberry32(hash(ticker) ^ 0x85ebca6b)
  const step = (c.vol * c.chop) / Math.sqrt(SESSION_POINTS)

  const raw: number[] = [prevClose]
  for (let i = 1; i < SESSION_POINTS; i++) raw.push(raw[i - 1] * (1 + gauss(rnd) * step))

  const drift = close - raw[SESSION_POINTS - 1]
  const openMs = now - (SESSION_POINTS - 1) * 5 * 60_000
  return raw.map((p, i) => ({
    t: openMs + i * 5 * 60_000,
    p: p + (drift * i) / (SESSION_POINTS - 1),
  }))
}

const SLICE: Record<Exclude<Range, '1D'>, number> = {
  '1W': 6,
  '1M': 23,
  '3M': 66,
  '1Y': 253,
  ALL: HISTORY_DAYS,
}

/** Frozen at module load so a chart never reshuffles under the user mid-session. */
const NOW = Date.now()

const cache = new Map<string, Point[]>()
function walkFor(ticker: string): Point[] {
  let w = cache.get(ticker)
  if (!w) {
    w = dailyWalk(ticker, NOW)
    cache.set(ticker, w)
  }
  return w
}

export function mockQuote(ticker: string, range: Range): Quote {
  const c = characterFor(ticker)
  const daily = walkFor(ticker)
  const close = daily[daily.length - 1].p
  const prevClose = daily[daily.length - 2].p

  const points =
    range === '1D' ? intraday(ticker, prevClose, close, NOW) : daily.slice(-SLICE[range])

  const rnd = mulberry32(hash(ticker + range))
  return {
    ticker,
    name: c.name,
    range,
    points,
    prevClose,
    volume: Math.round((0.4 + rnd() * 9) * 1_000_000),
    source: 'mock',
  }
}

export const mockSource: DataSource = {
  id: 'mock',
  label: 'Simulated',
  async getQuote(ticker, range) {
    return mockQuote(ticker.toUpperCase(), range)
  },
  async search(query) {
    const q = query.trim().toUpperCase()
    const hits = Object.entries(FIXTURES)
      .filter(([t, c]) => t.includes(q) || c.name.toUpperCase().includes(q))
      .map(([ticker, c]) => ({ ticker, name: c.name }))
    if (!hits.length && /^[A-Z.]{1,6}$/.test(q)) return [{ ticker: q, name: characterFor(q).name }]
    return hits
  },
}
