/**
 * Swolomon's portrait (plan §1.11): sprite frames to terminal cells, the typewriter and mouth timeline, and
 * whether a portrait fits the band. Pure.
 */

import type { EntranceFrameName, FrameName, MiniFrameName, Sprite } from './swolomon-sprite'

export type Grid = (number | null)[][]
export type PortraitSize = 'full' | 'mini'
export type Fit = PortraitSize | 'none'
/** The frame the timeline asks for; a mini head shows its own version of it. */
export type Pose = 'idle' | 'talkA' | 'talkB' | 'blink' | 'flex' | 'glanceL' | 'glanceR' | 'lookYou' | 'wink' | 'smirk'

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
  const MINI = { idle: 'miniIdle', talkA: 'miniTalkA', talkB: 'miniTalkB', blink: 'miniBlink', flex: 'miniIdle', glanceL: 'miniGlanceL', glanceR: 'miniGlanceR', lookYou: 'miniIdle', wink: 'miniBlink', smirk: 'miniIdle' } as const
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
 * pushed out of the band's window, buttons included).
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
  if (wanted === 'full' && fits(sprite.width, sprite.height / 2)) return 'full'
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

/** One idle beat: a wait, then poses in turn, then back to idle. */
export type IdleBeat = { wait: number; steps: readonly { pose: Pose; ms: number }[] }

const BEATS: readonly { weight: number; steps: readonly { pose: Pose; ms: number }[]; isFullOnly?: true }[] = [
  { weight: 5, steps: [{ pose: 'blink', ms: BLINK_MS }] },
  { weight: 2, steps: [{ pose: 'blink', ms: BLINK_MS }, { pose: 'idle', ms: 120 }, { pose: 'blink', ms: BLINK_MS }] },
  { weight: 3, steps: [{ pose: 'glanceL', ms: 900 }] },
  { weight: 3, steps: [{ pose: 'glanceR', ms: 900 }] },
  // Looking around: who else is here?
  { weight: 2, steps: [{ pose: 'glanceL', ms: 500 }, { pose: 'glanceR', ms: 500 }, { pose: 'glanceL', ms: 350 }] },
  // The 4th wall: a deadpan stare out of the screen, at you; then the wink.
  { weight: 2, steps: [{ pose: 'lookYou', ms: 1400 }, { pose: 'wink', ms: 350 }], isFullOnly: true },
  { weight: 1, steps: [{ pose: 'lookYou', ms: 2200 }], isFullOnly: true },
  { weight: 2, steps: [{ pose: 'smirk', ms: 1200 }], isFullOnly: true },
]

/** The shortest and longest wait before a beat. */
export const IDLE_WAIT_MS = { min: 2500, max: 5500 } as const

/** The n-th idle beat: the same for the same n (tests and replays), varied from one to the next. */
export function idleBeat(n: number, size: PortraitSize): IdleBeat {
  const pool = BEATS.filter(beat => size === 'full' || beat.isFullOnly !== true)
  const total = pool.reduce((sum, beat) => sum + beat.weight, 0)
  const hash = (x: number) => ((Math.imul(x + 1, 2654435761) >>> 0) % 10007) / 10007
  let pick = hash(n * 2) * total
  const beat = pool.find(b => (pick -= b.weight) < 0) ?? pool[0]!
  return { wait: Math.round(IDLE_WAIT_MS.min + hash(n * 2 + 1) * (IDLE_WAIT_MS.max - IDLE_WAIT_MS.min)), steps: beat.steps }
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
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${grid.length}" shape-rendering="crispEdges">${rects.join('')}</svg>`
}
