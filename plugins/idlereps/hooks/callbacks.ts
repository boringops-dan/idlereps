/**
 * He remembers you (owner, 2026-10-06: "more Swolomon"): a word on a set band that only someone who was
 * there would say, from your own history of this exercise and this weekday. A milestone set, how far it has
 * come, the same weekday week after week, back to it after a while, last time's skip (no grudge); and the
 * anniversaries of your first set. Never guilt. Pure.
 */

import type { HistoryEntry } from '../types'
import type { LineId } from './copy'

export type Callback = { id: LineId; ctx: Record<string, string | number>; mark: string }

type SetEntry = Extract<HistoryEntry, { kind: 'set' }>

/** Sets of one exercise worth a word: this one's place among all of them done. */
export const SET_MILESTONES = [10, 25, 50, 100, 250, 500, 1000] as const
/** How far back "how far it has come" looks, and how long ago its first count must be. */
const PROGRESS_SPAN_DAYS = 60
const PROGRESS_MIN_DAYS = 21
/** Up this much (reps or seconds) is worth saying. */
const PROGRESS_MIN = 2
/** The same weekday this many weeks running, today included, is worth saying. */
const WEEKDAY_RUN = 3
/** Away from an exercise this long is a comeback. */
const BACK_DAYS = 14

const WEEKDAYS = ['Thursday', 'Friday', 'Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday'] as const
/** A local day number's weekday, as said (day 0, 1970-01-01, was a Thursday). */
export const weekdayOf = (day: number): string => WEEKDAYS[((day % 7) + 7) % 7] ?? 'Monday'

/** The day's callback for a set of `exercise`, or null; the first that applies, in this order. */
export function callbackFor(history: readonly HistoryEntry[], exercise: string, today: number): Callback | null {
  const sets = history.filter((e): e is SetEntry => e.kind === 'set' && e.exercise === exercise)
  const done = sets.filter(e => e.result === 'done')
  // This set, once done, is the n-th.
  const n = done.length + 1
  if ((SET_MILESTONES as readonly number[]).includes(n)) return { id: 'cb-milestone', ctx: { n }, mark: 'cb-milestone' }

  const counted = done.filter(e => e.count !== undefined && e.d >= today - PROGRESS_SPAN_DAYS)
  const first = counted[0]
  if (first !== undefined && first.d <= today - PROGRESS_MIN_DAYS) {
    const best = Math.max(...counted.filter(e => e.d >= today - 7).map(e => e.count ?? 0))
    if (best - (first.count ?? 0) >= PROGRESS_MIN) return { id: 'cb-progress', ctx: { then: first.count ?? 0, now: best }, mark: 'cb-progress' }
  }

  const days = new Set(history.filter(e => e.kind === 'set' && e.result === 'done').map(e => e.d))
  let weeks = 1
  while (days.has(today - 7 * weeks)) weeks += 1
  if (weeks >= WEEKDAY_RUN) return { id: 'cb-weekday', ctx: { n: weeks, weekday: weekdayOf(today) }, mark: 'cb-weekday' }

  const last = done.at(-1)
  if (last !== undefined && today - last.d >= BACK_DAYS) return { id: 'cb-back', ctx: { n: today - last.d }, mark: 'cb-back' }

  const latest = sets.at(-1)
  if (latest?.result === 'skip' && today - latest.d < BACK_DAYS && latest.d < today) return { id: 'cb-skipped', ctx: {}, mark: 'cb-skipped' }
  return null
}

/** Days since the first set ever worth a word. */
export const ANNIVERSARIES = [7, 30, 100, 365, 730, 1095] as const
/** An anniversary missed by a few days (no session that day) is still said, this many days late at most. */
const ANNIVERSARY_GRACE = 3

/** The anniversary of the first set ever that today is (or just was), or null. */
export function anniversaryOf(history: readonly HistoryEntry[], today: number): number | null {
  const first = history.find(e => e.kind === 'set' && e.result === 'done')
  if (first === undefined) return null
  const since = today - first.d
  return ANNIVERSARIES.find(days => since >= days && since <= days + ANNIVERSARY_GRACE) ?? null
}
