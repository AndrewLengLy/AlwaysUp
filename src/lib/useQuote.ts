import { useEffect, useState } from 'react'
import type { Quote, Range } from './types'
import { source } from './data'

export function useQuote(ticker: string, range: Range) {
  const [quote, setQuote] = useState<Quote | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let live = true
    setLoading(true)
    source.getQuote(ticker, range).then((q) => {
      if (!live) return
      setQuote(q)
      setLoading(false)
    })
    return () => {
      live = false
    }
  }, [ticker, range])

  return { quote, loading }
}

export function useQuotes(tickers: string[], range: Range) {
  const key = tickers.join(',')
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let live = true
    setLoading(true)
    Promise.all(tickers.map((t) => source.getQuote(t, range))).then((qs) => {
      if (!live) return
      setQuotes(qs)
      setLoading(false)
    })
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, range])

  return { quotes, loading }
}
