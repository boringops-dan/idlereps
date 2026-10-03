/**
 * Remind me mode (owner, 2026-10-02: "some people may just want reminders ... hey go for a lift and tracking
 * that"): no plan. The person trains their own way (a gym, a home gym, a run) on the days they pick; on those
 * days Swolomon reminds them while the agent works, and asks what they hit when they're back. Pure.
 */

import type { HistoryEntry, Routine, Trained, Weekday } from '../types'
import type { WeekMark } from './history'
import { mondayOf } from './ledger'
import { shortDayName, weekdayName } from './schedule'

/** The days band's one-tap choices; any other set of days is `/workout days mon wed sat`. */
export const DAY_PRESETS: Record<'mwf' | 'tts' | 'weekdays' | 'everyday', Weekday[]> = {
  mwf: ['mon', 'wed', 'fri'],
  tts: ['tue', 'thu', 'sat'],
  weekdays: ['mon', 'tue', 'wed', 'thu', 'fri'],
  everyday: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
}

export const isDayPreset = (id: string): id is keyof typeof DAY_PRESETS => id in DAY_PRESETS

export const TRAINED: Record<Trained, string> = { upper: 'Upper', lower: 'Lower', full: 'Full body', cardio: 'Cardio', other: 'A session' }

export const isTrained = (id: string): id is Trained => id in TRAINED

const ORDER: readonly Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

/** `Mon Wed Fri`, Monday first. */
export const daysLabel = (days: readonly Weekday[]): string =>
  days.length === 7 ? 'Every day' : ORDER.filter(d => days.includes(d)).map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(' ')

/** `/workout days mon wed sat`: the days named, in any case, any separators; null when none is a day. */
export function parseDays(text: string): Weekday[] | null {
  const words = text.toLowerCase().split(/[^a-z]+/).filter(Boolean)
  const days = ORDER.filter(day => words.some(word => word.startsWith(day)))
  return days.length === 0 ? null : days
}

export const isRoutineDay = (routine: Routine, day: number): boolean => routine.days.includes(weekdayName(day))

/** Sessions logged on a day. */
const trainedOn = (history: readonly HistoryEntry[], day: number) => history.some(e => e.kind === 'trained' && e.d === day)

/** Whether today still wants its reminder: one of their days, nothing logged, no session under way. */
export const wantsReminder = (routine: Routine, history: readonly HistoryEntry[], today: number, declinedOn: number | undefined): boolean =>
  isRoutineDay(routine, today) && !trainedOn(history, today) && declinedOn !== today && routine.going === undefined

/** How long after Going to ask what they hit: long enough for a session. */
export const ASK_AFTER_MS = 45 * 60_000

/** Whether to ask what they trained: a session they went to, long enough ago (or on an earlier day). */
export const wantsLog = (routine: Routine, now: number, today: number): boolean =>
  routine.going !== undefined && (routine.going.d < today || now - routine.going.t >= ASK_AFTER_MS)

/** Monday to Sunday: trained days done, their days still open, the rest quiet. */
export function routineWeekMarks(routine: Routine, history: readonly HistoryEntry[], today: number, since = -Infinity): WeekMark[] {
  const monday = mondayOf(today)
  return Array.from({ length: 7 }, (_, i): WeekMark => {
    const day = monday + i
    if (trainedOn(history, day)) return '●'
    if (day < since) return '·'
    return isRoutineDay(routine, day) ? '○' : '·'
  })
}

/** Sessions this local week (Monday start), and how many of their days the week has. */
export const weekCount = (routine: Routine, history: readonly HistoryEntry[], today: number) => {
  const monday = mondayOf(today)
  const done = new Set(history.filter(e => e.kind === 'trained' && e.d >= monday && e.d < monday + 7).map(e => e.d)).size
  return { done, of: routine.days.length }
}

/** `Upper, Tuesday` for the last session logged; null before the first. */
export function lastTrainedText(history: readonly HistoryEntry[], today: number): string | null {
  const last = [...history].reverse().find(e => e.kind === 'trained')
  if (last === undefined || last.kind !== 'trained') return null
  const when = last.d === today ? 'today' : last.d === today - 1 ? 'yesterday' : shortDayName(last.d)
  return `${TRAINED[last.what]}, ${when}`
}
