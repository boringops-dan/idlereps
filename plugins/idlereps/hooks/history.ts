/**
 * The training log and what is computed from it: the cap, streaks, the week's marks, totals, and double
 * progression (plan §5.3). Pure.
 */

import type { Answers, Exercise, HistoryEntry, Plan, Progress, Rating, SetResult, Target, Targets, Workout } from '../types'
import { stepsFor, targetFor, targetOf, workSeconds } from './plan'
import { harderVariant } from './programs'
import { isTrainingDay, nextTrainingDay, weekdayName } from './schedule'
import { mondayOf } from './ledger'

/** D12: the newest entries kept. */
export const HISTORY_CAP = 5000

/** Anything that counts as moving: a set done, a set of their own, a stretch, standing up. */
export const isMovement = (e: HistoryEntry): boolean => (e.kind === 'set' && e.result === 'done') || e.kind === 'moved' || e.kind === 'stretch' || e.kind === 'stood'

export const appendHistory = (list: readonly HistoryEntry[], ...entries: HistoryEntry[]): HistoryEntry[] =>
  [...list, ...entries].slice(-HISTORY_CAP)

/** Days with a completed workout, oldest first. */
const completionDays = (history: readonly HistoryEntry[]): number[] =>
  [...new Set(history.filter(entry => entry.kind === 'workout-complete').map(entry => entry.d))].sort((a, b) => a - b)

/** Whether a scheduled training day lies strictly between `from` and `to` with no workout on it. */
function isGapBroken(plan: Plan, from: number, to: number): boolean {
  if ('everyNDays' in plan.schedule) return to - from > plan.schedule.everyNDays
  const days = plan.schedule.days
  for (let day = from + 1; day < to; day += 1) if (days.includes(weekdayName(day))) return true
  return false
}

/**
 * Completed workouts in the longest suffix with no missed scheduled training day between consecutive
 * completions, or between the last one and today (today itself, not yet trained, never breaks it).
 */
export function streak(plan: Plan, history: readonly HistoryEntry[], today: number): number {
  const days = completionDays(history)
  const last = days.at(-1)
  if (last === undefined) return 0
  const toToday = 'everyNDays' in plan.schedule ? today - last > plan.schedule.everyNDays : isGapBroken(plan, last, today)
  if (toToday) return 0
  let count = 1
  for (let i = days.length - 1; i > 0; i -= 1) {
    const later = days[i] ?? 0
    const earlier = days[i - 1] ?? 0
    if (isGapBroken(plan, earlier, later)) break
    count += 1
  }
  return count
}

/**
 * Days in the last `span` (today included) with anything done: a set, a bonus set or a stretch. Showing up
 * is what this counts, so a broken streak never reads as zero once there is something to count.
 */
export function daysShowedUp(history: readonly HistoryEntry[], today: number, span = 30): number {
  const days = new Set<number>()
  for (const e of history) {
    const isDone = isMovement(e)
    if (isDone && e.d > today - span && e.d <= today) days.add(e.d)
  }
  return days.size
}

export type WeekMark = '●' | '◐' | '○' | '·'

/**
 * Marks Monday to Sunday of today's week: a workout completed (●), started but not finished (◐), a training
 * day not trained (○), not a training day (·). Days before `since` (the plan's first day) were never
 * training days of this plan.
 */
export function weekMarks(plan: Plan, progress: Progress, history: readonly HistoryEntry[], today: number, since = -Infinity): WeekMark[] {
  const monday = mondayOf(today)
  const completed = new Set(history.filter(e => e.kind === 'workout-complete').map(e => e.d))
  const started = new Set(history.filter(e => e.kind === 'set').map(e => e.d))
  const upcoming = new Set<number>()
  if ('everyNDays' in plan.schedule) {
    if (isTrainingDay(plan, progress, today)) upcoming.add(today)
    let day: number | null = today
    while (day !== null && day < monday + 7) {
      day = nextTrainingDay(plan, progress, day)
      if (day !== null) upcoming.add(day)
    }
  }
  return Array.from({ length: 7 }, (_, i): WeekMark => {
    const day = monday + i
    if (completed.has(day)) return '●'
    if (started.has(day)) return '◐'
    if (day < since) return '·'
    const isScheduled =
      'days' in plan.schedule ? plan.schedule.days.includes(weekdayName(day)) || progress.extraDay === day : upcoming.has(day)
    return isScheduled ? '○' : '·'
  })
}

