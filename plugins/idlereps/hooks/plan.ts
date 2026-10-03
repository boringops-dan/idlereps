/**
 * The plan file and where the person is in it: parsing, the legacy (prototype) file, the current set and
 * advancing past it. Pure.
 */

import type { Answers, Cue, Equipment, Exercise, Plan, Progress, Schedule, Target, Targets, Weekday, Workout } from '../types'

export const START: Progress = { workout: 0, done: 0, lastCompletedOn: null, extraDay: null }

export const WEEKDAYS: readonly Weekday[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

export const planPathOf = (home: string) => `${home}/.claude/idlereps/plan.json`
export const legacyPathOf = (home: string) => `${home}/.claude/workout-plan.json`

/** The local calendar day number of an epoch time. */
export const dayNumberOf = (ms: number): number =>
  Math.floor((ms - new Date(ms).getTimezoneOffset() * 60_000) / 86_400_000)

/** The first moment of a local day (its local midnight), the inverse of `dayNumberOf`. */
export const startOfDayMs = (day: number): number => {
  const guess = day * 86_400_000
  return guess + new Date(guess).getTimezoneOffset() * 60_000
}

/** The local hour (0 to 23) of an epoch time. */
export const hourOf = (ms: number): number => new Date(ms).getHours()

type Raw = Record<string, unknown>

const isObject = (value: unknown): value is Raw => typeof value === 'object' && value !== null && !Array.isArray(value)
const isWholeIn = (value: unknown, low: number, high: number): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= low && value <= high

function parseSchedule(raw: unknown): Schedule {
  if (!isObject(raw)) throw new Error('"schedule" must be {"days": ["mon", ...]} or {"everyNDays": 2}')
  if ('days' in raw) {
    const days = raw.days
    if (!Array.isArray(days) || days.length === 0) throw new Error('"schedule.days" must list at least one weekday')
    for (const day of days) {
      if (!WEEKDAYS.includes(day as Weekday)) {
        throw new Error(`"schedule.days" has an unknown weekday ${JSON.stringify(day)}; use ${WEEKDAYS.join(', ')}`)
      }
    }
    return { days: days as Weekday[] }
  }
  if ('everyNDays' in raw) {
    if (!isWholeIn(raw.everyNDays, 1, 7)) throw new Error('"schedule.everyNDays" must be a whole number from 1 to 7')
    return { everyNDays: raw.everyNDays }
  }
  throw new Error('"schedule" must be {"days": ["mon", ...]} or {"everyNDays": 2}')
}

function parseEquipment(raw: unknown, field: string): Equipment {
  const keys = ['dumbbells', 'bar', 'bands'] as const
  if (!isObject(raw) || Object.keys(raw).length !== 3 || !keys.every(key => typeof raw[key] === 'boolean')) {
    throw new Error(`"${field}" must be {"dumbbells": true|false, "bar": true|false, "bands": true|false}`)
  }
  return { dumbbells: raw.dumbbells as boolean, bar: raw.bar as boolean, bands: raw.bands as boolean }
}

const oneOf = <T extends string | number>(value: unknown, options: readonly T[]): value is T =>
  options.includes(value as T)

function parseAnswers(raw: unknown): Answers {
  const fail = (field: string) => new Error(`"answers.${field}" is not a setup answer`)
  if (!isObject(raw)) throw new Error('"answers" must be the setup answers object')
  if (!oneOf(raw.template, ['designed', 'ppl'] as const)) throw fail('template')
  if (!oneOf(raw.goal, ['strength', 'general', 'mobility'] as const)) throw fail('goal')
  if (!oneOf(raw.level, ['beginner', 'intermediate', 'advanced'] as const)) throw fail('level')
  const days = raw.template === 'ppl' ? ([3, 6] as const) : ([2, 3, 4, 5] as const)
  if (!oneOf(raw.daysPerWeek, days)) throw fail('daysPerWeek')
  if (!oneOf(raw.setting, ['home', 'office'] as const)) throw fail('setting')
  if (!oneOf(raw.weightUnit, ['kg', 'lb'] as const)) throw fail('weightUnit')
  if (!oneOf(raw.size, ['short', 'medium', 'long'] as const)) throw fail('size')
  if (!oneOf(raw.weeks, [4, 8] as const)) throw fail('weeks')
  return {
    template: raw.template,
    goal: raw.goal,
    equipment: parseEquipment(raw.equipment, 'answers.equipment'),
    level: raw.level,
    daysPerWeek: raw.daysPerWeek,
    setting: raw.setting,
    weightUnit: raw.weightUnit,
    schedule: parseSchedule(raw.schedule),
    size: raw.size,
    weeks: raw.weeks,
  }
}

function parseExercise(raw: unknown, where: string): Exercise {
  if (!isObject(raw) || typeof raw.name !== 'string' || raw.name.trim() === '' || typeof raw.reps !== 'string') {
    throw new Error(`${where} needs a "name" and a "reps" string`)
  }
  const name = raw.name
  if (raw.sets !== undefined && !isWholeIn(raw.sets, 1, 10)) {
    throw new Error(`"sets" of ${name} must be a whole number from 1 to 10`)
  }
  if (raw.note !== undefined && typeof raw.note !== 'string') throw new Error(`"note" of ${name} must be text`)
  const exercise: Exercise = { name, reps: raw.reps, sets: (raw.sets as number | undefined) ?? 1 }
  if (raw.note !== undefined) exercise.note = raw.note as string
  if (raw.range !== undefined) {
    const range = raw.range
    if (
      !Array.isArray(range) ||
      range.length !== 2 ||
      !isWholeIn(range[0], 1, 999) ||
      !isWholeIn(range[1], 1, 999) ||
      range[0] > range[1]
    ) {
      throw new Error(`"range" of ${name} must be two whole numbers, low then high, e.g. [8, 12]`)
    }
    exercise.range = [range[0], range[1]]
  }
  if (raw.weight !== undefined && raw.band !== undefined) {
    throw new Error(`${name} has both "weight" and "band"; an exercise uses one or the other`)
  }
  if (raw.weight !== undefined) {
    const weight = raw.weight
    if (
      !isObject(weight) ||
      typeof weight.start !== 'number' ||
      !(weight.start >= 0) ||
      typeof weight.step !== 'number' ||
      !(weight.step > 0) ||
      !oneOf(weight.unit, ['kg', 'lb'] as const)
    ) {
      throw new Error(`"weight" of ${name} needs a "start" of 0 or more, a "step" above 0 and a "unit" of kg or lb`)
    }
    exercise.weight = { start: weight.start, step: weight.step, unit: weight.unit }
  }
  if (raw.band !== undefined) {
    const band = raw.band
    if (
      !isObject(band) ||
      !Array.isArray(band.levels) ||
      band.levels.length === 0 ||
      !band.levels.every(level => typeof level === 'string' && level !== '') ||
      typeof band.start !== 'string' ||
      !band.levels.includes(band.start)
    ) {
      throw new Error(`"band" of ${name} needs "levels" (a list of names) and a "start" that is one of them`)
    }
    exercise.band = { levels: band.levels as string[], start: band.start }
  }
  return exercise
}

function parseWorkouts(list: unknown): Workout[] {
  if (!Array.isArray(list) || list.length === 0) throw new Error('"workouts" must be a non-empty list')
  return list.map((raw, i) => {
    if (!isObject(raw) || typeof raw.name !== 'string' || !Array.isArray(raw.exercises) || raw.exercises.length === 0) {
      throw new Error(`workout ${i + 1} needs a "name" and a non-empty "exercises" list`)
    }
    const exercises = raw.exercises.map((ex, j) => parseExercise(ex, `workout ${i + 1}, exercise ${j + 1}`))
    return { name: raw.name, exercises }
  })
}

/** Reads a plan file's text (plan §4.1); throws with a reason naming the field when it is not a plan. */
export function parsePlan(text: string): Plan {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch (error) {
    throw new Error(`it is not valid JSON (${(error as Error).message})`)
  }
  if (!isObject(raw)) throw new Error('it must be a JSON object with "workouts"')
  if (raw.version !== undefined && raw.version !== 1) throw new Error('"version" must be 1')
  if (raw.name !== undefined && typeof raw.name !== 'string') throw new Error('"name" must be text')
  const plan: Plan = {
    version: 1,
    name: (raw.name as string | undefined) ?? 'My plan',
    schedule: raw.schedule === undefined ? { everyNDays: 2 } : parseSchedule(raw.schedule),
    workouts: parseWorkouts(raw.workouts),
  }
  if (raw.builtFor !== undefined) plan.builtFor = parseEquipment(raw.builtFor, 'builtFor')
  if (raw.answers !== undefined) plan.answers = parseAnswers(raw.answers)
  return plan
}

/**
 * The prototype's plan file (D3): `days` is the workout list, `restDaysBetween` the schedule; the cadence
 * fields are dropped (cadence is userConfig now). Throws when it is not one.
 */
export function parseLegacyPlan(text: string): Plan {
  const raw = JSON.parse(text) as unknown
  if (!isObject(raw) || typeof raw.restDaysBetween !== 'number' || !Number.isInteger(raw.restDaysBetween)) {
    throw new Error('not a prototype plan')
  }
  const everyNDays = Math.min(7, Math.max(1, raw.restDaysBetween + 1))
  const legacyWorkouts = Array.isArray(raw.days)
    ? raw.days.map(day => {
        if (!isObject(day)) return day
        const exercises = Array.isArray(day.exercises)
          ? day.exercises.map(ex => {
              if (!isObject(ex) || !isObject(ex.weight)) return ex
              // The prototype's unit was free text; anything but lb was kilograms.
              return { ...ex, weight: { ...ex.weight, unit: ex.weight.unit === 'lb' ? 'lb' : 'kg' } }
            })
          : day.exercises
        return { ...day, exercises }
      })
    : raw.days
  return { version: 1, name: 'My plan', schedule: { everyNDays }, workouts: parseWorkouts(legacyWorkouts) }
}

/** Every set of a workout, in order. */
export const stepsOf = (workout: Workout, opts: { half?: boolean } = {}): { exercise: Exercise; set: number }[] =>
  workout.exercises.flatMap(exercise =>
    Array.from({ length: setsOf(exercise, opts.half === true) }, (_, i) => ({ exercise, set: i + 1 })),
  )

/** An exercise's sets: at least 1, halved (rounded up) in the half version of a workout. */
export const setsOf = (exercise: Exercise, half: boolean): number => {
  const sets = Math.max(1, exercise.sets)
  return half ? Math.ceil(sets / 2) : sets
}

/** The steps of the workout `progress` is on, as chosen: whole, or the half version. */
export const stepsFor = (workout: Workout, progress: Progress) => stepsOf(workout, { half: progress.half === true })

/** The number a target asks for and what follows it: "10 reps" → 10, " reps"; "40 s each side" → 40. */
export const targetOf = (reps: string): { value: number; unit: string; isTimed: boolean } | null => {
  const match = /^\s*(\d+)(.*)$/.exec(reps)
  if (match === null) return null
  const unit = match[2] ?? ''
  return { value: Number(match[1]), unit, isTimed: /^\s*s\b/.test(unit) }
}

/**
 * About how long a set takes, in seconds, to say on the ask band: a timed set its seconds, reps about 3 s
 * each; "each side" or "each leg" twice over; 10 s to get set; rounded up to 15 s.
 */
export function setSeconds(exercise: Exercise, count: number | null | undefined): number {
  return Math.ceil(workSeconds(exercise.reps, count) / 15) * 15
}

/** A set's time unrounded, from its target ("10 reps", "30 s each side") and the count done. */
export function workSeconds(reps: string, count: number | null | undefined): number {
  const target = targetOf(reps)
  if (target === null) return 30
  const value = count ?? target.value
  const sides = /\beach\b/.test(target.unit) ? 2 : 1
  return (target.isTimed ? value : value * 3) * sides + 10
}

/** Minutes as people say them: "4 min", "1 h 12 min", "3 h". */
export function minutesWords(seconds: number): string {
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`
}

/** A set's time as people say it: "30 s", "1 min", "2 min". */
export const timeWords = (seconds: number): string => (seconds < 60 ? `${seconds} s` : `${Math.round(seconds / 60)} min`)

/** One press of < or > on the count: steps of 1, or 5 for timed sets; never below one step, at most 999. */
export const stepCount = (count: number, isTimed: boolean, direction: 1 | -1): number => {
  const step = isTimed ? 5 : 1
  return Math.min(999, Math.max(step, count + direction * step))
}

/** One press of < or > on the weight: by the exercise's step, never below 0 nor above 999, without float drift. */
export const stepWeight = (weight: number, step: number, direction: 1 | -1): number =>
  Math.min(999, Math.max(0, Math.round((weight + direction * step) * 100) / 100))

/** One press of < or > on a band level: the next level, stopping at either end. */
export const stepBand = (levels: readonly string[], level: string, direction: 1 | -1): string => {
  const at = Math.max(0, levels.indexOf(level))
  return levels[Math.min(levels.length - 1, Math.max(0, at + direction))] ?? level
}

/** Where a plan exercise's target starts: the bottom of its range, its start weight or band. */
export function initialTarget(exercise: Exercise): Target {
  const base = exercise.range?.[0] ?? targetOf(exercise.reps)?.value ?? 0
  return {
    reps: base,
    ...(exercise.weight === undefined ? {} : { weight: exercise.weight.start }),
    ...(exercise.band === undefined ? {} : { band: exercise.band.start }),
    belowStreak: 0,
    toughStreak: 0,
  }
}

/**
 * A plan exercise's current target: the stored one, else where it starts. A stored target with no reps yet
 * (a weight carried over from the prototype, D18 step 0 → 1) takes its reps from the start.
 */
export function targetFor(exercise: Exercise, targets: Targets): Target {
  const stored = targets[exercise.name]
  const start = initialTarget(exercise)
  if (stored === undefined) return start
  return stored.reps >= 1 ? stored : { ...start, ...stored, reps: start.reps }
}

/** A plan exercise as it is done now: the variant it moved to, and today's target as its reps text. */
export function effectiveExercise(planExercise: Exercise, target: Target | undefined): Exercise {
  const variant = target?.variant
  const base: Exercise =
    variant === undefined ? planExercise : { ...planExercise, name: variant.name, reps: variant.reps, range: variant.range }
  const parsed = targetOf(base.reps)
  if (target === undefined || parsed === null || base.range === undefined) return base
  return { ...base, reps: `${target.reps}${parsed.unit}` }
}

/** The set due now in the current workout, or null when the plan is finished. */
export function cueFor(plan: Plan, progress: Progress, targets: Targets): Cue | null {
  const workout = plan.workouts[progress.workout]
  if (workout === undefined) return null
  const steps = stepsFor(workout, progress)
  const step = steps[progress.done]
  if (step === undefined) return null
  const target = targetFor(step.exercise, targets)
  const exercise = effectiveExercise(step.exercise, target)
  return {
    workout: progress.workout,
    workoutNumber: progress.workout + 1,
    workoutCount: plan.workouts.length,
    workoutName: workout.name,
    step: progress.done + 1,
    stepCount: steps.length,
    set: step.set,
    planExercise: step.exercise,
    exercise,
    count: targetOf(exercise.reps)?.value ?? null,
    weight: exercise.weight === undefined ? null : (target.weight ?? exercise.weight.start),
    band: exercise.band === undefined ? null : (target.band ?? exercise.band.start),
    ...(progress.half === true ? { isHalf: true as const } : progress.done < stepsOf(workout, { half: true }).length ? { canHalve: true as const } : {}),
  }
}

export type Advanced = { progress: Progress; finished: 'set' | 'workout' | 'plan' }

/** Marks the current set done (or skipped); finishing the workout records today as its day. */
export function advance(plan: Plan, progress: Progress, today: number): Advanced {
  const workout = plan.workouts[progress.workout]
  if (workout === undefined) return { progress, finished: 'plan' }
  const done = progress.done + 1
  if (done < stepsFor(workout, progress).length) return { progress: { ...progress, done }, finished: 'set' }
  const { half: _, ...rest } = progress
  const next: Progress = { ...rest, workout: progress.workout + 1, done: 0, lastCompletedOn: today }
  return { progress: next, finished: next.workout >= plan.workouts.length ? 'plan' : 'workout' }
}

/** "10 reps @ 12 kg", "12 reps @ medium band", "30 s": an amount in the exercise's own words. */
export function describeAmount(exercise: Exercise, count: number | null | undefined, weight: number | null | undefined, band: string | null | undefined): string {
  const target = targetOf(exercise.reps)
  const amount = count === null || count === undefined || target === null ? exercise.reps : `${count}${target.unit}`
  if (exercise.weight !== undefined && weight !== null && weight !== undefined) return `${amount} @ ${weight} ${exercise.weight.unit}`
  if (exercise.band !== undefined && band !== null && band !== undefined) return `${amount} @ ${band} band`
  return amount
}

/** The workout's name without its "Week N · " prefix. */
export const shortWorkoutName = (name: string): string => name.replace(/^Week \d+ · /, '')

/** The week of a workout name ("Week 3 · Legs" → 3), or null when it has none. */
export const weekOf = (name: string): number | null => {
  const match = /^Week (\d+) · /.exec(name)
  return match === null ? null : Number(match[1])
}

/**
 * The program week a workout belongs to and how far through it `completed` workouts are: the finish line
 * a week draws. Only plans whose workouts carry "Week N · " names have weeks.
 */
export function weekProgress(plan: Plan, completed: number, index: number): { week: number; done: number; total: number } | null {
  const workout = plan.workouts[index]
  const week = workout === undefined ? null : weekOf(workout.name)
  if (week === null) return null
  const inWeek = plan.workouts.map((w, i) => ({ i, week: weekOf(w.name) })).filter(w => w.week === week)
  return { week, done: inWeek.filter(w => w.i < completed).length, total: inWeek.length }
}

/** What `/workout plan <text>` asks the model (D8): the plan's types, verbatim, and JSON only. */
export const PLAN_PROMPT = `Convert the user's training plan description into JSON matching this TypeScript type. Answer with JSON only.

export type Weekday = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat'
export type Schedule = { days: Weekday[] } | { everyNDays: number }
export type Load = { start: number; step: number; unit: 'kg' | 'lb' }
export type BandLevels = { levels: string[]; start: string }   // e.g. ["light","medium","heavy","x-heavy"]
export type Exercise = {
  name: string
  reps: string                 // the starting target, e.g. "8 reps", "30 s", "10 each leg"
  range?: [number, number]     // double-progression rep (or seconds) range, e.g. [8, 12]; absent = fixed
  sets: number
  note?: string
  weight?: Load                // weighted exercise: the weight stepper and "@ 12 kg"
  band?: BandLevels            // band exercise: the level stepper and "@ medium band"; never with weight
}
export type Workout = { name: string; exercises: Exercise[] }
export type Plan = {
  version: 1; name: string; schedule: Schedule; workouts: Workout[]
}`

/** The model's answer with a leading and trailing code fence taken off. */
export const stripFence = (text: string): string =>
  text.trim().replace(/^```[a-zA-Z]*\s*\n?/, '').replace(/\n?```\s*$/, '').trim()
