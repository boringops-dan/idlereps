/**
 * Swolomon's portrait (plan §1.11): sprite frames to terminal cells, the typewriter and mouth timeline, and
 * whether a portrait fits the band. Pure.
 */

import type { LineId } from './copy'
import { IDLES } from './idles'
import { idleReps, moveById, movePlay } from './moves'
import { regularById, REGULARS, regularWalk } from './regulars'
import type { Regular } from './regulars'
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
 * A grid as `RasterProps.cells`: two pixel rows per cell row, `▄` with the bottom pixel as foreground and
 * the top as background. Not `▀`: a terminal whose line is taller than its font draws the block glyph a
 * little low, and the background shows above it, so `▀` put a strip of the bottom pixel's colour over the
 * top one (owner, 2026-10-07: his laurel read as two rows, his teeth as two); with `▄` that strip is the top
 * pixel's own colour. A transparent pixel must be the terminal's background, which only a cell's background
 * can be: so a cell with only its top pixel filled is `▀` in that colour, and one with neither is a space.
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
      if (bottom === null) {
        words[at] = top === null ? SPACE : UPPER_HALF
        words[at + 1] = top ?? DEFAULT_COLOUR
        words[at + 2] = DEFAULT_COLOUR
      } else {
        words[at] = LOWER_HALF
        words[at + 1] = bottom
        words[at + 2] = top ?? DEFAULT_COLOUR
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
    grid[y]![x] = glyph === UPPER_HALF ? colour(fg) : glyph === LOWER_HALF ? colour(bg) : null
    grid[y + 1]![x] = glyph === UPPER_HALF ? colour(bg) : glyph === LOWER_HALF ? colour(fg) : null
  }
  return grid
}

/**
 * Cells of him with his breath in: everything above the bottom cell row a pixel up into the clear top row,
 * the chest a pixel taller to meet it, so the bust stays planted on the frame's bottom edge and only his
 * head and shoulders rise (owner, 2026-10-07: lifting the whole of him read as a hop). A frame with no clear
 * top row (the mini head, filling its square) has nowhere to rise and is drawn as it is. Pure, cached by the caller.
 */
export function breathedIn(cells: string, columns: number): string {
  const parts = breathParts(decodeCells(cells, columns))
  if (parts === null) return cells
  const risen = [...parts.rising.slice(1), parts.rising[0]!.map(() => null)]
  return encodeCells(risen.map((row, y) => row.map((c, x) => c ?? parts.fill[y]![x] ?? parts.planted[y]![x] ?? null)))
}

/**
 * His breath in, in parts, for the terminal and the desktop film alike: what rises a pixel (all above his
 * bottom two rows), what stays planted (those two), and what closes the gap (the row above them, drawn again
 * a pixel up). Null for a frame with no clear top row to rise into.
 */
