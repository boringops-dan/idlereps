/**
 * The record reducer (plan §4.3 item 5): every answer that changes stored data goes through `record`, which
 * returns the patch to write, its exact inverse for Undo, and the effects the bands and toasts follow. Pure.
 */

import type {
  Answers,
  Cue,
  HistoryEntry,
  LastByExercise,
  Plan,
  Progress,
  Rating,
  RatingBasis,
  Targets,
  Workout,
} from '../types'
import { HISTORY_CAP, progressWorkout, rankFor, resultsOf, streak } from './history'
import { mondayOf } from './ledger'
import { advance, cueFor, describeAmount, effectiveExercise, targetFor } from './plan'
import { weekdayName } from './schedule'

/** The store keys a record may change, besides appending to `history`. */
export const RECORD_KEYS = ['progress', 'targets', 'lastByExercise', 'totalDoneSets', 'nextCueAt'] as const
export type RecordKey = (typeof RECORD_KEYS)[number]

export type RecordStore = {
  progress: Progress
  history: HistoryEntry[]
  targets: Targets
  lastByExercise: LastByExercise
  totalDoneSets: number
  nextCueAt: number | undefined
}

export type Patch = { set: Partial<Record<RecordKey, unknown>>; append: HistoryEntry[] }

/** What Undo applies (store key `undo`): previous values, keys to delete, and how many entries to drop. */
export type Inverse = {
  /** The record's time; a band's Undo applies only its own record. */
  id: number
  restore: Partial<Record<RecordKey, unknown>>
  remove: RecordKey[]
  drop: number
  /** The set to show again after Undo. */
  cue: Cue | null
}

export type Effects = {
  /** Another session already recorded the set this band shows (D14): nothing was recorded. */
  isStale?: true
  /** What the logged line says, without its tick: "Logged Push-ups 10 reps", "Skipped Push-ups". */
  logged?: string
  isNewBest?: true
  /** Better than the last time this exercise was done: more reps (or seconds) at the same load, or more load. */
  gain?: { more: number } | { heavier: true }
  /**
   * `levelUps`: the exercises whose targets went up with this workout, before any rating (every set at
   * the target: the rating can add to it, or hold it with Tough).
   */
  workoutDone?: { workout: number; name: string; basis: RatingBasis; isPlanDone: boolean; levelUps: string[] }
  /** The rank this set reached, when it crossed into one (§1.13.1). */
  rankUp?: string
  /** Feats this record earned (§1.13.6); the once ledger keeps each to once ever. */
  feats?: Feat[]
}

export type Feat = 'first-set' | 'perfect-workout' | 'three-in-a-row' | 'full-week'

export type RecordResult = { patch: Patch; inverse: Inverse; effects: Effects }

export type RecordAction =
  | {
      type: 'set'
      /** The set the band showed. */
      showing: { workout: number; step: number }
      result: 'done' | 'skip'
      count?: number
      weight?: number
      band?: string
    }
  | { type: 'rating'; rating: Rating; basis: RatingBasis }

export type RecordContext = {
  plan: Plan
  today: number
  now: number
  /** The gap: `cueEvery` in ms (D7). */
  gapMs: number
  setting: Answers['setting']
}

const NOTHING: Patch = { set: {}, append: [] }

/** The load a best is kept under: the weight, the band level, or `any`. */
export const loadKey = (weight: number | undefined, band: string | undefined): string =>
  weight !== undefined ? String(weight) : (band ?? 'any')

/** Whether `count` beats the best at this load; the first set at a load has nothing to beat. */
export const isNewBest = (best: Record<string, number>, count: number, load: string): boolean => {
  const before = best[load]
  return before !== undefined && count > before
}

function inverseOf(store: RecordStore, patch: Patch, id: number, cue: Cue | null): Inverse {
  const restore: Partial<Record<RecordKey, unknown>> = {}
  const remove: RecordKey[] = []
  for (const key of Object.keys(patch.set) as RecordKey[]) {
    const before = store[key]
    if (before === undefined) remove.push(key)
    else restore[key] = before
  }
  return { id, restore, remove, drop: patch.append.length, cue }
}

