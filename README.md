# AlwaysUp

A portfolio viewer that refuses to show you a loss.

When a position is up, the chart is green and the line climbs. When a position is down,
the chart is **mirrored** so the line climbs anyway — same shape, same volatility, same
drama, opposite direction — and it stays green. The premise is that most of the damage
from checking your portfolio is emotional rather than financial, so this app removes the
emotion and leaves the rest alone.

It is a joke. It says so on every screen.

## The transform

Everything hinges on one line in [`src/lib/flip.ts`](src/lib/flip.ts):

```
p' = 2 * p[0] - p
```

Reflect the series about its own opening price. The open is a fixed point, the shape of
the session is preserved exactly, and the direction inverts — a 6.37% slide becomes a
visually identical 6.37% climb.

Reflecting about `p[0]` rather than the mean or the plot's midline is what makes the lie
*coherent*. Rescale the y-axis to the reflected values and every tick label, high, and
low lands on a number that could plausibly have traded that day. The chart doesn't look
tampered with; it looks like a different, better day.

A useful property falls out of it: because the reflected series spans exactly the same
vertical distance as the original, its projection into pixels is an exact mirror of the
original's (`y' = plotHeight - y`). The flip animation is therefore a true reflection,
not an approximation. There's a test for it in
[`src/lib/geometry.test.ts`](src/lib/geometry.test.ts).

## Comfort levels

| Mode | Behaviour |
| --- | --- |
| **Honest** | No transform. Red is red. |
| **Comfort** | Losses are mirrored. Gains are left alone. *(default)* |
| **Delulu** | Every chart ascends. Up moves pass through at full amplitude, down moves are folded upward and damped, so the line still has the texture of a market and never once loses ground. |

## The truth is one gesture away

A comfort app with no exit is just a lie, so:

- **Press and hold any chart** — or the portfolio total, or a holding row — to see what
  actually happened, for exactly as long as you hold it. The chart morphs through flat
  and lands on reality; the header badge turns red and reads *Showing reality*.
- On load, a comforted chart draws the truth first, sits with it for ~400ms, then flips
  away from it, as if the app caught itself.
- A **parody badge** sits in the header on every screen and cannot be dismissed.
- A first-run disclosure has to be acknowledged before anything else renders.
- **Screen readers always get the real numbers.** Every chart carries an unmodified
  description of the actual price action, and every holding row's accessible name states
  its real change. The joke is visual only — the accessibility layer never lies.

## Data

Ships with a deterministic simulator: a seeded random walk per ticker, so the same ticker
and range produce the same chart every time and development works offline. The tickers
are fictional on purpose — nothing here should ever be mistaken for a real company's real
price history. Each fixture exists to exercise a case:

| Ticker | Case |
| --- | --- |
| `ASCND` | strongly up |
| `PLNGE` | strongly down |
| `FLATT` | flat |
| `WHIPS` | whipsawing intraday |
| `COPE` | mildly down |
| `HODL` | mildly up |

Any other ticker you type gets a stable invented price history rather than an error.

A live adapter (Alpha Vantage) is wired up behind `VITE_ALPHAVANTAGE_KEY` — copy
`.env.example` to `.env` to enable it. Any failure (missing key, rate limit, unknown
symbol) falls back to the simulator instead of showing an error state. Real prices do not
make the app more honest; the chart still flips.

## Running it

```bash
npm install
npm run dev
```

```bash
npm test        # the flip and geometry transforms
npm run build
```

## Stack

Vite, React, TypeScript, Tailwind, Framer Motion. The chart is hand-rolled inline SVG —
the flip is a coordinate transform, and a chart library would only get in the way of it.

## What this is not

Not market data. Not financial advice. Not a basis for any decision. Do not wire this to
a real brokerage account, and do not show it to someone who does not know what it does.