export function breathParts(grid: Grid): { rising: Grid; planted: Grid; fill: Grid } | null {
  const h = grid.length
  if (h < 4 || grid[0]!.some(c => c !== null)) return null
  const clear = (row: Grid[number]) => row.map(() => null)
  return {
    rising: grid.map((row, y) => (y < h - 2 ? row : clear(row))),
    planted: grid.map((row, y) => (y < h - 2 ? clear(row) : row)),
    fill: grid.map((row, y) => (y === h - 3 ? grid[h - 2]! : clear(row))),
  }
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

/** A regular walking past behind him (regulars.ts): who, where on their walk, and where his eyes are. */
export type Cameo = { who: string; walk: Walk; pose: Pose }

/**
 * One step of an idle beat: a pose of the bust, a place on a walk, one of his moves played through, a
 * regular passing behind him, or his word (an aside) on it.
 */
export type IdleStep =
  | { pose: Pose; ms: number }
  | { walk: Walk; ms: number }
  | { move: string; reps: number; ms: number }
  | { cameo: Cameo; ms: number }
  | { aside: LineId; ms: number }
  | { far: Far; ms: number }

/**
 * Him further back in the gym (owner, 2026-10-12: "let him get smaller too like he's walking into the back of
 * the gym to do his workouts"): a walk frame or a move's pose, drawn at `scale`, its left edge at `x` and its
 * feet on row `feet` (further back, higher up).
 */
export type Far = { src: { stride: 0 | 1 } | { approach: 0 | 1 } | { move: string; pose: number }; facing: 'left' | 'right'; scale: number; x: number; feet: number }

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

/**
 * A regular walking past behind him, one side to the other, his eyes following; then he names them. Their
 * walk is his stroll's pace; he is in front, so only what his square leaves open shows them.
 */
function cameo(regular: Regular, from: Walk['facing']): IdleStep[] {
  const facing = from === 'left' ? 'right' : 'left'
  const [start, end] = facing === 'right' ? [-16, 16] : [16, -16]
  const steps = walking(facing, start, end).flatMap(step => ('walk' in step ? [{ cameo: { who: regular.id, walk: step.walk, pose: eyesOn(step.walk.x) }, ms: step.ms }] : []))
  return [{ pose: from === 'left' ? 'glanceL' : 'glanceR', ms: 500 }, ...steps, { aside: regular.line, ms: 0 }, { pose: 'lookYou', ms: 900 }]
}

/** At the back of the gym: his size there, where his feet are, where he works out, how fast he walks there. */
const BACK = { scale: 0.5, feet: 12, x: 4, stepMs: 170 } as const

/** The full-body walk he crosses the back in: his strut's two strides nearest the middle (idles-b.ts), by stride. */
export const BACK_STRIDES = { move: 'strut', poses: [2, 3] } as const

/** Walking across the back from `from` to `to` (left edges), a pixel a step, the strides in turn. */
function backWalk(from: number, to: number): IdleStep[] {
  const dir = to > from ? 1 : -1
  const facing: Far['facing'] = dir > 0 ? 'right' : 'left'
  const steps: IdleStep[] = []
  for (let x = from, i = 0; dir > 0 ? x <= to : x >= to; x += dir, i += 1) {
    steps.push({ far: { src: { stride: Math.floor(i / 2) % 2 === 0 ? 0 : 1 }, facing, scale: BACK.scale, x, feet: BACK.feet }, ms: BACK.stepMs })
  }
  return steps
}

/** Walking straight at you, front on: his march's two steps (moves.ts), by step. */
export const APPROACH_STEPS = { move: 'march', poses: [0, 1] } as const

/** The walk up to you: how big he is and where his feet are, a step at a time, back of the gym to up close. */
const TO_YOU: readonly { scale: number; feet: number }[] = [
  { scale: 0.5, feet: 12 },
  { scale: 0.56, feet: 12 },
  { scale: 0.62, feet: 13 },
  { scale: 0.7, feet: 13 },
  { scale: 0.78, feet: 14 },
  { scale: 0.86, feet: 14 },
  { scale: 0.94, feet: 15 },
  { scale: 1, feet: 15 },
]

/**
 * Up to the camera (owner, 2026-10-12: "he can also be small and walk up to the camera"): he walks out of his
 * square, comes in small at the back, turns to you and walks straight up, bigger every step, till he is up
 * close again, looking at you.
 */
export function upToYou(side: 'left' | 'right'): IdleStep[] {
  const out = side === 'left' ? -16 : 16
  const edge = side === 'left' ? -8 : 16
  const toward: IdleStep[] = TO_YOU.map((at, i) => {
    const size = Math.round(16 * at.scale)
    return { far: { src: { approach: i % 2 === 0 ? 0 : 1 }, facing: 'right', scale: at.scale, x: Math.floor((16 - size) / 2), feet: at.feet }, ms: 260 }
  })
  return [turned(side, 300), ...walking(side, 0, out), ...backWalk(edge, BACK.x), ...toward, { pose: 'lookYou', ms: 900 }, { pose: 'wink', ms: 400 }]
}

/** At the back, how many reps of an exercise he does: a few, not the full set he does up close. */
const BACK_REPS = 6

/**
 * Off to the back of the gym (owner, 2026-10-12: "let swolomon like walk in and out of the set, and let him
 * get smaller too like he's walking into the back of the gym to do his workouts"): he walks out of his square,
 * comes in small at the back, does a few reps of `id` there, walks off, and comes back in up close.
 */
export function backOfGym(id: string, side: 'left' | 'right'): IdleStep[] {
  const move = moveById(id)
  if (move === undefined) return []
  const out = side === 'left' ? -16 : 16
  const back = side === 'left' ? 'right' : 'left'
  // Small, he is 8 wide: off the frame on his side, and in the middle of it.
  const edge = side === 'left' ? -8 : 16
  const reps = move.family === 'exercise' ? BACK_REPS : move.reps
  const working: IdleStep[] = movePlay(move, reps).map(([pose, ms]) => ({ far: { src: { move: id, pose }, facing: 'right', scale: BACK.scale, x: BACK.x, feet: BACK.feet }, ms }))
  return [
    turned(side, 300),
    ...walking(side, 0, out),
    ...backWalk(edge, BACK.x),
    ...working,
    ...backWalk(BACK.x, edge),
    ...walking(back, out, 0),
    turned(back, 250),
    { pose: 'lookYou', ms: 700 },
  ]
}

/**
 * A grid drawn smaller: each pixel of the result the commonest colour in the block of `src` it covers, so a
 * one-pixel limb survives; see-through only where the whole block is.
 */
export function shrunk(src: Grid, scale: number): Grid {
  const n = Math.max(1, Math.round(src.length * scale))
  const step = src.length / n
  return Array.from({ length: n }, (_, y) =>
    Array.from({ length: n }, (_, x) => {
      const counts = new Map<number, number>()
      for (let sy = Math.floor(y * step); sy < Math.max(Math.floor(y * step) + 1, Math.floor((y + 1) * step)); sy += 1) {
        for (let sx = Math.floor(x * step); sx < Math.max(Math.floor(x * step) + 1, Math.floor((x + 1) * step)); sx += 1) {
          const colour = src[sy]?.[sx] ?? null
          if (colour !== null) counts.set(colour, (counts.get(colour) ?? 0) + 1)
        }
      }
      return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
    }),
  )
}

/** Him further back: `src` (his walk frame or the move's pose, as drawn up close) shrunk and put in place. */
export function farGrid(src: Grid, far: Far, width = 16, height = 16): Grid {
  const facing = far.facing === 'right' ? src : src.map(row => [...row].reverse())
  const small = shrunk(facing, far.scale)
  const top = far.feet - small.length + 1
  return Array.from({ length: height }, (_, r) => Array.from({ length: width }, (_, c) => small[r - top]?.[c - far.x] ?? null))
}

/** His eyes on someone at x behind him: left of centre, glancing left; right of it, right. */
const eyesOn = (x: number): Pose => (x < 0 ? 'glanceL' : 'glanceR')

/** A beat's steps; none for a move beat, its move picked per beat from the moves given. */
type BeatDef = { weight: number; steps?: readonly IdleStep[]; isFullOnly?: true; isIdle?: true; isBack?: true }

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
  // Something of his own, from the first day: one of his idle animations (idles.ts).
  { weight: 6, isFullOnly: true, isIdle: true },
  // Off to the back of the gym for one of his moves (or idle animations), and back.
  { weight: 2, isFullOnly: true, isBack: true },
  // Off to the back, and straight up to you from there.
  { weight: 1.5, steps: upToYou('left'), isFullOnly: true },
  { weight: 1.5, steps: upToYou('right'), isFullOnly: true },
  // Now and then a regular walks past behind him (a few minutes apart, on average).
  ...REGULARS.map((regular, i) => ({ weight: 0.4, steps: cameo(regular, i % 2 === 0 ? 'left' : 'right'), isFullOnly: true as const })),
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
  // Doing it with you (or, with no move for it, cheering you on): most beats.
  { weight: 14, isFullOnly: true },
  // Doing it at the back of the gym, then back to watch you; or out of the frame for a moment and in again.
  { weight: 3, isFullOnly: true, isBack: true },
  { weight: 1, steps: stroll('left'), isFullOnly: true },
  { weight: 1, steps: stroll('right'), isFullOnly: true },
]

