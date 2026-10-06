/**
 * Swolomon's portrait (plan §1.11): sprite frames to terminal cells, the typewriter and mouth timeline, and
 * whether a portrait fits the band. Pure.
 */

import type { EntranceFrameName, FrameName, MiniFrameName, Sprite } from './swolomon-sprite'

export type Grid = (number | null)[][]
export type PortraitSize = 'full' | 'mini'
export type Fit = PortraitSize | 'none'
/** The frame the timeline asks for; a mini head shows its own version of it. */
export type Pose = 'idle' | 'talkA' | 'talkB' | 'blink' | 'flex' | 'flexB' | 'glanceL' | 'glanceR' | 'lookYou' | 'wink' | 'smirk'

/** A frame as rows of colours (null: transparent); throws naming the frame and row it cannot read. */
export function decodeFrame(sprite: Sprite, name: FrameName | MiniFrameName): Grid {
  const isMini = name.startsWith('mini')
  return decodeRows(sprite, sprite.frames[name], name, isMini ? sprite.miniSize : sprite.width, isMini ? sprite.miniSize : sprite.height)
}

/** Any rows of palette characters as colours, e.g. a move's pose; `name` says whose in an error. */
export function decodeRows(sprite: Sprite, rows: readonly string[], name: string, size: number, height: number): Grid {
  if (rows.length !== height) throw new Error(`frame ${name}: ${rows.length} rows, expected ${height}`)
  return rows.map((row, y) => {
    if (row.length !== size) throw new Error(`frame ${name}, row ${y}: ${row.length} pixels, expected ${size}`)
    return [...row].map(c => {
      if (!(c in sprite.palette)) throw new Error(`frame ${name}, row ${y}: no colour for "${c}"`)
      return sprite.palette[c] ?? null
    })
  })
}

const UPPER_HALF = 0x2580
const LOWER_HALF = 0x2584
const SPACE = 0x20
/** The terminal's own colour (RasterProps). */
const DEFAULT_COLOUR = 0x01000000

const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

export function toBase64(bytes: Uint8Array): string {
  let out = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i] ?? 0
    const b = bytes[i + 1] ?? 0
    const c = bytes[i + 2] ?? 0
    const n = (a << 16) | (b << 8) | c
    out += BASE64[(n >> 18) & 63] ?? ''
    out += BASE64[(n >> 12) & 63] ?? ''
    out += i + 1 < bytes.length ? (BASE64[(n >> 6) & 63] ?? '') : '='
    out += i + 2 < bytes.length ? (BASE64[n & 63] ?? '') : '='
  }
  return out
}

/**
 * A grid as `RasterProps.cells`: two pixel rows per cell row, `▀` with the top pixel as foreground and the
 * bottom as background. A transparent pixel must be the terminal's background, which only a cell's
 * background can be: so a cell with only its bottom pixel filled is `▄` in that colour, and one with
 * neither is a plain space.
 */
export function encodeCells(grid: Grid): string {
  const columns = grid[0]?.length ?? 0
  const rows = Math.ceil(grid.length / 2)
  const words = new Uint32Array(columns * rows * 3)
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < columns; x += 1) {
      const top = grid[y * 2]?.[x] ?? null
      const bottom = grid[y * 2 + 1]?.[x] ?? null
      const at = (y * columns + x) * 3
      if (top === null) {
        words[at] = bottom === null ? SPACE : LOWER_HALF
        words[at + 1] = bottom ?? DEFAULT_COLOUR
        words[at + 2] = DEFAULT_COLOUR
      } else {
        words[at] = UPPER_HALF
        words[at + 1] = top
        words[at + 2] = bottom ?? DEFAULT_COLOUR
      }
    }
  }
  // Little-endian u32s, whatever the host's byte order.
  const bytes = new Uint8Array(words.length * 4)
  words.forEach((word, i) => {
    bytes[i * 4] = word & 0xff
    bytes[i * 4 + 1] = (word >>> 8) & 0xff
    bytes[i * 4 + 2] = (word >>> 16) & 0xff
    bytes[i * 4 + 3] = (word >>> 24) & 0xff
  })
  return toBase64(bytes)
}