/** Done sets this local week (Monday start). */
export const setsThisWeek = (history: readonly HistoryEntry[], today: number): number => {
  const monday = mondayOf(today)
  return history.filter(e => e.kind === 'set' && e.result === 'done' && e.d >= monday && e.d < monday + 7).length
}

/**
 * Each plan exercise's sets in the workout just done: its newest `sets` set entries since the previous
 * completion, by the name it is done under (its variant's, once it moved to one).
 */
export function resultsOf(history: readonly HistoryEntry[], index: number, workout: Workout, targets: Targets): Record<string, SetResult[]> {
  const since: HistoryEntry[] = []
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const entry = history[i]
    if (entry === undefined || entry.kind === 'workout-complete') break
    since.unshift(entry)
  }
  const results: Record<string, SetResult[]> = {}
  for (const exercise of workout.exercises) {
    const shownAs = targets[exercise.name]?.variant?.name ?? exercise.name
    const sets = since
      .filter((e): e is Extract<HistoryEntry, { kind: 'set' }> => e.kind === 'set' && e.w === index && e.exercise === shownAs)
      .map(e => (e.count === undefined ? { result: e.result } : { result: e.result, count: e.count }))
    const total = workout.exercises.filter(ex => ex.name === exercise.name).reduce((n, ex) => n + ex.sets, 0)
    results[exercise.name] = sets.slice(-total)
  }
  return results
}

const roundTo = (value: number) => Math.round(value * 100) / 100

/** A deload (§5.3): weight − 10 % rounded down to the step but at most one step; a band level down; reps − 2 (− 10 s). */
function deload(exercise: Exercise, target: Target, range: [number, number], isTimed: boolean): Target {
  if (exercise.weight !== undefined) {
    const { step } = exercise.weight
    const weight = target.weight ?? exercise.weight.start
    const tenPercent = Math.floor(roundTo((weight * 0.9) / step)) * step
    return { ...target, weight: roundTo(Math.max(0, tenPercent, weight - step)) }
  }
  if (exercise.band !== undefined) {
    const levels = exercise.band.levels
    const at = levels.indexOf(target.band ?? exercise.band.start)
    return { ...target, band: levels[Math.max(0, at - 1)] ?? exercise.band.start }
  }
  return { ...target, reps: Math.max(range[0], target.reps - (isTimed ? 10 : 2)) }
}

/** Whether nothing comes after this exercise's range: no weight to add, the heaviest band, no harder variant. */
function isLastStep(planExercise: Exercise, target: Target, setting: Answers['setting']): boolean {
  if (planExercise.weight !== undefined) return false
  if (planExercise.band !== undefined) return planExercise.band.levels.at(-1) === (target.band ?? planExercise.band.start)
  return harderVariant(target.variant?.name ?? planExercise.name, setting) === null
}

/**
 * Double progression for one exercise when a workout finishes (§5.3). `rating` is absent until the person
 * answers (an unrated workout counts as Good).
 */
export function nextTarget(
  planExercise: Exercise,
  current: Target,
  sets: readonly SetResult[],
  rating: Rating | undefined,
  setting: Answers['setting'],
): Target {
  const range = current.variant?.range ?? planExercise.range
  if (range === undefined) return current
  const isTimed = targetOf(current.variant?.reps ?? planExercise.reps)?.isTimed ?? false
  const isAnyBelow = sets.length === 0 || sets.some(s => s.result === 'skip' || (s.count ?? 0) < current.reps)
  const counted: Target = {
    ...current,
    belowStreak: isAnyBelow ? current.belowStreak + 1 : 0,
    toughStreak: rating === 'tough' ? current.toughStreak + 1 : 0,
  }
  if (counted.belowStreak >= 3 || counted.toughStreak >= 2) {
    return { ...deload(planExercise, counted, range, isTimed), belowStreak: 0, toughStreak: 0 }
  }
  const isAllAtTop = sets.length > 0 && sets.every(s => s.result === 'done' && (s.count ?? 0) >= range[1])
  if (isAllAtTop) {
    if (planExercise.weight !== undefined) {
      const weight = counted.weight ?? planExercise.weight.start
      return { ...counted, weight: roundTo(weight + planExercise.weight.step), reps: range[0] }
    }
    if (planExercise.band !== undefined) {
      const levels = planExercise.band.levels
      const at = levels.indexOf(counted.band ?? planExercise.band.start)
      const up = levels[at + 1]
      if (up !== undefined) return { ...counted, band: up, reps: range[0] }
    } else {
      const harder = harderVariant(current.variant?.name ?? planExercise.name, setting)
      if (harder !== null) return { ...counted, variant: harder, reps: harder.range[0] }
    }
  }
  if (!isAnyBelow && rating !== 'tough') {
    const step = (rating === 'easy' ? 2 : 1) * (isTimed ? 5 : 1)
    // Past the top only at the last step (the heaviest band, or no harder variant): more reps, or seconds.
    return { ...counted, reps: Math.min(isLastStep(planExercise, counted, setting) ? 999 : range[1], counted.reps + step) }
  }
  return counted
}