/** The shortest and longest wait before a beat. */
export const IDLE_WAIT_MS = { min: 2500, max: 5500 } as const

/** A number in [0, 1) for an integer: the same for the same x, scattered from one x to the next. */
export const hashUnit = (x: number): number => ((Math.imul(x + 1, 2654435761) >>> 0) % 10007) / 10007

/** The wait before the n-th idle beat: the same for the same n, whatever the beat. */
export const idleWait = (n: number, isWin = false): number =>
  isWin ? Math.round(IDLE_WAIT_MS.min + ((n * 997) % 2000)) : Math.round(IDLE_WAIT_MS.min + hashUnit(n * 2 + 1) * (IDLE_WAIT_MS.max - IDLE_WAIT_MS.min))

/** One of his moves as an idle step: an exercise as a full set (moves.ts idleReps), anything else as drawn. */
export function idleMoveStep(id: string): IdleStep {
  const move = moveById(id)
  return { move: id, reps: move === undefined ? 0 : idleReps(move), ms: 0 }
}

/**
 * How big he is in a step, his whole body's height over his square's: up close (his bust, the square cropped
 * to his head and shoulders) 2, his whole body 1, at the back less; null where he is off the frame, or for a
 * word.
 */
export function scaleOf(step: IdleStep): number | null {
  if ('aside' in step || isOffFrame(step)) return null
  if ('pose' in step || 'cameo' in step || 'walk' in step) return BUST_SCALE
  if ('move' in step) return 1
  return step.far.scale
}