function recordSet(store: RecordStore, action: Extract<RecordAction, { type: 'set' }>, ctx: RecordContext): RecordResult {
  const current = cueFor(ctx.plan, store.progress, store.targets)
  if (current === null || current.workout !== action.showing.workout || current.step !== action.showing.step) {
    return { patch: NOTHING, inverse: inverseOf(store, NOTHING, ctx.now, null), effects: { isStale: true } }
  }
  const { exercise, planExercise } = current
  const isDone = action.result === 'done'
  const entry: HistoryEntry = {
    kind: 'set',
    t: ctx.now,
    d: ctx.today,
    w: current.workout,
    exercise: exercise.name,
    set: current.set,
    target: exercise.reps,
    result: action.result,
    ...(isDone && action.count !== undefined ? { count: action.count } : {}),
    ...(isDone && action.weight !== undefined ? { weight: action.weight } : {}),
    ...(isDone && action.band !== undefined ? { band: action.band } : {}),
  }
  const effects: Effects = {
    logged: isDone
      ? `Logged ${exercise.name} ${describeAmount(exercise, action.count, action.weight, action.band)}`
      : `Skipped ${exercise.name}`,
  }

  // The `last:` value and personal bests, by the name it is done under.
  const memory = store.lastByExercise[exercise.name] ?? { best: {} }
  const gain = isDone ? gainOver(memory.last, action) : undefined
  if (gain !== undefined) effects.gain = gain
  let lastByExercise = store.lastByExercise
  if (isDone) {
    const best = { ...memory.best }
    if (action.count !== undefined) {
      const load = loadKey(action.weight, action.band)
      if (isNewBest(best, action.count, load)) effects.isNewBest = true
      best[load] = Math.max(best[load] ?? 0, action.count)
    }
    lastByExercise = { ...store.lastByExercise, [exercise.name]: { last: entry, best } }
  }

  // The weight or band used is where the next set starts.
  let targets = store.targets
  if (isDone && (action.weight !== undefined || action.band !== undefined)) {
    const target = targetFor(planExercise, store.targets)
    targets = {
      ...store.targets,
      [planExercise.name]: {
        ...target,
        ...(action.weight === undefined ? {} : { weight: action.weight }),
        ...(action.band === undefined ? {} : { band: action.band }),
      },
    }
  }

  const append: HistoryEntry[] = [entry]
  const { progress, finished } = advance(ctx.plan, store.progress, ctx.today)
  if (finished !== 'set') {
    const half = store.progress.half === true
    append.push({ kind: 'workout-complete', t: ctx.now, d: ctx.today, w: current.workout, ...(half ? { half } : {}) })
    const workout = ctx.plan.workouts[current.workout]
    if (workout !== undefined) {
      const history = [...store.history, entry].slice(-HISTORY_CAP)
      const results = resultsOf(history, current.workout, workout, targets)
      const basis: RatingBasis = { workout: current.workout, targetsBefore: targets, results, ...(half ? { half } : {}) }
      const before = targets
      // The half version counts as showing up, and moves no targets: a full workout earns those.
      if (!half) targets = progressWorkout(workout, targets, results, undefined, ctx.setting)
      effects.workoutDone = {
        workout: current.workout,
        name: workout.name,
        basis,
        isPlanDone: finished === 'plan',
        levelUps: raisedTargets(workout, before, targets).map(raised => raised.name),
      }
    }
  }

  const feats: Feat[] = []
  if (isDone && store.totalDoneSets === 0) feats.push('first-set')
  if (isDone && rankFor(store.totalDoneSets + 1).name !== rankFor(store.totalDoneSets).name) {
    effects.rankUp = rankFor(store.totalDoneSets + 1).name
  }
  if (effects.workoutDone !== undefined) {
    const after = [...store.history, ...append]
    const results = Object.values(effects.workoutDone.basis.results).flat()
    if (effects.workoutDone.basis.half !== true && results.length > 0 && results.every(r => r.result === 'done')) feats.push('perfect-workout')
    if (streak(ctx.plan, after, ctx.today) >= 3) feats.push('three-in-a-row')
    if (isFullWeek(ctx.plan, after, ctx.today)) feats.push('full-week')
  }
  if (feats.length > 0) effects.feats = feats

  const set: Partial<Record<RecordKey, unknown>> = {
    progress,
    nextCueAt: ctx.now + ctx.gapMs,
    ...(isDone ? { totalDoneSets: store.totalDoneSets + 1, lastByExercise } : {}),
    ...(targets === store.targets ? {} : { targets }),
  }
  const patch: Patch = { set, append }
  return { patch, inverse: inverseOf(store, patch, ctx.now, current), effects }
}

