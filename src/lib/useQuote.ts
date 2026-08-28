import { useEffect, useState } from 'react'
import type { Quote, Range } from './types'
import { source } from './data'

/**
 * A quote, and whether it is the quote that was asked for.
 *
 * Both hooks keep the request key alongside the result and derive `loading` from whether
 * the two still match, rather than flipping a loading flag inside the effect. That is one
 * less cascading render, and it closes a window: with `loading` as its own state, the
 * render right after a ticker or range change still had the previous symbol's series in
 * hand and `loading` still false, so the old chart got a frame under the new heading.
 */
export function useQuote(ticker: string, range: Range) {
  const key = `${ticker}:${range}`
  const [result, setResult] = useState<{ key: string; quote: Quote } | null>(null)

  useEffect(() => {
    let live = true
    source.getQuote(ticker, range).then((quote) => {
      if (live) setResult({ key: `${ticker}:${range}`, quote })
    })
    return () => {
      live = false
    }
  }, [ticker, range])

  const quote = result?.key === key ? result.quote : null
  return { quote, loading: quote === null }
}

export function useQuotes(tickers: string[], range: Range) {
  const key = `${tickers.join(',')}:${range}`
  const [result, setResult] = useState<{ key: string; quotes: Quote[] } | null>(null)

  useEffect(() => {
    let live = true
    Promise.all(tickers.map((t) => source.getQuote(t, range))).then((quotes) => {
      if (live) setResult({ key, quotes })
    })
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const fresh = result?.key === key
  return { quotes: fresh ? result.quotes : [], loading: !fresh }
}