/** Whether he has walked out of his square in a step: whatever size he comes back at, he walks in at it. */
export function isOffFrame(step: IdleStep): boolean {
  if ('walk' in step) return Math.abs(step.walk.x) >= 16
  if (!('far' in step)) return false
  const size = Math.round(16 * step.far.scale)
  return step.far.x + size <= 0 || step.far.x >= 16
}

/** His bust is his whole body twice over, cropped to his head and shoulders. */
export const BUST_SCALE = 2

/** The most he grows or shrinks from one frame to the next: past it, he walks there (a dolly). */
export const DOLLY_STEP = 0.2

/** A dolly step's length. */
export const DOLLY_MS = 180

/** Him front on, mid-stride, at `scale`, his head kept near the top: walking to or from you. */
export function dollyStep(scale: number, stride: 0 | 1): IdleStep {
  const size = Math.round(16 * scale)
  return { far: { src: { approach: stride }, facing: 'right', scale, x: Math.floor((16 - size) / 2), feet: size - 1 + Math.round(scale - 1) }, ms: DOLLY_MS }
}

/** Walking from `from` to `to` (scales), front on, the frames between, neither end. */
function dolly(from: number, to: number): IdleStep[] {
  const n = Math.ceil(Math.abs(to - from) / DOLLY_STEP) - 1
  return Array.from({ length: Math.max(0, n) }, (_, i) => dollyStep(Math.round((from + ((to - from) * (i + 1)) / (n + 1)) * 100) / 100, i % 2 === 0 ? 0 : 1))
}

/**
 * Steps that start and end up close, with a walk wherever he would jump in size (owner, 2026-10-12: "when he
 * flips scenes he should walk to the right framing portrait or full body or small"): up close to a move, he
 * steps back till his whole body shows; after it, he walks back up to you.
 */