function fromBase64(text: string): Uint8Array {
  const clean = text.replace(/=+$/, '')
  const bytes = new Uint8Array(Math.floor((clean.length * 3) / 4))
  let at = 0
  for (let i = 0; i < clean.length; i += 4) {
    const n = [0, 1, 2, 3].reduce((acc, k) => (acc << 6) | Math.max(0, BASE64.indexOf(clean[i + k] ?? 'A')), 0)
    for (const shift of [16, 8, 0]) if (at < bytes.length) bytes[at++] = (n >> shift) & 0xff
  }
  return bytes
}

/** Encoded cells back to their pixels, `columns` wide: the inverse of `encodeCells`. */
export function decodeCells(cells: string, columns: number): Grid {
  const bytes = fromBase64(cells)
  const view = new DataView(bytes.buffer)
  const count = Math.floor(bytes.length / 12)
  const grid: Grid = []
  for (let i = 0; i < count; i += 1) {
    const x = i % columns
    const y = Math.floor(i / columns) * 2
    const glyph = view.getUint32(i * 12, true)
    const fg = view.getUint32(i * 12 + 4, true)
    const bg = view.getUint32(i * 12 + 8, true)
    grid[y] ??= []
    grid[y + 1] ??= []
    const colour = (c: number) => (c === DEFAULT_COLOUR ? null : c)
    grid[y]![x] = glyph === UPPER_HALF ? colour(fg) : null
    grid[y + 1]![x] = glyph === UPPER_HALF ? colour(bg) : glyph === LOWER_HALF ? colour(fg) : null
  }
  return grid
}

/** Cells of him a pixel up, his breath in: the top row off, a clear row under. Pure, cached by the caller. */
export function breathedIn(cells: string, columns: number): string {
  const grid = decodeCells(cells, columns)
  return encodeCells([...grid.slice(1), new Array<number | null>(columns).fill(null)])
}

/** The breath's half: in for this long, out for this long (the desktop film's too). */
export const BREATH_HALF_MS = 1200

/** Encoded cells with their colours swapped by `map` (a colour it does not name stays): the shiny Swolomon. */
export function recolour(cells: string, map: ReadonlyMap<number, number>): string {
  const bytes = fromBase64(cells)
  const view = new DataView(bytes.buffer)
  for (let at = 0; at + 12 <= bytes.length; at += 12) {
    for (const offset of [4, 8]) {
      const swapped = map.get(view.getUint32(at + offset, true))
      if (swapped !== undefined) view.setUint32(at + offset, swapped, true)
    }
  }
  return toBase64(bytes)
}

/** A move's poses (moves.ts) as full-portrait cells, encoded once per load. */
export function encodeMove(sprite: Sprite, id: string, poses: readonly (readonly string[])[]): string[] {
  return poses.map((rows, i) => encodeCells(decodeRows(sprite, rows, `${id} pose ${i}`, sprite.width, sprite.height)))
}

/** The tiny Swolomon's poses (figure.ts `drawMicro`, 8 × 6 pixels) as cells, encoded once per load. */
export function encodeMicro(sprite: Sprite, id: string, poses: readonly (readonly string[])[], width: number, height: number): string[] {
  return poses.map((rows, i) => encodeCells(decodeRows(sprite, rows, `${id} tiny pose ${i}`, width, height)))
}

/** Every frame of the sprite, encoded once. */
export function encodeSprite(sprite: Sprite): Record<FrameName | MiniFrameName, string> {
  const names = Object.keys(sprite.frames) as (FrameName | MiniFrameName)[]
  return Object.fromEntries(names.map(name => [name, encodeCells(decodeFrame(sprite, name))])) as Record<FrameName | MiniFrameName, string>
}

/** The frame a size draws for a pose: the mini head has no flex. */
export function frameFor(size: PortraitSize, pose: Pose): FrameName | MiniFrameName {
  if (size === 'full') return pose
  const MINI = { idle: 'miniIdle', talkA: 'miniTalkA', talkB: 'miniTalkB', blink: 'miniBlink', flex: 'miniIdle', flexB: 'miniIdle', glanceL: 'miniGlanceL', glanceR: 'miniGlanceR', lookYou: 'miniIdle', wink: 'miniBlink', smirk: 'miniIdle' } as const
  return MINI[pose]
}

/** How big a portrait is in cells. */
export const portraitCells = (sprite: Sprite, size: PortraitSize) =>
  size === 'full' ? { columns: sprite.width, rows: sprite.height / 2 } : { columns: sprite.miniSize, rows: sprite.miniSize / 2 }

/** Columns between a portrait and its text. */
export const PORTRAIT_GAP = 2

