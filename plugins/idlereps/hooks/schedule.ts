/**
 * Which days train, quiet hours, the spacing of cues, and the one delivery gate every band, toast and sound
 * passes (plan D5 to D7, D23, §4.3 item 1). Pure.
 */

import type { Plan, Progress, Weekday } from '../types'
import { WEEKDAYS } from './plan'

/** The weekday of a local day number: 1970-01-01 was a Thursday (D6). 0 is Sunday. */
export const weekdayOf = (day: number): number => (((day + 4) % 7) + 7) % 7

export const weekdayName = (day: number): Weekday => WEEKDAYS[weekdayOf(day)] ?? 'sun'

const LONG_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const
const SHORT_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

export const longDayName = (day: number): string => LONG_NAMES[weekdayOf(day)] ?? 'Sunday'
export const shortDayName = (day: number): string => SHORT_NAMES[weekdayOf(day)] ?? 'Sun'

/** Whether `day` is a training day (D5). A day a workout was completed on never cues again. */
export function isTrainingDay(plan: Plan, progress: Progress, day: number): boolean {
  if (progress.lastCompletedOn === day) return false
  if (progress.extraDay === day) return true
  if ('days' in plan.schedule) return plan.schedule.days.includes(weekdayName(day))
  return progress.lastCompletedOn === null || day - progress.lastCompletedOn >= plan.schedule.everyNDays
}

/** The next training day after `day`, within 14 days, or null. */
export function nextTrainingDay(plan: Plan, progress: Progress, day: number): number | null {
  for (let next = day + 1; next <= day + 14; next += 1) {
    // A future day is judged as if nothing more happens before it: no extra day carries over.
    if (isTrainingDay(plan, { ...progress, extraDay: null }, next)) return next
  }
  return null
}

/** Whether the local `hour` is inside the quiet-hours option ("22-07": from 22:00 up to 07:00). */
export function inQuietHours(option: string, hour: number): boolean {
  const match = /^(\d{1,2})-(\d{1,2})$/.exec(option)
  if (match === null) return false
  const from = Number(match[1])
  const to = Number(match[2])
  return from <= to ? hour >= from && hour < to : hour >= from || hour < to
}

/** How long from now until a cue may show this turn: the turn's wait, or the rest of the gap (D7). */
export const cueDelayMs = (turnWaitMs: number, nextCueAt: number | undefined, now: number): number =>
  Math.max(turnWaitMs, (nextCueAt ?? 0) - now)

export type Message = { channel: 'band' | 'toast' | 'sound'; cause: 'timer' | 'keypress' | 'command' }
export type GateContext = {
  paused: boolean
  isQuietHours: boolean
  promptHasText: boolean
  /** Sound only: `coachSound` is not off, and the asset is present and approved. */
  soundAllowed: boolean
}

/** The one delivery gate (D23): show it, wait for an empty prompt, or drop it. */
export function gate(msg: Message, ctx: GateContext): 'show' | 'defer' | 'drop' {
  if (msg.channel === 'sound' && !ctx.soundAllowed) return 'drop'
  if (msg.cause !== 'timer') return 'show'
  if (ctx.paused || ctx.isQuietHours) return 'drop'
  if (msg.channel === 'band' && ctx.promptHasText) return 'defer'
  return 'show'
}

export type CueContext = {
  plan: Plan
  progress: Progress
  today: number
  declinedOn: number | undefined
  nextCueAt: number | undefined
  now: number
}

/** Whether a set may be offered at all (§4.3 item 1); `/workout now` ignores the training day and the gap. */
export function cueAllowed(
  ctx: CueContext,
  flags: { ignoreTrainingDay: boolean; ignoreGap: boolean },
): boolean {
  const { plan, progress, today } = ctx
  if (progress.workout >= plan.workouts.length) return false
  if (progress.lastCompletedOn === today) return false
  if (ctx.declinedOn === today && !flags.ignoreTrainingDay) return false
  if (!flags.ignoreTrainingDay && !isTrainingDay(plan, progress, today)) return false
  if (!flags.ignoreGap && (ctx.nextCueAt ?? 0) > ctx.now) return false
  return true
}

/** A weekday's long name: `wed` → "Wednesday". */
export const weekdayLongName = (weekday: Weekday): string => LONG_NAMES[WEEKDAYS.indexOf(weekday)] ?? 'Sunday'

/** A weekday's short name: `wed` → "Wed". */
export const weekdayShortName = (weekday: Weekday): string => SHORT_NAMES[WEEKDAYS.indexOf(weekday)] ?? 'Sun'

/**
 * A training weekday the person has said Not today to three weeks running (today and the same day the two
 * weeks before) is worth moving: to the next weekday after it that does not train. Days plans only.
 */
export function rescheduleOffer(plan: Plan, declines: readonly number[], day: number): { from: Weekday; to: Weekday } | null {
  if (!('days' in plan.schedule)) return null
  const days = plan.schedule.days
  const from = weekdayName(day)
  if (!days.includes(from)) return null
  if (![day, day - 7, day - 14].every(d => declines.includes(d))) return null
  for (let step = 1; step < 7; step += 1) {
    const to = weekdayName(day + step)
    if (!days.includes(to)) return { from, to }
  }
  return null
}

/** A days schedule with one weekday moved, kept in Monday-to-Sunday order. */
export function moveWeekday(days: readonly Weekday[], from: Weekday, to: Weekday): Weekday[] {
  const order = (weekday: Weekday) => (WEEKDAYS.indexOf(weekday) + 6) % 7
  return [...new Set(days.map(d => (d === from ? to : d)))].sort((a, b) => order(a) - order(b))
}
