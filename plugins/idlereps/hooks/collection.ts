/**
 * Swolomon's moves, collected (owner, 2026-10-03: "surprise me with something that's really gonna help
 * engagement"). Every set done moves you toward the next of his moves; when one unlocks, he performs it
 * for you the first time, and `/workout flex` shows off the ones you have. Showing up is what earns them:
 * the gaps grow slowly, so the next one is never far. Pure.
 */

import { MOVES } from './moves'
import { MORE_UNLOCK_ORDER } from './moves-more'
import type { Move } from './moves'

/** His from day one, so the flex has something to show. */
export const STARTER_MOVES: readonly string[] = ['double-biceps', 'squat', 'curl']

/** The rest, in the order they unlock: the fun ones spread between the work. */
export const UNLOCK_ORDER: readonly string[] = [
  'kiss-bicep',
  'push-up',
  'dance',
  'plank',
  'protein-shake',
  'jumping-jacks',
  'lat-spread',
  'lunge',
  'nap',
  'press',
  'most-muscular',
  'pull-up',
  'victory-jump',
  'row',
  'trophy',
  'deadlift',
  'laurel-toss',
  'bridge',
  'moonwalk',
  'burpee',
  'personal-best',
  'calf-raise',
  'dip',
  'wall-sit',
  'side-bend',
  'band-pull-apart',
  'superman',
  'march',
  'stretch',
  'dead-bug',
  ...MORE_UNLOCK_ORDER,
]

/** Sets done by the k-th unlock (k from 1): 3, 6, 10, 15… one more set each time; the first set is its own reward. */
export const setsForUnlock = (k: number): number => ((k + 1) * (k + 2)) / 2

/** How many unlocks `sets` done sets have earned, at most all of them. */
export const unlocksEarned = (sets: number): number => {
  let k = 0
  while (k < UNLOCK_ORDER.length && setsForUnlock(k + 1) <= sets) k += 1
  return k
}

/** The next move to unlock now, if one is due: earned, and not yet had. */
export function dueUnlock(sets: number, unlocked: readonly string[]): Move | null {
  const had = unlocked.filter(id => UNLOCK_ORDER.includes(id)).length
  if (had >= unlocksEarned(sets)) return null
  const id = UNLOCK_ORDER.find(m => !unlocked.includes(m))
  return id === undefined ? null : (MOVES.find(move => move.id === id) ?? null)
}

/** Sets to go to the next unlock; null once all are had. */
export function setsToNext(sets: number, unlocked: readonly string[]): number | null {
  const had = unlocked.filter(id => UNLOCK_ORDER.includes(id)).length
  if (had >= UNLOCK_ORDER.length) return null
  return Math.max(1, setsForUnlock(had + 1) - sets)
}

/** The moves they have, in the order of the reel: starters first, then as unlocked. */
export const collected = (unlocked: readonly string[]): Move[] =>
  [...STARTER_MOVES, ...UNLOCK_ORDER.filter(id => unlocked.includes(id))].flatMap(id => MOVES.filter(move => move.id === id))