/**
 * Which portrait a band draws (§1.11 Fit): only on the terminal, only approved art, never taller than the
 * band may be, and only when the widest text row still fits beside it without wrapping (so no row is ever
 * pushed out of the band's window, buttons included). Any band with a portrait gets the full one when it
 * fits (owner, 2026-10-06: "if I have the width space, then I'd like the full Swolomon"); the mini head is
 * the fallback, not a size a band asks for.
 */
export function fitPortrait(opts: {
  wanted: Fit
  surface: string
  approved: boolean
  maxRows: number
  bodyColumns: number
  bandRows: number
  textColumns: number
  sprite: Pick<Sprite, 'width' | 'height' | 'miniSize'>
}): Fit {
  const { wanted, surface, approved, maxRows, bodyColumns, bandRows, textColumns, sprite } = opts
  if (wanted === 'none' || surface !== 'terminal' || !approved) return 'none'
  const fits = (columns: number, rows: number) => maxRows >= Math.max(rows, bandRows) && bodyColumns >= columns + PORTRAIT_GAP + textColumns
  if (fits(sprite.width, sprite.height / 2)) return 'full'
  if (bandRows >= sprite.miniSize / 2 && fits(sprite.miniSize, sprite.miniSize / 2)) return 'mini'
  return 'none'
}

// ---------------------------------------------------------------------------------------------------------
// The typewriter (§1.11 Animation): 50 characters a second, a 200 ms hold where a sentence ends and 100 ms
// after a comma or colon, 400 ms between lines, so the five-line introduction takes about 11 s; the mouth
// alternates every 100 ms while revealing and rests through holds.

export const CHAR_MS = 20
export const HOLD_MS = 200
export const PAUSE_MS = 100
export const LINE_PAUSE_MS = 400
export const MOUTH_MS = 100
export const BLINK_MS = 150
export const TICK_MS = 50

const ENDS = new Set(['.', '?', '!'])
const PAUSES = new Set([',', ':'])

export type Timeline = {
  /** When each character of each line appears, in ms from the start. */
  at: number[][]
  /** When the last character appears. */
  doneAt: number
}

export function timelineOf(lines: readonly string[]): Timeline {
  let t = 0
  const at = lines.map((text, i) => {
    if (i > 0) t += LINE_PAUSE_MS
    const chars = [...text]
    return chars.map((c, j) => {
      t += CHAR_MS
      const shownAt = t
      // Only where a clause really ends: "..." holds once, after its last dot.
      const isBreak = j + 1 === chars.length || chars[j + 1] === ' '
      if (isBreak && ENDS.has(c)) t += HOLD_MS
      else if (isBreak && PAUSES.has(c)) t += PAUSE_MS
      return shownAt
    })
  })
  const last = at.flat().at(-1) ?? 0
  return { at, doneAt: last }
}

export type Frame = { shown: number[]; pose: Pose; isDone: boolean }

/** What is revealed at `t` ms and which pose the mouth is in; a win holds the flex once its line is out. */
export function frameAt(timeline: Timeline, t: number, isWin: boolean): Frame {
  const shown = timeline.at.map(times => times.filter(when => when <= t).length)
  if (t >= timeline.doneAt) return { shown, pose: isWin ? 'flex' : 'idle', isDone: true }
  // Talking while the next character is due within one character's time; otherwise holding.
  const next = timeline.at.flat().find(when => when > t) ?? t
  const isHolding = next - t > CHAR_MS
  const pose: Pose = isHolding ? 'idle' : Math.floor(t / MOUTH_MS) % 2 === 0 ? 'talkA' : 'talkB'
  return { shown, pose, isDone: false }
}

// ---------------------------------------------------------------------------------------------------------
// Idling (owner, 2026-10-03: "keep Swolomon blinking and moving around a little as he idles ... looking
// around through the 4th wall"): once his line is out, a beat every few seconds while the band shows.

/** Where he is in his square while walking: the profile frame, which way, and its left edge and bob. */
export type Walk = { frame: 'walkA' | 'walkB'; facing: 'left' | 'right'; x: number; y: number }

/** One step of an idle beat: a pose of the bust, a place on a walk, or one of his moves played through. */
export type IdleStep = { pose: Pose; ms: number } | { walk: Walk; ms: number } | { move: string; ms: number }

