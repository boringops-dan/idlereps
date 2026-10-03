/**
 * Just remind me (owner, 2026-10-03: "Hey why don't you go and do a set or do some quick cardio"): no plan.
 * While the agent works, Swolomon says do a set, anything; one tap logs what it worked. It is still the
 * agent's wait time: the same gap, the same quiet while typing, the same quiet hours. Pure.
 */

import type { HistoryEntry, Moved } from '../types'
import type { WeekMark } from './history'
import { mondayOf } from './ledger'
import type { WaitSize } from './waits'

export const MOVED: Record<Moved, string> = { upper: 'Upper', lower: 'Lower', cardio: 'Cardio', other: 'A set' }

export const isMoved = (id: string): id is Moved => id in MOVED

/** Ideas, not orders: anything counts. With gear or without, at a desk or not; sized to the wait. */
export const IDEAS: Readonly<Record<WaitSize, readonly string[]>> = {
  quick: ['15 squats', '10 push-ups', '20 calf raises', 'a 30 s plank', '10 desk push-ups', 'a 30 s wall sit', 'a minute of high knees'],
  set: ['a set of curls', 'a minute of jumping jacks', '10 lunges a leg', 'a set of rows', 'a set of presses', '15 glute bridges'],
  long: ['a lap of the block', 'a 5 min walk', 'stairs, up and down', 'two sets of anything', 'a proper stretch'],
}

/** Three ideas of a size for the n-th reminder: a different three each time, the same three for the same n. */
export function ideasFor(n: number, size: WaitSize = 'set'): string[] {
  const pool = IDEAS[size]
  const at = ((n * 3) % pool.length + pool.length) % pool.length
  return [0, 1, 2].map(i => pool[(at + i) % pool.length] ?? '')
}

const movedIn = (history: readonly HistoryEntry[], from: number, to: number) => history.filter(e => e.kind === 'moved' && e.d >= from && e.d <= to)

/** Just remind me sets on a day. */
export const movedOn = (history: readonly HistoryEntry[], day: number): number => movedIn(history, day, day).length

/** Just remind me sets this local week (Monday start). */
export const movedThisWeek = (history: readonly HistoryEntry[], today: number): number => movedIn(history, mondayOf(today), mondayOf(today) + 6).length

/** Monday to Sunday: days with a set done, today's still open, the rest quiet. Every day is a day to move. */
export function remindWeekMarks(history: readonly HistoryEntry[], today: number): WeekMark[] {
  const monday = mondayOf(today)
  return Array.from({ length: 7 }, (_, i): WeekMark => {
    const day = monday + i
    if (movedOn(history, day) > 0) return '●'
    return day >= today ? '○' : '·'
  })
}

/** `Upper, today` for the last set logged; null before the first. */
export function lastMovedText(history: readonly HistoryEntry[], today: number, dayName: (day: number) => string): string | null {
  const last = [...history].reverse().find(e => e.kind === 'moved')
  if (last === undefined || last.kind !== 'moved') return null
  const when = last.d === today ? 'today' : last.d === today - 1 ? 'yesterday' : dayName(last.d)
  return `${MOVED[last.what]}, ${when}`
}
