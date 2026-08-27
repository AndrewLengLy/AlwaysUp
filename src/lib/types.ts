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
}

export type DataSource = {
  id: 'mock' | 'live'
  label: string
  getQuote(ticker: string, range: Range): Promise<Quote>
  search(query: string): Promise<{ ticker: string; name: string }[]>
}