/** One idle beat: a wait, then its steps in turn, then back to rest (idle, or the flex on a win). */
export type IdleBeat = { wait: number; steps: readonly IdleStep[]; rest: Pose }

/** On a win he holds the flex, and its sparkles twinkle. */
const TWINKLE: readonly IdleStep[] = [
  { pose: 'flexB', ms: 300 },
  { pose: 'flex', ms: 300 },
  { pose: 'flexB', ms: 300 },
]

const turned = (facing: Walk['facing'], ms: number): IdleStep => ({ walk: { frame: 'walkA', facing, x: 0, y: 0 }, ms })

/** Walking `from` to `to` (left edges), two pixels a step, the stride and the bob changing every other step. */
function walking(facing: Walk['facing'], from: number, to: number): IdleStep[] {
  const steps: IdleStep[] = []
  const dir = to > from ? 2 : -2
  for (let x = from, i = 0; dir > 0 ? x <= to : x >= to; x += dir, i += 1) {
    const isB = Math.floor(i / 2) % 2 === 1
    steps.push({ walk: { frame: isB ? 'walkB' : 'walkA', facing, x, y: isB ? -1 : 0 }, ms: WALK_IDLE_STEP_MS })
  }
  return steps
}

/** A walk's pace in his square: slower than the entrance's, a stroll. */
export const WALK_IDLE_STEP_MS = 90

/** Off for a bit, then back: out one side, a moment away, in again facing the way he went. */
function stroll(side: Walk['facing']): IdleStep[] {
  const far = side === 'left' ? -16 : 16
  const back = side === 'left' ? 'right' : 'left'
  return [turned(side, 300), ...walking(side, 0, far), { walk: { frame: 'walkA', facing: side, x: far, y: 0 }, ms: 700 }, ...walking(back, far, 0), turned(back, 250)]
}

/** A beat's steps; none for a move beat, its move picked per beat from the moves given. */
type BeatDef = { weight: number; steps?: readonly IdleStep[]; isFullOnly?: true }

const BEATS: readonly BeatDef[] = [
  { weight: 5, steps: [{ pose: 'blink', ms: BLINK_MS }] },
  { weight: 2, steps: [{ pose: 'blink', ms: BLINK_MS }, { pose: 'idle', ms: 120 }, { pose: 'blink', ms: BLINK_MS }] },
  { weight: 3, steps: [{ pose: 'glanceL', ms: 900 }] },
  { weight: 3, steps: [{ pose: 'glanceR', ms: 900 }] },
  // Looking around: who else is here?
  { weight: 2, steps: [{ pose: 'glanceL', ms: 500 }, { pose: 'glanceR', ms: 500 }, { pose: 'glanceL', ms: 350 }] },
  // Turning his head to the side, then the other side.
  { weight: 2, steps: [turned('right', 1000)], isFullOnly: true },
  { weight: 2, steps: [turned('left', 1000)], isFullOnly: true },
  { weight: 2, steps: [turned('left', 700), { pose: 'idle', ms: 200 }, turned('right', 700)], isFullOnly: true },
  // The 4th wall: a deadpan stare out of the screen, at you; then the wink.
  { weight: 2, steps: [{ pose: 'lookYou', ms: 1400 }, { pose: 'wink', ms: 350 }], isFullOnly: true },
  { weight: 1, steps: [{ pose: 'lookYou', ms: 2200 }], isFullOnly: true },
  { weight: 2, steps: [{ pose: 'smirk', ms: 1200 }], isFullOnly: true },
  // A stroll out of his square and back.
  { weight: 2, steps: stroll('left'), isFullOnly: true },
  { weight: 2, steps: stroll('right'), isFullOnly: true },
  // A few reps of something, right there: one of his moves.
  { weight: 3, isFullOnly: true },
]

/**
 * While you do a set (owner, 2026-10-06: "encouraging them, watching their form, flexing himself"): mostly
 * watching you, approving, and doing the set with you or flexing; blinking throughout.
 */
