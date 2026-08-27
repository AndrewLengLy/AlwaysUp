# AlwaysUp

A portfolio viewer that refuses to show you a loss.

When a position is up, the chart is green and the line climbs. When a position is down,
the chart is **mirrored** so the line climbs anyway. Same shape, same volatility, same
drama, opposite direction, and it stays green. The premise is that most of the damage
from checking your portfolio is emotional rather than financial, so this app removes the
emotion and leaves the rest alone.

It is a joke. It says so on every screen.

## The transform

Everything hinges on one line in [`src/lib/flip.ts`](src/lib/flip.ts):

```
p' = 2 * p[0] - p
```

Reflect the series about its own opening price. The open is a fixed point, the shape of
the session is preserved exactly, and the direction inverts. A 6.37% slide becomes a
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

## The flip is the product, so you can play with it

A comfort app with no exit is just a lie, and a transform you can only glimpse is a claim
rather than a demonstration. So the flip is repeatable, interruptible and inspectable.

- **Tap any chart to flip it**, as many times as you like. It lands under-damped, so the
  line overshoots and settles instead of sliding politely into place.
- **Drag the mirror track** to stop the flip anywhere in between. Parked in the middle the
  line goes flat, and both versions fade up on either side of the axis they are mirrored
  about, with that axis drawn and labelled. This is the whole idea in one frame.
- **Press and hold** to peek at reality for exactly as long as you hold it, then let go and
  return to wherever you had parked the track.
- The track is a real range input, so arrow keys, Home and End scrub it and screen readers
  announce how far through the flip it is.
- Every figure above the chart morphs with the line. The price and the change roll
  continuously between the comforting number and the real one, sign included.
- On the portfolio screen, **Reveal all** flips every holding at once, and the total has its
  own flip button. Both latch, so nothing has to be held down.
- On load, a comforted chart draws the truth first, sits with it for ~400ms, then flips
  away from it, as if the app caught itself.
- A **parody badge** sits in the header on every screen and cannot be dismissed.
- A first-run disclosure has to be acknowledged before anything else renders, and it opens
  with a diagram of the reflection so the joke is legible before the app is.
- **Screen readers always get the real numbers.** Every chart carries an unmodified
  description of the actual price action, and every holding row's accessible name states
  its real change. The animated figures are `aria-hidden` with a static truthful summary
  beside them. The joke is visual only, and the accessibility layer never lies.

### Where the fold actually happens

In price space the reflection is about the opening price. In pixel space, once the y axis
has been rescaled to the reflected values, it becomes a reflection about the **plot's
horizontal midline**: `y' = 2·plot.y + plot.h - y`. That is why the mid-flip axis is drawn
where it is, and why the morph passes through a perfectly flat line. The axis is only
drawn in comfort mode on a down session, because that is the only case that is genuinely a
reflection. Delulu rebuilds the series from damped deltas, so it has no axis to draw.

## Data

Real companies, real prices, out of the box. `npm run dev` and the default portfolio is
AAPL, MSFT, NVDA, TSLA, KO and SPY, pulled live. Real data does not make the app more
honest, since the chart still flips. It just means the thing being mirrored actually happened.

| Source | Key | Notes |
| --- | --- | --- |
| **Yahoo Finance** *(default)* | none | Real prices, real names, company search. Sends no CORS headers, so it goes through the dev-server proxy at `/yf`. Fine under `npm run dev` and `npm run preview`, not available to a bare static deploy. |
| **Alpha Vantage** | `VITE_ALPHAVANTAGE_KEY` | Sends CORS headers, so it works from a static deploy with no proxy. Free tier is ~25 requests/day. Selected automatically when a key is set. |
| **Simulated** | `VITE_DATA_SOURCE=mock` | The original demo: fictional tickers on a deterministic seeded walk. Offline and repeatable, so the flip animation can be developed without a market. |

Quotes are cached per range in `sessionStorage`, a minute for intraday and hours for the
long ranges, so moving between screens does not refetch everything. Session storage rather
than local: a cached price should not outlive the tab and come back tomorrow looking
current.

Under `mock`, each fixture exercises a case: `ASCND` strongly up, `PLNGE` strongly down,
`FLATT` flat, `WHIPS` whipsawing intraday, `COPE` mildly down, `HODL` mildly up. Any
other ticker gets a stable invented history rather than an error.

### The day starts at the previous close

The 1D series is anchored to the previous session's close rather than the opening print,
the way a brokerage app measures "today". The overnight gap is real movement and belongs
in the number. It also puts the flip's fixed point on the previous close, so a mirrored
down day inverts the whole session instead of quietly keeping whatever was lost before
the opening bell.

### When real data cannot be fetched

The simulator is still the fallback, because an unreachable network should not empty the
screen, but a fabricated history under a real ticker is not the joke this app is making.
The flip is a lie it advertises, explains, and lets you undo with your thumb. An invented
AAPL is just a false claim about the world. So substituted data is labelled wherever it
appears: an amber **Simulated** chip on the holding row and the detail header, a line under
the portfolio total naming every symbol it affected, and a note in the accessible name of
the row. There is no comfort mode in which that label goes away.

## Running it

```bash
npm install
npm run dev
```

```bash
npm test        # 36 tests: the flip, the geometry, and the Yahoo parser
npm run build
```

## Stack

Vite, React, TypeScript, Tailwind, Framer Motion. The chart is hand-rolled inline SVG. The
flip is a coordinate transform, and a chart library would only get in the way of it.

Visually the app follows the Parabox Digital system: monochrome and dark first, hard
corners, hairline rules, generous negative space, Inter for text and JetBrains Mono for
every number. Direction is the only thing that earns colour, which suits an app whose
entire subject is a green line that should be red.

## What this is not

Not financial advice. Not a basis for any decision. The prices are real and the companies
are real, which makes the chart's editorialising more misleading rather than less: a green
line here is not evidence of anything about the company whose name sits above it.

Do not wire this to a real brokerage account, and do not show it to someone who does not
know what it does.