/** More than last time: reps or seconds at the same load, or a heavier weight; nothing for a skip or no last. */
function gainOver(last: HistoryEntry | undefined, action: { count?: number; weight?: number; band?: string }): Effects['gain'] {
  if (last === undefined || last.kind !== 'set' || last.result !== 'done') return undefined
  if (action.weight !== undefined && last.weight !== undefined && action.weight > last.weight) return { heavier: true }
  const sameLoad = action.weight === last.weight && action.band === last.band
  if (sameLoad && action.count !== undefined && last.count !== undefined && action.count > last.count) return { more: action.count - last.count }
  return undefined
}

/**
 * The exercises of a workout whose target is higher after than before (more reps, more weight, a harder
 * band or move): the name it is done under now, and its new amount.
 */
export function raisedTargets(workout: Workout, before: Targets, after: Targets): { name: string; amount: string }[] {
  return workout.exercises
    .filter((exercise, i, all) => all.findIndex(other => other.name === exercise.name) === i)
    .filter(exercise => {
      const was = targetFor(exercise, before)
      const now = targetFor(exercise, after)
      const level = (band: string | undefined) => (band === undefined ? -1 : (exercise.band?.levels.indexOf(band) ?? -1))
      // A new move only counts going up: a deload never swaps the move back.
      const isNewMove = now.variant !== undefined && now.variant.name !== was.variant?.name
      if ((now.weight ?? 0) < (was.weight ?? 0) || level(now.band) < level(was.band)) return false
      return isNewMove || now.reps > was.reps || (now.weight ?? 0) > (was.weight ?? 0) || level(now.band) > level(was.band)
    })
    .map(exercise => {
      const target = targetFor(exercise, after)
      const shown = effectiveExercise(exercise, target)
      return { name: shown.name, amount: describeAmount(shown, null, target.weight, target.band) }
    })
}

/** Every scheduled training day of today's Monday-to-Sunday week has a completed workout (days-mode plans only). */
function isFullWeek(plan: Plan, history: readonly HistoryEntry[], today: number): boolean {
  if (!('days' in plan.schedule)) return false
  const { days } = plan.schedule
  const monday = mondayOf(today)
  const scheduled = Array.from({ length: 7 }, (_, i) => monday + i).filter(day => days.includes(weekdayName(day)))
  const completed = new Set(history.filter(e => e.kind === 'workout-complete').map(e => e.d))
  return scheduled.length > 0 && scheduled.every(day => completed.has(day))
}

function recordRating(store: RecordStore, action: Extract<RecordAction, { type: 'rating' }>, ctx: RecordContext): RecordResult {
  const { basis } = action
  const workout = ctx.plan.workouts[basis.workout]
  const entry: HistoryEntry = { kind: 'rating', t: ctx.now, d: ctx.today, w: basis.workout, rating: action.rating }
  const targets =
    workout === undefined || basis.half === true ? store.targets : progressWorkout(workout, basis.targetsBefore, basis.results, action.rating, ctx.setting)
  const patch: Patch = { set: { targets }, append: [entry] }
  return { patch, inverse: inverseOf(store, patch, ctx.now, null), effects: {} }
}

/** The one way an answer changes stored data. */
export function record(store: RecordStore, action: RecordAction, ctx: RecordContext): RecordResult {
  return action.type === 'set' ? recordSet(store, action, ctx) : recordRating(store, action, ctx)
}

/** The store after a patch (what writing it gives), for pure checks. */
export function applyPatch(store: RecordStore, patch: Patch): RecordStore {
  return { ...store, ...(patch.set as Partial<RecordStore>), history: [...store.history, ...patch.append].slice(-HISTORY_CAP) }
}

/** The store after Undo. */
export function applyInverse(store: RecordStore, inverse: Inverse): RecordStore {
  const next: RecordStore = { ...store, ...(inverse.restore as Partial<RecordStore>) }
  for (const key of inverse.remove) (next as Record<string, unknown>)[key] = undefined
  next.history = inverse.drop === 0 ? store.history : store.history.slice(0, -inverse.drop)
  return next
}