export function framed(steps: readonly IdleStep[]): IdleStep[] {
  const out: IdleStep[] = []
  // His size last seen; none once he has walked off.
  let at: number | null = BUST_SCALE
  for (const step of [...steps, null]) {
    const scale = step === null ? BUST_SCALE : scaleOf(step)
    if (step !== null && isOffFrame(step)) at = null
    else if (scale !== null) {
      if (at !== null && Math.abs(scale - at) > DOLLY_STEP + 1e-9) out.push(...dolly(at, scale))
      at = scale
    }
    if (step !== null) out.push(step)
  }
  return out
}

/**
 * The n-th idle beat: the same for the same n (tests and replays), varied from one to the next. `moves` are
 * the moves he may do between lines (none: no move beats); a win only twinkles. He walks between framings.
 */
export function idleBeat(n: number, size: PortraitSize, isWin = false, moves: readonly string[] = [], mode: 'band' | 'set' = 'band'): IdleBeat {
  const beat = pickBeat(n, size, isWin, moves, mode)
  return { ...beat, steps: framed(beat.steps) }
}

function pickBeat(n: number, size: PortraitSize, isWin: boolean, moves: readonly string[], mode: 'band' | 'set'): IdleBeat {
  const wait = mode === 'set' ? Math.round(idleWait(n) * 0.6) : idleWait(n, isWin)
  if (isWin) return { wait, steps: TWINKLE, rest: 'flex' }
  const pool = (mode === 'set' ? SET_BEATS : BEATS).filter(
    beat => (size === 'full' || beat.isFullOnly !== true) && (beat.steps !== undefined || (beat.isIdle === true || beat.isBack === true ? IDLES.length > 0 || moves.length > 0 : moves.length > 0)),
  )
  const total = pool.reduce((sum, beat) => sum + beat.weight, 0)
  let pick = hashUnit(n * 2) * total
  const beat = pool.find(b => (pick -= b.weight) < 0) ?? pool[0]!
  if (beat.steps !== undefined) return { wait, steps: beat.steps, rest: 'idle' }
  // At the back: one of the moves given (a set's own), else an idle animation of his.
  if (beat.isBack === true) {
    const pool = moves.length > 0 ? moves : IDLES.map(move => move.id)
    return { wait, steps: backOfGym(pool[Math.floor(hashUnit(n * 5 + 3) * pool.length)]!, hashUnit(n * 7 + 1) < 0.5 ? 'left' : 'right'), rest: 'idle' }
  }
  const from = beat.isIdle === true ? IDLES.map(move => move.id) : moves
  return { wait, steps: [idleMoveStep(from[Math.floor(hashUnit(n * 3 + 7) * from.length)]!)], rest: 'idle' }
}

/**
 * A regular passing behind him: his frame for the pose in front, and their walk (regulars.ts), in the shade,
 * wherever his frame is see-through. `him` is the sprite he is drawn from (dressed or not); they are drawn from `base`.
 */
export function cameoGrid(him: Sprite, base: Sprite, step: Cameo): Grid {
  const regular = regularById(step.who)
  const front = decodeFrame(him, step.pose)
  if (regular === undefined) return front
  const rows = regularWalk(base, regular, step.walk.frame)
  const back = walkGrid({ ...base, frames: { ...base.frames, [step.walk.frame]: rows } }, step.walk)
  return front.map((row, r) => row.map((cell, c) => cell ?? dimmed(back[r]?.[c] ?? null)))
}

/** How bright the regulars are behind him: in the shade of the gym, so they never read as part of him. */
const BEHIND = 0.55

/** A colour in the shade (null stays see-through). */
const dimmed = (cell: number | null): number | null =>
  cell === null ? null : (Math.round(((cell >> 16) & 255) * BEHIND) << 16) | (Math.round(((cell >> 8) & 255) * BEHIND) << 8) | Math.round((cell & 255) * BEHIND)

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