const SET_BEATS: readonly BeatDef[] = [
  { weight: 4, steps: [{ pose: 'blink', ms: BLINK_MS }] },
  { weight: 1, steps: [{ pose: 'blink', ms: BLINK_MS }, { pose: 'idle', ms: 120 }, { pose: 'blink', ms: BLINK_MS }] },
  { weight: 1, steps: [{ pose: 'glanceL', ms: 600 }] },
  { weight: 1, steps: [{ pose: 'glanceR', ms: 600 }] },
  // Watching your form, then approving of it.
  { weight: 4, steps: [{ pose: 'lookYou', ms: 1600 }], isFullOnly: true },
  { weight: 3, steps: [{ pose: 'lookYou', ms: 900 }, { pose: 'smirk', ms: 900 }], isFullOnly: true },
  { weight: 2, steps: [{ pose: 'lookYou', ms: 1000 }, { pose: 'wink', ms: 350 }], isFullOnly: true },
  // Doing it with you, or flexing at you.
  { weight: 6, isFullOnly: true },
]

/** The shortest and longest wait before a beat. */
export const IDLE_WAIT_MS = { min: 2500, max: 5500 } as const

/** A number in [0, 1) for an integer: the same for the same x, scattered from one x to the next. */
export const hashUnit = (x: number): number => ((Math.imul(x + 1, 2654435761) >>> 0) % 10007) / 10007

/** The wait before the n-th idle beat: the same for the same n, whatever the beat. */
export const idleWait = (n: number, isWin = false): number =>
  isWin ? Math.round(IDLE_WAIT_MS.min + ((n * 997) % 2000)) : Math.round(IDLE_WAIT_MS.min + hashUnit(n * 2 + 1) * (IDLE_WAIT_MS.max - IDLE_WAIT_MS.min))

/**
 * The n-th idle beat: the same for the same n (tests and replays), varied from one to the next. `moves` are
 * the moves he may do between lines (none: no move beats); a win only twinkles.
 */
export function idleBeat(n: number, size: PortraitSize, isWin = false, moves: readonly string[] = [], mode: 'band' | 'set' = 'band'): IdleBeat {
  const wait = mode === 'set' ? Math.round(idleWait(n) * 0.6) : idleWait(n, isWin)
  if (isWin) return { wait, steps: TWINKLE, rest: 'flex' }
  const pool = (mode === 'set' ? SET_BEATS : BEATS).filter(beat => (size === 'full' || beat.isFullOnly !== true) && (beat.steps !== undefined || moves.length > 0))
  const total = pool.reduce((sum, beat) => sum + beat.weight, 0)
  let pick = hashUnit(n * 2) * total
  const beat = pool.find(b => (pick -= b.weight) < 0) ?? pool[0]!
  return { wait, steps: beat.steps ?? [{ move: moves[Math.floor(hashUnit(n * 3 + 7) * moves.length)]!, ms: 0 }], rest: 'idle' }
}

/** The 16 × 16 square with him walking in it: in profile, facing either way, wherever the walk has him. */
export function walkGrid(sprite: Sprite, walk: Walk): Grid {
  const frame = decodeFrame(sprite, walk.frame)
  const src = walk.facing === 'right' ? frame : frame.map(row => [...row].reverse())
  return Array.from({ length: sprite.height }, (_, r) =>
    Array.from({ length: sprite.width }, (_, c) => src[r - walk.y]?.[c - walk.x] ?? null),
  )
}

// ---------------------------------------------------------------------------------------------------------
// The entrance (§1.11 Entrance): on the introduction, Swolomon walks past the band in profile as if crossing
// the shot, stops, turns to us with a start, then scurries back to the portrait's place and starts talking.
// The stage is the band's rows less the buttons, so the band is never taller than the portrait's 8 rows;
// the walk crops the shoulders, as a frame crops someone passing through it.

/** Cell rows of the stage: the full portrait's 8 less the buttons' row. */
export const STAGE_ROWS = 7
/** Where the walk stops: far enough across to have been passing by. */
export const STOP_X = 30
/** Cell columns of the stage: the walk, the stop, and the "!" beside the head. */
export const STAGE_COLUMNS = STOP_X + 16 + 4

export const WALK_STEP_MS = 30
export const STRIDE_STEPS = 4
export const STOP_MS = 200
export const NOTICE_MS = 700
export const HOP_MS = 120
export const GRIN_MS = 250
export const SCURRY_STEP_MS = 18
export const SETTLE_MS = 150

const WALK_STEPS = STOP_X + 16
const WALK_MS = WALK_STEPS * WALK_STEP_MS
const SCURRY_MS = STOP_X * SCURRY_STEP_MS
/** The whole entrance, from the first step in to the first character of the line. */
export const ENTRANCE_MS = WALK_MS + STOP_MS + NOTICE_MS + GRIN_MS + SCURRY_MS + SETTLE_MS

