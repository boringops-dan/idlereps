/**
 * Copyright 2026 Orange Specs Mobile Labs. All rights reserved: not covered by the Apache License (see NOTICE). Swolomon's
 * name, character, likeness and these drawings are proprietary.
 *
 * His seasons (owner, 2026-10-06: "more Swolomon"): on the days that have them he dresses for it (a witch
 * hat, a Santa hat, a party hat on his birthday) and says so. An outfit is pixel overlays on his portrait,
 * his walk, his figure's head and the mini head: `.` keeps what is under it, `_` clears it. Pure.
 */

import type { LineId } from './copy'
import type { Sprite } from './swolomon-sprite'

/** Rows stamped at (x, y) of a frame. */
export type Overlay = { rows: readonly string[]; x: number; y: number }

export type Outfit = {
  id: string
  /** The full portrait, front-on (every bust frame). */
  portrait: Overlay
  /** The walk, in profile facing right (mirrored with it). */
  profile: Overlay
  /** The figure's 6 × 6 head (moves), from its top-left; also the mini head. */
  head: Overlay
  /** The figure's head in profile, facing right. */
  headProfile: Overlay
}

export type Season = { id: string; outfit: Outfit; greeting: LineId; banter: LineId }

const PARTY: Outfit = {
  id: 'party',
  portrait: { rows: ['.......g........', '......ubu.......', '.....ububu......'], x: 0, y: 0 },
  profile: { rows: ['........g.......', '.......ubu......', '......ububu.....'], x: 0, y: 0 },
  head: { rows: ['..g...', '.ubu..'], x: 0, y: -1 },
  headProfile: { rows: ['...g..', '..ubu.'], x: 0, y: -1 },
}

/**
 * Halloween (owner, 2026-10-06: "he should dress up as an AI agent for Halloween but still not know what it
 * is"): his idea of one. A spy's shades and earpiece, a robot's antenna, a suit and tie; laurel off.
 */
const AGENT: Outfit = {
  id: 'agent',
  portrait: {
    rows: [
      '.......r........',
      '.......I........',
      '___....I.....___',
      '___hhhhhhhhhh___',
      '................',
      '................',
      '....kkkkkkkk....',
      '.............k..',
      '.............I..',
      '..............I.',
      '.............I..',
      '................',
      '..nnnnwrrwnnnn..',
      '.nnnnnwrrwnnnnn.',
      'nnnnnnwrrwnnnnnn',
      'nnnnnnwwrwnnnnnn',
    ],
    x: 0,
    y: 0,
  },
  profile: {
    rows: [
      '........r.......',
      '........I.......',
      '............h...',
      '..hhhhhhhhhhhh..',
      '................',
      '................',
      '..........kkkk..',
      '...k............',
      '...I............',
      '................',
      '................',
      '................',
      '......nnnnn.....',
      '....nnnwrnnn....',
      '...nnnnwrnnnn...',
      '...nnnnwrnnnnn..',
    ],
    x: 0,
    y: 0,
  },
  head: { rows: ['..r...', '..I...', '......', 'hhhhhh', 'kkkkkk'], x: 0, y: -2 },
  headProfile: { rows: ['...r..', '...I..', '......', 'hhhhhh', '..kkkk'], x: 0, y: -2 },
}

const SANTA: Outfit = {
  id: 'santa',
  portrait: { rows: ['......rrrrrrR.ww', '.....rrrrrrrrRww', '__.rrrrrrrrrrR__', '__wwwwwwwwwwww__'], x: 0, y: 0 },
  profile: { rows: ['ww.Rrrrrrr......', 'wwRrrrrrrrr.....', '..Rrrrrrrrrrr...', '..wwwwwwwwwwww..'], x: 0, y: 0 },
  head: { rows: ['.rrrRw', '.rrrr.', 'wwwwww'], x: 0, y: -1 },
  headProfile: { rows: ['wRrrr.', '.rrrr.', 'wwwwww'], x: 0, y: -1 },
}

const LEPRECHAUN: Outfit = {
  id: 'leprechaun',
  portrait: { rows: ['....vvvvvvvV....', '....vvvvvvvV....', '__..kkkgkkkk..__', '_vvvvvvvvvvvvvV_'], x: 0, y: 0 },
  profile: { rows: ['.....vvvvvvV....', '.....vvvvvvV....', '...kkkkgkkkk....', '..vvvvvvvvvvvV..'], x: 0, y: 0 },
  head: { rows: ['.vvvV.', '.kgkk.', 'vvvvvV'], x: 0, y: -1 },
  headProfile: { rows: ['.vvvV.', '.kkgk.', 'vvvvvV'], x: 0, y: -1 },
}

const HEARTS: Outfit = {
  id: 'hearts',
  // A heart over his head, and blushing.
  portrait: { rows: ['.....rr.rr......', '.....rrrrr......', '......rrr.......', '................', '................', '................', '................', '...uu......uu...'], x: 0, y: 0 },
  profile: { rows: ['......rr.rr.....', '......rrrrr.....', '.......rrr......', '................', '................', '................', '................', '...........uu...'], x: 0, y: 0 },
  head: { rows: ['u....u'], x: 0, y: 3 },
  headProfile: { rows: ['....u.'], x: 0, y: 3 },
}

