# AlwaysUp

A portfolio viewer that refuses to show you a loss.

When a position is up, the chart is green and the line climbs. When a position is down,
the chart is **mirrored** so the line climbs anyway. Same shape, same volatility, same
drama, opposite direction, and it stays green. The premise is that most of the damage
from checking your portfolio is emotional rather than financial, so this app removes the
emotion and leaves the rest alone.

Tell it what you paid and it comforts the number that actually hurts. A session is a bad
day; a position is the whole decision, and "down $2,018 since you bought" is the figure
people open the app to avoid. So the mirror is anchored on your cost, and the loss comes
back as a gain of exactly its own size.

It is a joke, and it never hides that. A badge in the header names the operation in force —
`Mirrored`, `Lifted`, `Delulu`, `Comfort` or `Honest` — so every screenshot carries what was
done to it, and it cannot be dismissed.

## The transform

Everything hinges on one line in [`src/lib/flip.ts`](src/lib/flip.ts):

```
p' = 2a - p
```

Reflect the series about a level `a`. The anchor is a fixed point, the shape of the
session is preserved exactly, and the direction inverts. A 6.37% slide becomes a visually
identical 6.37% climb.

Reflecting about a level that *means* something — the opening price, or the price you paid
— rather than about the mean or the plot's midline is what makes the lie coherent. Rescale
the y-axis to the reflected values and every tick label, high, and low lands on a number
that could plausibly have traded that day. The chart doesn't look tampered with; it looks
like a different, better day.

