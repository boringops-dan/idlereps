/**
 * The peek (owner, 2026-10-06: "when Swolomon is just idle, we only see his eyes on a 1 line status ...
 * maybe when we notice that it's time for the next set"): with nothing else above the prompt, one row of
 * him, his brows and eyes, blinking and glancing; a dim word on what is coming; and when the next set is
 * under a minute away, his eyes on you. Pure.
 */

import { decodeFrame } from './portrait'
import type { Grid, Pose } from './portrait'
import type { Sprite } from './swolomon-sprite'

/** The portrait's pixel rows the peek shows (brows, eyes: one cell row) and its columns (the face). */
export const PEEK_ROWS = [5, 6] as const
export const PEEK_COLUMNS = { from: 3, to: 13 } as const
export const PEEK_WIDTH = PEEK_COLUMNS.to - PEEK_COLUMNS.from

/** Under this long to the next set, he is looking right at you. */
export const PEEK_NEAR_MS = 60_000

/** The poses the peek draws: those whose brows and eyes differ. */
export type PeekPose = Extract<Pose, 'idle' | 'blink' | 'glanceL' | 'glanceR' | 'lookYou' | 'wink' | 'smirk'>

/** A pose's brows and eyes, cropped from its full frame. */
export function peekGrid(sprite: Sprite, pose: PeekPose): Grid {
  const frame = decodeFrame(sprite, pose)
  return PEEK_ROWS.map(r => (frame[r] ?? []).slice(PEEK_COLUMNS.from, PEEK_COLUMNS.to))
}

/** How long he stays awake after a turn (or a session's start) with nothing going on; then he dozes. */
export const PEEK_AWAKE_MS = 2 * 60_000

/** What the peek says beside his eyes, and whether the next set is close enough for him to stare. */
export function peekText(opts: { isWorking: boolean; cueDueAt: number | null; now: number; isDozing?: boolean }): { text: string; isNear: boolean; isDozing: boolean } {
  const { isWorking, cueDueAt, now } = opts
  if (opts.isDozing === true && !isWorking) return { text: 'z z z', isNear: false, isDozing: true }
  if (isWorking && cueDueAt !== null && cueDueAt > now) {
    const left = cueDueAt - now
    if (left < PEEK_NEAR_MS) return { text: 'your set is coming up…', isNear: true, isDozing: false }
    const minutes = Math.ceil(left / 60_000)
    return { text: `next set in ${minutes} min`, isNear: false, isDozing: false }
  }
  return { text: isWorking ? 'watching' : '', isNear: false, isDozing: false }
}

/**
 * When the peek's word next changes, in ms, or null when nothing will change it but an event: the minute
 * ticking over, the set coming near, or (with no turn running) the moment he dozes off.
 */
export function peekChangeIn(opts: { isWorking: boolean; cueDueAt: number | null; now: number; awakeUntil: number }): number | null {
  const { isWorking, cueDueAt, now, awakeUntil } = opts
  if (!isWorking) return awakeUntil > now ? awakeUntil - now : null
  if (cueDueAt === null || cueDueAt <= now) return null
  const left = cueDueAt - now
  if (left < PEEK_NEAR_MS) return null
  const toMinute = ((left - 1) % 60_000) + 1
  return Math.min(toMinute, left - PEEK_NEAR_MS + 1)
}