const DISGUISE: Outfit = {
  id: 'disguise',
  // Nose-and-glasses: rims over his eyes (the eyes still show through), a big nose, a moustache.
  portrait: { rows: ['....kkk..kkk....', '....k.kkkk.k....', '......SSSS......', '....hhhhhhhh....'], x: 0, y: 5 },
  profile: { rows: ['..........kkkk..', '..........k.kk..', '............SSS.', '.........hhhhh..'], x: 0, y: 5 },
  head: { rows: ['kkkkkk', '..SS..'], x: 0, y: 2 },
  headProfile: { rows: ['...kkk', '....SS'], x: 0, y: 2 },
}

/** The calendar, in order of precedence where two overlap: [month 1–12, first day, last day]. */
const CALENDAR: readonly { season: Season; from: readonly [number, number]; to: readonly [number, number] }[] = [
  { season: { id: 'birthday', outfit: PARTY, greeting: 'season-birthday', banter: 'season-birthday-banter' }, from: [10, 20], to: [10, 20] },
  { season: { id: 'halloween', outfit: AGENT, greeting: 'season-halloween', banter: 'season-halloween-banter' }, from: [10, 24], to: [10, 31] },
  { season: { id: 'new-year', outfit: PARTY, greeting: 'season-new-year', banter: 'season-new-year-banter' }, from: [12, 31], to: [1, 2] },
  { season: { id: 'winter', outfit: SANTA, greeting: 'season-winter', banter: 'season-winter-banter' }, from: [12, 18], to: [12, 26] },
  { season: { id: 'valentines', outfit: HEARTS, greeting: 'season-valentines', banter: 'season-valentines-banter' }, from: [2, 13], to: [2, 14] },
  { season: { id: 'st-patricks', outfit: LEPRECHAUN, greeting: 'season-st-patricks', banter: 'season-st-patricks-banter' }, from: [3, 16], to: [3, 17] },
  { season: { id: 'april-fools', outfit: DISGUISE, greeting: 'season-april-fools', banter: 'season-april-fools-banter' }, from: [4, 1], to: [4, 1] },
]

export const SEASONS: readonly Season[] = CALENDAR.map(entry => entry.season)

/** A local day number's month (1–12) and day of the month. */
export function monthDayOf(day: number): [number, number] {
  const date = new Date(day * 86_400_000)
  return [date.getUTCMonth() + 1, date.getUTCDate()]
}

/** Whether month/day falls in from..to (inclusive), across the new year when to is before from. */
function isWithin(md: readonly [number, number], from: readonly [number, number], to: readonly [number, number]): boolean {
  const n = (x: readonly [number, number]) => x[0] * 100 + x[1]
  return n(from) <= n(to) ? n(md) >= n(from) && n(md) <= n(to) : n(md) >= n(from) || n(md) <= n(to)
}

/** The season a local day is in, or null. */
export function seasonOf(day: number): Season | null {
  const md = monthDayOf(day)
  return CALENDAR.find(entry => isWithin(md, entry.from, entry.to))?.season ?? null
}

/** The day the season `day` is in began (a once-a-season mark keys on it); `day` itself out of season. */
export function seasonBeganOn(day: number): number {
  const id = seasonOf(day)?.id
  let first = day
  while (id !== undefined && seasonOf(first - 1)?.id === id) first -= 1
  return first
}

/** Rows with an overlay stamped on: `.` keeps, `_` clears, anything else paints; off the edge is dropped. */
export function overlaid(rows: readonly string[], overlay: Overlay): string[] {
  const width = rows[0]?.length ?? 0
  const out = rows.map(row => [...row])
  overlay.rows.forEach((orow, j) => {
    ;[...orow].forEach((c, i) => {
      if (c === '.') return
      const x = overlay.x + i
      const row = out[overlay.y + j]
      if (row !== undefined && x >= 0 && x < width) row[x] = c === '_' ? '.' : c
    })
  })
  return out.map(row => row.join(''))
}

/** The head overlay at a figure head's place on a frame, mirrored for a head facing left. */
export function headOverlay(outfit: Outfit, at: readonly [number, number], facing: 'front' | 'right' | 'left'): Overlay {
  const base = facing === 'front' ? outfit.head : outfit.headProfile
  // Facing left: the head's 6 columns mirrored in place.
  const rows = facing === 'left' ? base.rows.map(row => [...row.padEnd(6, '.')].reverse().join('')) : base.rows
  return { rows, x: at[0] + base.x, y: at[1] + base.y }
}

/** The sprite dressed: every bust frame, the walks and the mini head overlaid; `outfit` set for his moves. */
export function dressed(sprite: Sprite, outfit: Outfit | null): Sprite {
  if (outfit === null) return sprite
  const frames = Object.fromEntries(
    Object.entries(sprite.frames).map(([name, rows]) => {
      if (name.startsWith('mini')) return [name, overlaid(rows, outfit.head)]
      if (name.startsWith('walk')) return [name, overlaid(rows, outfit.profile)]
      return [name, overlaid(rows, outfit.portrait)]
    }),
  ) as unknown as Sprite['frames']
  return { ...sprite, frames, outfit }
}