A useful property falls out of it: because the reflected series spans exactly the same
vertical distance as the original, its projection into pixels is an exact mirror of the
original's (`y' = plotHeight - y`), whatever the anchor. The flip animation is therefore a
true reflection, not an approximation. There's a test for it in
[`src/lib/geometry.test.ts`](src/lib/geometry.test.ts).

### Choosing the anchor

Once there is a cost basis there are two things that can be a loss, and one line to draw.
A reflection inverts *every* direction, so it cannot rescue a position that is underwater
on a day that is already green without spending the day's gain to do it. That case gets
the other isometry of a line — a translation:

| Position | Session | Transform | Why |
| --- | --- | --- | --- |
| up, or no basis | up | none | nothing on screen is a loss |
| up, or no basis | down | reflect about the open | the original transform |
| down | down | reflect about **your cost** | one reflection fixes the day and the P&L together |
| down | up | lift to clear your cost | the day is green already; a mirror would ruin it |

In every rescued case the last point lands on `2 * basis - last`, so the position shows a
gain of exactly the size of the real loss. Delulu rebuilds the series from damped deltas
and then lifts it the rest of the way if it has to.

### A lift is invisible, so the app says so instead

Every version is scaled to its own extent, which is what lets each one be drawn as if it
were the real price history. That normalises away anything that isn't a reflection: a
series moved up the axis projects to *exactly the same pixels* as the original, so a lift
changes the numbers and the tick labels and nothing else. Holding the two to one axis
would make it visible, at the cost of squashing the shape flat exactly when the lift is
largest — and the shape is the one thing this app never distorts. So the chart keeps the
shape, the badge reads `Lifted` rather than `Mirrored`, and a line under the chart names
the operation and the amount.

## Comfort levels

| Mode | Behaviour |
| --- | --- |
| **Honest** | No transform. Red is red. |
| **Comfort** | Losses are mirrored about what you paid, or about the open when you are still in profit. Gains are left alone. *(default)* |
| **Delulu** | Every chart ascends. Up moves pass through at full amplitude, down moves are folded upward and damped, so the line still has the texture of a market and never once loses ground — and it is lifted clear of your cost if it has to be. |

## The flip is the product, so you can play with it

A comfort app with no exit is just a lie, and a transform you can only glimpse is a claim
rather than a demonstration. So the flip is repeatable, interruptible and inspectable.

- **Tap any chart to flip it**, as many times as you like. It lands under-damped, so the
  line overshoots and settles instead of sliding politely into place.
- **Drag the mirror track** to stop the flip anywhere in between. Parked in the middle the
  line goes flat, and both versions fade up on either side of the axis they are mirrored
  about, with that axis drawn and labelled. When the anchor is your cost, break-even lands
  on that same line and the position reads exactly `+0.00`. This is the whole idea in one
  frame.
- **Press and hold** to peek at reality for exactly as long as you hold it, then let go and
  return to wherever you had parked the track.
- The track is a real range input, so arrow keys, Home and End scrub it and screen readers
  announce how far through the flip it is.
- Every figure above the chart morphs with the line. The price, the change, and your
  position's value and total return all roll continuously between the comforting number
  and the real one, sign included. Every one of them is read off the series that is
  actually drawn, so the screen can never disagree with itself about what you own.
- **Break-even is drawn** at the price you paid, on whichever axis is on screen, and it
  moves with the flip rather than jumping at the midpoint. It fades out when the price you
  paid is off the top or bottom of the plot, which is most intraday charts.
- On the portfolio screen, **Reveal all** flips every holding at once, and the total has its
  own flip button. Both latch, so nothing has to be held down.
- On load, a comforted chart draws the truth first, sits with it for ~400ms, then flips
  away from it, as if the app caught itself. Under `prefers-reduced-motion` it skips the
  reveal and opens on the comforted view, so the effect never becomes a jolt.
- A **mode badge** sits in the header on every screen and cannot be dismissed. It names the
  operation actually in force — `Mirrored`, `Lifted`, or `Comfort` when comfort mode is on and
  nothing on screen needed adjusting — and switches to `Showing reality` while a chart is
  flipped back. On the portfolio it reports the most severe thing happening anywhere on the
  screen. The label is terse; the full sentence is in its tooltip and its accessible name.
- A first-run disclosure has to be acknowledged before anything else renders, and it opens
  with a diagram of the reflection so the joke is legible before the app is.
- **Screen readers always get the real numbers.** Every chart carries an unmodified
  description of the actual price action and of your real profit or loss on it, and every
  holding row's accessible name states its real change and its real total return. The animated figures are `aria-hidden` with a static truthful summary
  beside them. The joke is visual only, and the accessibility layer never lies.

### Where the fold actually happens

In price space the reflection is about the anchor. In pixel space, once the y axis has
been rescaled to the reflected values, it becomes a reflection about the **plot's
horizontal midline**: `y' = 2·plot.y + plot.h - y`, whatever the anchor was. That is why
the mid-flip axis is drawn where it is, and why the morph passes through a perfectly flat
line. The axis is only drawn when the transform genuinely is a reflection: a lift has no
line it is folded about, and delulu rebuilds the series from damped deltas, so neither
gets to imply one.

The anchor is also the one price that sits at the same height in both frames once you
average them, which is why break-even meets the fold exactly half way through a flip
anchored on your cost. A lift gets the same beat for free: the line cannot move, but
break-even sweeps across it and reaches the last point at the half way mark — the moment
the position is worth precisely what it cost. Both are tested in
[`src/lib/geometry.test.ts`](src/lib/geometry.test.ts).

## Data

Real companies, real prices, out of the box. `npm run dev` and the default portfolio is
AAPL, MSFT, NVDA, TSLA, KO and SPY, pulled live. Real data does not make the app more
honest, since the chart still flips. It just means the thing being mirrored actually happened.

The share counts and entry prices in that starting portfolio are invented, and the entry
prices are the ones worth saying so about: the prices they are measured against are real,
so a demo position's profit or loss is a real comparison against a purchase that never
happened. They are set the way the simulator's fixtures are, to exercise the cases — some
of the portfolio is underwater and some is not, so all three transforms have something to
do on first run. Settings says they are made up, and one edit replaces any of them with
what you actually paid. Leave a cost blank and that holding is comforted about the session
only, exactly as the app worked before it could do this. Under `mock` the demo portfolio
buys a year ago at the price the simulator says was trading then, so even the fiction is
internally consistent.

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
npm test        # 77 tests: the transform, the geometry, the position, the numbers, the Yahoo parser
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
