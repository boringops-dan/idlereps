/**
 * Sitting a long while (owner, 2026-10-03: "you've been still a while"): two hours of the agent working with
 * nothing moved since, and Swolomon asks, once a day, to stand up with him. Working time, not the clock: a
 * lunch break away from the desk is no sitting. Pure.
 */

/** Working time with nothing moved before he asks. */
export const STILL_MS = 2 * 3_600_000

/** Today's working time after `since`: the agent's merged intervals, the part of each after it. */
export function sittingMs(intervals: readonly (readonly [number, number])[], since: number): number {
  return intervals.reduce((sum, [start, end]) => sum + Math.max(0, end - Math.max(start, since)), 0)
}
