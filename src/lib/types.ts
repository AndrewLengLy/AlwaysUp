export type Point = { t: number; p: number }

export type Range = '1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL'

export const RANGES: Range[] = ['1D', '1W', '1M', '3M', '1Y', 'ALL']

export type Quote = {
  ticker: string
  name: string
  range: Range
  /** Always the real, unmodified series. Comfort transforms happen at render time. */
  points: Point[]
  prevClose: number
  volume: number
  /** Where the data actually came from, so the UI can say so. */
  source: 'mock' | 'live'
  /**
   * Set when a real symbol was asked for and simulated data came back instead — a failed
   * fetch, no network, a rate limit. Inventing a price history for a real company is a
   * lie the comfort flip does not cover, so anything with this flag has to be labelled
   * on screen. See SimulatedChip.
   */
  substituted?: boolean
}

export type SourceId = 'mock' | 'yahoo' | 'alphavantage'

export type DataSource = {
  id: SourceId
  label: string
  /** True when the source serves real companies, which changes what the UI is allowed to claim. */
  real: boolean
  getQuote(ticker: string, range: Range): Promise<Quote>
  search(query: string): Promise<{ ticker: string; name: string }[]>
}