/** Progression over a finished workout: every plan exercise in it, once. */
export function progressWorkout(
  workout: Workout,
  targetsBefore: Targets,
  results: Record<string, SetResult[]>,
  rating: Rating | undefined,
  setting: Answers['setting'],
): Targets {
  const targets: Targets = { ...targetsBefore }
  for (const exercise of workout.exercises) {
    if (targets[exercise.name] !== targetsBefore[exercise.name]) continue
    const current = targetFor(exercise, targetsBefore)
    targets[exercise.name] = nextTarget(exercise, current, results[exercise.name] ?? [], rating, setting)
  }
  return targets
}

/** Steps in the current workout, for the status line's `3/9`. */
export const stepCountOf = (plan: Plan, progress: Progress): number => {
  const workout = plan.workouts[progress.workout]
  return workout === undefined ? 0 : stepsFor(workout, progress).length
}

// ---------------------------------------------------------------------------------------------------------
// Ranks (§1.13.1): from total done sets, all time; never the body, never the weight lifted.

export const RANKS = [
  { name: 'New Face', sets: 0, line: null },
  { name: 'Regular', sets: 25, line: 'rank-regular' },
  { name: 'Rack Regular', sets: 100, line: 'rank-rack-regular' },
  { name: 'Iron Disciple', sets: 250, line: 'rank-iron-disciple' },
  { name: 'Demigod', sets: 500, line: 'rank-demigod' },
  { name: 'Olympian', sets: 1000, line: 'rank-olympian' },
  { name: 'Greek God', sets: 2500, line: 'rank-greek-god' },
] as const

export type Rank = (typeof RANKS)[number]

export function rankFor(totalSets: number): Rank {
  return RANKS.findLast(rank => totalSets >= rank.sets) ?? RANKS[0]
}

/** The next rank and how many sets to it; null at the top. */
export function nextRank(totalSets: number): { rank: Rank; setsToGo: number } | null {
  const rank = RANKS.find(r => r.sets > totalSets)
  return rank === undefined ? null : { rank, setsToGo: rank.sets - totalSets }
}

// ---------------------------------------------------------------------------------------------------------
// Time moved and trends: what the person has done, made visible.

/** The seconds of movement in done sets (and stretches) from `fromDay` to `toDay`, inclusive. */
export function movedSeconds(history: readonly HistoryEntry[], fromDay = -Infinity, toDay = Infinity): number {
  return history.reduce((sum, entry) => {
    if (entry.d < fromDay || entry.d > toDay) return sum
    if (entry.kind === 'set' && entry.result === 'done') return sum + workSeconds(entry.target, entry.count)
    if (entry.kind === 'stretch') return sum + entry.seconds
    return sum
  }, 0)
}

/** An exercise's progress, one point a day it was done: the heaviest weight where it has one, else the most reps or seconds. */
export function trendOf(history: readonly HistoryEntry[], exercise: string, points = 8): number[] {
  const byDay = new Map<number, number>()
  for (const entry of history) {
    if (entry.kind !== 'set' || entry.result !== 'done' || entry.exercise !== exercise) continue
    const value = entry.weight ?? entry.count
    if (value === undefined) continue
    byDay.set(entry.d, Math.max(byDay.get(entry.d) ?? 0, value))
  }
  return [...byDay.entries()].sort(([a], [b]) => a - b).map(([, value]) => value).slice(-points)
}

const BARS = '▁▂▃▄▅▆▇█'

/** Values as a sparkline, lowest to highest; a flat line sits in the middle. */
export function sparkline(values: readonly number[]): string {
  const low = Math.min(...values)
  const high = Math.max(...values)
  return values.map(value => (high === low ? BARS[3] : BARS[Math.round(((value - low) / (high - low)) * (BARS.length - 1))]) ?? '').join('')
}
