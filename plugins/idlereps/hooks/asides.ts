/**
 * Swolomon's asides (owner, 2026-10-03: "so.. we doing this or what? hello? I'm bored"): while a band waits
 * on a choice, now and then a quick word of his own, in its own colour after a `/`, gone in a moment. In the
 * blank row under a title where the band has one, else after his line. Later ones get more impatient; after
 * the last he leaves it. Pure.
 */

import type { BandKind, BandSpec } from '../types'
import type { LineId } from './copy'

/** When each aside comes, after his line is out, and what it is. */
export const ASIDES: readonly { at: number; id: LineId }[] = [
  { at: 12_000, id: 'aside-nudge' },
  { at: 32_000, id: 'aside-hello' },
  { at: 55_000, id: 'aside-bored' },
  { at: 85_000, id: 'aside-antics' },
  { at: 120_000, id: 'aside-done' },
]

/** How long one shows. */
export const ASIDE_MS = 3_000

/** The bands that wait on a choice; not a set they may be doing, nor a win. */
const WAITING: ReadonlySet<BandKind> = new Set<BandKind>(['question', 'still', 'intro', 'replay', 'ask', 'remind', 'ready', 'where', 'program', 'byoplan', 'reschedule', 'rating'])

export const hasAsides = (spec: BandSpec): boolean => WAITING.has(spec.kind) && spec.isWin !== true && spec.coach !== undefined && spec.actions.length > 0

/** The aside as drawn: the `/` leading to it. */
export const asideText = (aside: string): string => `/ ${aside}`

/** The gap between his line and an aside after it. */
export const ASIDE_GAP = 3

/**
 * Where an aside goes: the blank row under a title, else after his first line when it fits in `room`
 * columns beside that line; else nowhere (it is never wrapped, nor moves a thing).
 */
export function asideSpot(spec: BandSpec, aside: string, room: { columns: number; lineColumns: number }): 'under-title' | 'after-line' | 'none' {
  const width = asideText(aside).length
  if (spec.headerFirst === true && spec.header !== undefined) return room.columns >= width ? 'under-title' : 'none'
  return room.columns >= room.lineColumns + ASIDE_GAP + width ? 'after-line' : 'none'
}
