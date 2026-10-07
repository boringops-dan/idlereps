/**
 * Copyright 2026 Orange Specs Mobile Labs. All rights reserved: not covered by the Apache License (see NOTICE). The regulars'
 * names, characters and these drawings are proprietary.
 *
 * The regulars in person (owner, 2026-10-06: "more Swolomon"): Big Greg, Deadlift Doris and Cardio Kevin,
 * who until now lived only in his lines, now and then walk past behind him, and he names them. Each is his
 * walk in profile, laurel off, in their own colours. Pure.
 */

import type { LineId } from './copy'
import type { Sprite } from './swolomon-sprite'

export type Regular = {
  id: string
  /** His word as they pass. */
  line: LineId
  /** Their hair (and beard, where they have one), tank and its shade, as palette characters. */
  hair: string
  tank: string
  tankShade: string
  /** What sits where his laurel was: their hair, or a headband. */
  band?: string
  /** Rows of their walk drawn their own way (no beard), by row. */
  rows?: Readonly<Record<number, string>>
}

export const REGULARS: readonly Regular[] = [
  { id: 'big-greg', line: 'cameo-big-greg', hair: 'k', tank: 'r', tankShade: 'R' },
  {
    id: 'deadlift-doris',
    line: 'cameo-deadlift-doris',
    hair: 'o',
    tank: 'p',
    tankShade: 'P',
    // Clean-shaven, and a ponytail out the back.
    rows: { 4: '.ohhhhsssssss...', 5: '.ohhhsssssshhs..', 9: '...hhssssswwws..', 10: '....hssssssss...', 11: '.....sssssss....' },
  },
  { id: 'cardio-kevin', line: 'cameo-cardio-kevin', hair: 'G', tank: 'v', tankShade: 'V', band: 'r' },
]

const recolour = (rows: readonly string[], map: Readonly<Record<string, string>>) => rows.map(row => [...row].map(c => map[c] ?? c).join(''))

/** A regular's walk frames, from his: their rows, the laurel gone, their colours. */
export function regularWalk(sprite: Sprite, regular: Regular, frame: 'walkA' | 'walkB'): string[] {
  const rows = sprite.frames[frame].map((row, i) => regular.rows?.[i] ?? row)
  // The laurel is his alone: their hair (or headband) where it sat.
  const laurelOff = rows.map(row => [...row].map(c => (c === 'g' || c === 'G' ? 'L' : c)).join(''))
  return recolour(laurelOff, { h: regular.hair, t: regular.tank, T: regular.tankShade, L: regular.band ?? regular.hair })
}

export const regularById = (id: string): Regular | undefined => REGULARS.find(r => r.id === id)
