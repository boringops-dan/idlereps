/**
 * The once ledger (plan §4.3 item 2): every "once", "once a day" and "at most every" flag in one store key,
 * `seen`. Pure. Undo never reverts a mark.
 */

import type { Seen } from '../types'

export type Scope = 'ever' | 'day' | 'week' | { count: number } | { everyMs: number }

/** The Monday on or before a local day number (1970-01-05 was a Monday, day 4). */
export const mondayOf = (day: number): number => day - ((((day - 4) % 7) + 7) % 7)

/**
 * Whether `id` may happen now: never marked; or, by scope, marked fewer than `count` times, on an earlier
 * local day or week, or at least `everyMs` ago. `dayOf` turns the mark's time into its local day.
 */
export function due(seen: Seen, id: string, scope: Scope, now: number, dayOf: (ms: number) => number): boolean {
  const mark = seen[id]
  if (mark === undefined) return true
  if (scope === 'ever') return false
  if (scope === 'day') return dayOf(mark.at) !== dayOf(now)
  if (scope === 'week') return mondayOf(dayOf(mark.at)) !== mondayOf(dayOf(now))
  if ('count' in scope) return mark.n < scope.count
  return now - mark.at >= scope.everyMs
}

/** Records that `id` happened now: bumps its count and sets its time. */
export const mark = (seen: Seen, id: string, now: number): Seen => ({
  ...seen,
  [id]: { at: now, n: (seen[id]?.n ?? 0) + 1 },
})
