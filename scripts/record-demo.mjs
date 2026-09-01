#!/usr/bin/env node
/**
 * Record demo/index.html to an H.264 file, headless.
 *
 * One command, no manual step:
 *
 *   npm run demo
 *
 * The page owns the timeline. This walks it one frame at a time and stops when the page
 * says it is finished — `window.__demo.done` — rather than after a wall-clock timeout,
 * so a slow machine produces the same video as a fast one instead of a truncated one.
 * Frames are captured deterministically rather than screen-grabbed in real time, so the
 * output is exactly 25 fps with nothing dropped.
 *
 * Environment:
 *   CHROMIUM_PATH  a Chromium/Chrome binary to use instead of Playwright's own
 *   FFMPEG_PATH    an ffmpeg binary to use instead of whatever is on PATH
 *
 * Flags:
 *   --out <file>    where to write the mp4        (default demo/alwaysup-demo.mp4)
 *   --keep-frames   leave the PNG sequence behind (default: deleted)
 *   --quiet         no per-frame progress
 */
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, rmSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from 'playwright-core'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const argv = process.argv.slice(2)
const flag = (name, fallback) => {
  const i = argv.indexOf(name)
  return i === -1 ? fallback : argv[i + 1]
}

const PAGE = resolve(ROOT, 'demo/index.html')
const OUT = resolve(ROOT, flag('--out', 'demo/alwaysup-demo.mp4'))
const FRAMES = resolve(ROOT, 'demo/.frames')
const KEEP = argv.includes('--keep-frames')
const QUIET = argv.includes('--quiet')

/* H.264 for LinkedIn: yuv420p so every player accepts it, CRF 20 for a clean dark UI,
   faststart so the moov atom is at the front and the video streams instead of having to
   download in full first, and no audio track at all — the captions are burned in. */
const ENCODE = (fps, tagColour) => [
  '-y', '-framerate', String(fps),
  '-i', `${FRAMES}/%06d.png`,
  /* The -color_* output options alone do not reach the container on every ffmpeg build;
     setparams does. Dropped on the retry if the filter is missing. */
  ...(tagColour ? ['-vf', 'setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709'] : []),
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '20',
  '-profile:v', 'high', '-level', '4.0',
  '-pix_fmt', 'yuv420p',
  '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
  '-r', String(fps),
  '-movflags', '+faststart',
  '-an',
  OUT,
]

/** Chromium, in order of preference: an explicit path, Playwright's, then the usual suspects. */
function chromiumPath() {
  const explicit = process.env.CHROMIUM_PATH?.trim()
  if (explicit) {
    if (!existsSync(explicit)) throw new Error(`CHROMIUM_PATH does not exist: ${explicit}`)
    return explicit
  }
  try {
    const p = chromium.executablePath()
    if (p && existsSync(p)) return p
  } catch { /* no browser installed for this Playwright build */ }
  const guesses = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  ]
  const hit = guesses.find((g) => existsSync(g))
  if (hit) return hit
  throw new Error('No Chromium found. Install one, or set CHROMIUM_PATH to a Chrome/Chromium binary.')
}

const run = (bin, args) =>
  new Promise((ok, fail) => {
    const p = spawn(bin, args, { stdio: QUIET ? ['ignore', 'ignore', 'pipe'] : 'inherit' })
    let err = ''
    p.stderr?.on('data', (d) => { err += d })
    p.on('error', (e) => fail(new Error(`${bin}: ${e.message}`)))
    p.on('close', (code) => (code === 0 ? ok() : fail(new Error(`${bin} exited ${code}\n${err.slice(-2000)}`))))
  })

const pad = (n) => String(n).padStart(6, '0')

async function main() {
  if (!existsSync(PAGE)) throw new Error(`Missing ${PAGE}`)
  const exe = chromiumPath()
  const ffmpeg = process.env.FFMPEG_PATH?.trim() || 'ffmpeg'

  rmSync(FRAMES, { recursive: true, force: true })
  mkdirSync(FRAMES, { recursive: true })
  mkdirSync(dirname(OUT), { recursive: true })

  console.log(`chromium  ${exe}`)
  console.log(`ffmpeg    ${ffmpeg}`)
  console.log(`page      ${PAGE}`)

  const browser = await chromium.launch({
    executablePath: exe,
    args: ['--force-color-profile=srgb', '--font-render-hinting=none', '--disable-lcd-text'],
  })
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    reducedMotion: 'no-preference',
  })

  const failures = []
  page.on('pageerror', (e) => failures.push(String(e)))
  page.on('requestfailed', (r) => failures.push(`request failed: ${r.url()}`))
  /* The page is meant to be self-contained. Anything leaving the machine is a bug. */
  page.on('request', (r) => {
    if (!r.url().startsWith('file:') && !r.url().startsWith('data:')) failures.push(`network call: ${r.url()}`)
  })

  await page.goto(pathToFileURL(PAGE).href, { waitUntil: 'load' })
  await page.waitForFunction('window.__demo && window.__demo.ready === true', null, { timeout: 30000 })

  const meta = await page.evaluate(() => {
    window.__demo.reset()
    const d = window.__demo
    return { fps: d.fps, totalFrames: d.totalFrames, seconds: d.seconds }
  })
  console.log(`plan      ${meta.totalFrames} frames @ ${meta.fps} fps = ${meta.seconds.toFixed(1)}s`)

  const started = Date.now()
  let n = 0
  /* Stop on the page's completion flag. The cap is only a runaway guard. */
  const CAP = 20000
  for (;;) {
    const state = await page.evaluate(() => window.__demo.next())
    await page.screenshot({ path: `${FRAMES}/${pad(state.frame)}.png`, type: 'png' })
    n = state.frame + 1
    if (!QUIET && (n % 25 === 0 || state.done)) {
      const pct = ((n / meta.totalFrames) * 100).toFixed(0)
      process.stdout.write(`\rframes    ${n}/${meta.totalFrames}  ${pct}%  ${state.scene ?? ''}            `)
    }
    if (state.done) break
    if (n >= CAP) throw new Error(`Ran past ${CAP} frames without the page reporting done.`)
  }
  process.stdout.write('\n')
  await browser.close()

  if (failures.length) {
    console.error('\nThe page is not self-contained, or it threw:')
    for (const f of [...new Set(failures)].slice(0, 20)) console.error('  ' + f)
    throw new Error('Refusing to encode a demo built from a page that failed.')
  }
  if (n < 2) throw new Error('The page produced no frames.')

  console.log(`capture   ${((Date.now() - started) / 1000).toFixed(1)}s`)
  try {
    await run(ffmpeg, ['-loglevel', 'error', '-stats', ...ENCODE(meta.fps, true)])
  } catch {
    console.warn('\nencode retrying without the colour-tagging filter')
    await run(ffmpeg, ['-loglevel', 'error', '-stats', ...ENCODE(meta.fps, false)])
  }
  if (!KEEP) rmSync(FRAMES, { recursive: true, force: true })

  const mb = (statSync(OUT).size / 1e6).toFixed(2)
  console.log(`\nwrote     ${OUT}`)
  console.log(`          1920x1080 · ${meta.fps} fps · ${meta.seconds.toFixed(1)}s · ${mb} MB · H.264 yuv420p · no audio`)
}

main().catch((e) => { console.error('\n' + e.message); process.exit(1) })