export type EntranceFrame = {
  /** The sprite's left edge in stage columns; negative is still off the stage. */
  x: number
  /** The sprite's top in pixel rows: -1 is a step's bob or a hop. */
  y: number
  frame: EntranceFrameName | 'idle'
  /** The "!" beside the head. */
  isBang: boolean
  isDone: boolean
}

/** Where Swolomon is `t` ms into the entrance. */
export function entranceAt(t: number): EntranceFrame {
  let rest = Math.max(0, t)
  if (rest < WALK_MS) {
    const step = Math.floor(rest / WALK_STEP_MS)
    const isB = Math.floor(step / STRIDE_STEPS) % 2 === 1
    return { x: step - 16, y: isB ? -1 : 0, frame: isB ? 'walkB' : 'walkA', isBang: false, isDone: false }
  }
  rest -= WALK_MS
  if (rest < STOP_MS) return { x: STOP_X, y: 0, frame: 'walkA', isBang: false, isDone: false }
  rest -= STOP_MS
  if (rest < NOTICE_MS) return { x: STOP_X, y: rest < HOP_MS ? -1 : 0, frame: 'notice', isBang: true, isDone: false }
  rest -= NOTICE_MS
  if (rest < GRIN_MS) return { x: STOP_X, y: 0, frame: 'idle', isBang: false, isDone: false }
  rest -= GRIN_MS
  if (rest < SCURRY_MS) {
    const step = Math.floor(rest / SCURRY_STEP_MS)
    return { x: STOP_X - step, y: Math.floor(step / 3) % 2 === 1 ? -1 : 0, frame: 'idle', isBang: false, isDone: false }
  }
  return { x: 0, y: 0, frame: 'idle', isBang: false, isDone: rest - SCURRY_MS >= SETTLE_MS }
}

/** The "!": a gold stroke and dot, one column right of the sprite. */
const BANG_COLOUR = 0xfad048
const BANG_ROWS = [0, 1, 2, 4]

/** The stage at one moment, as pixel rows (`STAGE_ROWS × 2` of `STAGE_COLUMNS`); the sprite is clipped to it. */
export function stageGrid(sprite: Sprite, at: Pick<EntranceFrame, 'x' | 'y' | 'frame' | 'isBang'>): Grid {
  const grid: Grid = Array.from({ length: STAGE_ROWS * 2 }, () => new Array<number | null>(STAGE_COLUMNS).fill(null))
  const put = (x: number, y: number, colour: number | null) => {
    const row = grid[y]
    if (colour !== null && row !== undefined && x >= 0 && x < STAGE_COLUMNS) row[x] = colour
  }
  decodeFrame(sprite, at.frame).forEach((row, y) => row.forEach((colour, x) => put(at.x + x, at.y + y, colour)))
  if (at.isBang) for (const y of BANG_ROWS) put(at.x + sprite.width + 1, at.y + y, BANG_COLOUR)
  return grid
}

/** The stage's cells at `t` ms into the entrance. */
export const stageCells = (sprite: Sprite, t: number) => encodeCells(stageGrid(sprite, entranceAt(t)))

// ---------------------------------------------------------------------------------------------------------
// The portrait where there are no terminal cells (the desktop app, VS Code): the same pixels as an SVG.

/** Pixels of the SVG portrait per sprite pixel, by size: 64 px across full, 32 px for the mini head. */
export const SVG_PIXELS = { full: 4, mini: 32 / 6 } as const

const hex = (colour: number) => `#${colour.toString(16).padStart(6, '0')}`

/** A frame as an SVG document: one rect per run of same-coloured pixels in a row, crisp edges. */
export function svgOf(sprite: Sprite, name: FrameName | MiniFrameName): string {
  const grid = decodeFrame(sprite, name)
  const width = grid[0]?.length ?? 0
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${grid.length}" shape-rendering="crispEdges">${rectsOf(grid)}</svg>`
}

/** A grid's pixels as SVG rects, one per run of a colour along a row. */
export function rectsOf(grid: Grid): string {
  const rects: string[] = []
  grid.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      const colour = row[x] ?? null
      let end = x + 1
      while (end < row.length && row[end] === colour) end += 1
      if (colour !== null) rects.push(`<rect x="${x}" y="${y}" width="${end - x}" height="1" fill="${hex(colour)}"/>`)
      x = end
    }
  })
  return rects.join('')
}
