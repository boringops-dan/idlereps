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

/** Anything moved on a day: sets of their own and standing up (Just remind me's daily target counts both). */
export const movesOn = (history: readonly HistoryEntry[], day: number): number => history.filter(e => e.d === day && (e.kind === 'moved' || e.kind === 'stood')).length

/** With fewer active days than this in the last two weeks, the target is the starting one. */
const TARGET_HISTORY_DAYS = 3
export const START_TARGET = 3
export const TARGET_MIN = 1
export const TARGET_MAX = 6

/**
 * Today's target (owner, 2026-10-03: "a daily target that follows you"): the moves of a usual active day in
 * the last two weeks, a quarter lower in a rough week (fewer active days this week than the one before), so
 * it never reads as a debt. Today itself never counts.
 */
export function dailyTarget(history: readonly HistoryEntry[], today: number): number {
  const days = Array.from({ length: 14 }, (_, i) => today - 1 - i)
  const counts = days.map(day => movesOn(history, day))
  const active = counts.filter(n => n > 0).sort((a, b) => a - b)
  if (active.length < TARGET_HISTORY_DAYS) return START_TARGET
  const usual = active[Math.floor((active.length - 1) / 2)] ?? START_TARGET
  const thisWeek = counts.slice(0, 7).filter(n => n > 0).length
  const lastWeek = counts.slice(7).filter(n => n > 0).length
  const target = thisWeek < lastWeek ? Math.round(usual * 0.75) : usual
  return Math.min(TARGET_MAX, Math.max(TARGET_MIN, target))
}

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
