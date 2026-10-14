import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import type { Answers, Exercise, Plan, Progress } from '../types'
import { line } from '../hooks/copy'
import { advance, canTrade, cueFor, replaceMove, START, tradeWorkout } from '../hooks/plan'
import { alternativesTo } from '../hooks/programs'
import { record } from '../hooks/record'
import type { RecordStore } from '../hooks/record'
import { BAND, NOON, OPTIONS, ownStore, SESSION, TINY, TODAY, workout, world } from './world'

/**
 * Choosing what to do today (owner, 2026-10-14: "I may want to skip leg day and swap it with another day.
 * Right now i cna't do that, I also can't chooe to do a different move."): Swap day trades today's workout
 * with a later one; Different move does this exercise as another of the library's today.
 */

const names = (exercises: readonly Exercise[]) => exercises.map(e => e.name)
const HOME: Answers = {
  template: 'ppl',
  goal: 'strength',
  equipment: { dumbbells: false, bar: false, bands: false },
  level: 'beginner',
  daysPerWeek: 3,
  setting: 'home',
  weightUnit: 'kg',
  schedule: { everyNDays: 2 },
  size: 'short',
  weeks: 4,
}
const squats: Exercise = { name: 'Squats', reps: '12 reps', sets: 3, range: [12, 18] }
const rows: Exercise = { name: 'Dumbbell rows', reps: '10 each side', sets: 3, weight: { start: 20, step: 5, unit: 'lb' } }

const PPL: Plan = {
  version: 1,
  name: 'PPL',
  schedule: { everyNDays: 2 },
  workouts: [1, 2].flatMap(week => [
    { name: `Week ${week} · Push`, exercises: [{ name: 'Push-ups', reps: `${10 + week} reps`, sets: 2 }] },
    { name: `Week ${week} · Pull`, exercises: [{ name: 'Superman hold', reps: `${20 + week} s`, sets: 2 }] },
    { name: `Week ${week} · Legs`, exercises: [{ name: 'Squats', reps: `${12 + week} reps`, sets: 2 }] },
  ]),
}
const ON_LEGS: Progress = { ...START, workout: 2 }

// ---------------------------------------------------------------------------------------------------------
// Different move.

test('a different move: the library’s others for the same job at the same level, only what the kit allows', () => {
  expect(names(alternativesTo(squats, new Set(), HOME))).toEqual(['Sumo squats'])
  const withDumbbells = alternativesTo(squats, new Set(), { ...HOME, equipment: { ...HOME.equipment, dumbbells: true }, weightUnit: 'lb' })
  expect(names(withDumbbells)).toEqual(['Goblet squats', 'Dumbbell sumo squats', 'Sumo squats'])
  // A weighted one starts at the plan's level, in its unit, and keeps the exercise's sets.
  expect(withDumbbells[0]).toMatchObject({ reps: '10 reps', sets: 3, weight: { start: 12, step: 5, unit: 'lb' } })
})

test('a plan without answers: bodyweight moves, and those needing the kit the exercise itself needs, in its unit', () => {
  const moves = alternativesTo(rows, new Set(), undefined)
  expect(names(moves)).toEqual(['Superman hold', 'Dumbbell renegade rows', 'Prone W-raises'])
  expect(moves[1]?.weight?.unit).toBe('lb')
})

test('never itself, never one the workout already has, nothing for a move the library does not know, none of the extras in the office', () => {
  expect(names(alternativesTo(rows, new Set(['Superman hold']), undefined))).toEqual(['Dumbbell renegade rows', 'Prone W-raises'])
  expect(alternativesTo({ name: 'Zercher carry', reps: '30 s', sets: 3 }, new Set(), HOME)).toEqual([])
  expect(alternativesTo({ name: 'Desk push-ups', reps: '10 reps', sets: 3 }, new Set(), { ...HOME, setting: 'office' })).toEqual([])
})

test('Different move goes through the others in turn, then back to the plan’s own; the sets done still count', () => {
  const tiny = TINY.workouts[0]!
  const moved = (progress: Progress | null) => (progress === null ? null : cueFor(TINY, progress, {})?.exercise.name)
  const one = replaceMove(TINY, { ...START, done: 1, doneBy: [1] }, {})
  expect(moved(one)).toBe('Wide push-ups')
  expect(one?.doneBy).toEqual([1])
  const two = replaceMove(TINY, one!, {})
  expect(moved(two)).toBe('Plank shoulder taps')
  const back = replaceMove(TINY, two!, {})
  expect(moved(back)).toBe(tiny.exercises[0]!.name)
  expect(back?.replaced).toBeUndefined()
})

test('the cue for a move done instead: its name and target, the plan’s exercise kept, and Different move still open', () => {
  const progress = replaceMove(TINY, START, {})!
  const cue = cueFor(TINY, progress, {})!
  expect(cue).toMatchObject({ exercise: { name: 'Wide push-ups', reps: '10 reps' }, planExercise: { name: 'Push-ups' }, replacedBy: { name: 'Wide push-ups' }, canReplace: true })
  expect(cueFor(TINY, START, {})?.replacedBy).toBeUndefined()
})

test('a set of a move done instead: logged and remembered under its own name; the plan’s exercise’s target holds', () => {
  const plan: Plan = { ...TINY, workouts: [{ name: 'Pull', exercises: [{ ...rows, sets: 1 }] }, TINY.workouts[1]!] }
  const progress = replaceMove(plan, START, {})!
  expect(cueFor(plan, progress, {})?.exercise.name).toBe('Superman hold')
  const twice = replaceMove(plan, progress, {})!
  const store: RecordStore = { progress: twice, history: [], targets: {}, lastByExercise: {}, totalDoneSets: 0, nextCueAt: undefined }
  const result = record(store, { type: 'set', showing: { workout: 0, step: 1, slot: 0 }, result: 'done', count: 8, weight: 25 }, { plan, today: TODAY, now: NOON, gapMs: 0, setting: 'home' })
  expect(result.patch.append[0]).toMatchObject({ kind: 'set', exercise: 'Dumbbell renegade rows', weight: 25 })
  const targets = result.patch.set.targets as Record<string, { weight?: number }>
  expect(targets['Dumbbell renegade rows']?.weight).toBe(25)
  expect(targets['Dumbbell rows']).toBeUndefined()
  // The workout done: the move done instead is gone with it.
  expect((result.patch.set.progress as Progress).replaced).toBeUndefined()
})

// ---------------------------------------------------------------------------------------------------------
// Swap day.

const kinds = (plan: Plan) => plan.workouts.map(w => `${w.name}: ${w.exercises[0]!.reps}`)

test('Swap day: legs trades places with the next push, each place keeping its week; again, with the next pull; again, back', () => {
  const one = tradeWorkout(PPL, ON_LEGS)!
  expect(kinds(one.plan)).toEqual(['Week 1 · Push: 11 reps', 'Week 1 · Pull: 21 s', 'Week 1 · Push: 12 reps', 'Week 2 · Legs: 13 reps', 'Week 2 · Pull: 22 s', 'Week 2 · Legs: 14 reps'])
  expect(cueFor(one.plan, one.progress, {})?.workoutName).toBe('Week 1 · Push')
  const two = tradeWorkout(one.plan, one.progress)!
  expect(kinds(two.plan)).toEqual(['Week 1 · Push: 11 reps', 'Week 1 · Pull: 21 s', 'Week 1 · Pull: 22 s', 'Week 2 · Push: 12 reps', 'Week 2 · Legs: 13 reps', 'Week 2 · Legs: 14 reps'])
  const back = tradeWorkout(two.plan, two.progress)!
  expect(back.plan).toEqual(PPL)
  expect(back.progress).toEqual(ON_LEGS)
})

test('Swap day only before today’s first set, and only with another kind of workout ahead', () => {
  expect(tradeWorkout(PPL, { ...ON_LEGS, done: 1 })).toBeNull()
  expect(canTrade(PPL, { ...ON_LEGS, done: 1 })).toBe(false)
  const one: Plan = { ...PPL, workouts: PPL.workouts.filter(w => w.name.endsWith('Legs')) }
  expect(tradeWorkout(one, START)).toBeNull()
  expect(cueFor(one, START, {})?.canTrade).toBeUndefined()
  expect(cueFor(PPL, ON_LEGS, {})?.canTrade).toBe(true)
  // The last workout of the plan has nothing ahead to trade with.
  expect(tradeWorkout(PPL, { ...START, workout: 5 })).toBeNull()
})

test('a finished workout leaves today’s choices behind: the next one is as the plan has it', () => {
  const traded = tradeWorkout(PPL, ON_LEGS)!
  const replaced = replaceMove(traded.plan, { ...traded.progress }, {})!
  let progress = replaced
  for (let i = 0; i < 2; i += 1) progress = advance(traded.plan, progress, TODAY).progress
  expect(progress.workout).toBe(3)
  expect(progress.replaced).toBeUndefined()
  expect(progress.tradedWith).toBeUndefined()
})

// ---------------------------------------------------------------------------------------------------------
// Live.

async function keysOf($: Engine): Promise<{ rows: string; keys: string[] }> {
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  const keys = (await ui.findAll({ type: 'Button' })).map(b => String(b.key))
  const rows = JSON.stringify(await ui.drawn())
  await ui.unmount()
  return { rows, keys }
}

test('live: the ask offers Swap day; pressed, the plan file trades and the ask is about the other workout', OPTIONS, async ($, on) => {
  const { clock, w } = world(on, TINY)
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await clock.advance(30_000)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect((await ui.findAll({ type: 'Button' })).map(b => String(b.key))).toContain('swapday')
  await ui.press({ key: 'swapday' })
  const plan = JSON.parse(w.file.text!) as Plan
  expect(plan.workouts.map(x => `${x.name} ${x.exercises[0]!.name}`)).toEqual(['B Squats', 'A Push-ups'])
  expect(JSON.stringify(await ui.drawn())).toContain('Squats')
  await ui.unmount()
  // Again: back as the plan had it.
  expect((await $.command.run(workout('swapday'))).text).toBe(line('reply-traded', { day: TODAY, workout: 'A' }))
  expect((JSON.parse(w.file.text!) as Plan).workouts[0]!.name).toBe('A')
})

test('live: /workout different does this set as another move; Done logs it by that name', OPTIONS, async ($, on) => {
  const store = ownStore(on, { startedOn: TODAY })
  world(on, TINY, 'own-store')
  await $.session.start(SESSION)
  await $.command.run(workout('now'))
  expect((await keysOf($)).keys).toContain('different')
  expect((await $.command.run(workout('different'))).text).toBe(line('reply-different', { day: TODAY, exercise: 'Wide push-ups' }))
  expect((await keysOf($)).rows).toContain('Wide push-ups')
  await $.command.run(workout('done'))
  const history = store.get('history') as { kind: string; exercise?: string }[]
  expect(history.findLast(e => e.kind === 'set')?.exercise).toBe('Wide push-ups')
})

test('live: once a set is done, Swap day is gone from the set band and the command says why', OPTIONS, async ($, on) => {
  const { clock } = world(on, TINY, { startedOn: TODAY })
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await clock.advance(31_000)
  expect((await keysOf($)).keys).toEqual(['start', 'later', 'notoday', 'different', 'swapday'])
  await $.command.run(workout('done'))
  await clock.advance(16 * 60_000)
  expect((await keysOf($)).keys).toEqual(['start', 'later', 'notoday', 'different'])
  expect((await $.command.run(workout('swapday'))).text).toBe(line('reply-no-trade', { day: TODAY }))
})

test('live: a move the library does not know has no Different move, and the command says so', OPTIONS, async ($, on) => {
  const plan: Plan = { ...TINY, workouts: [{ name: 'A', exercises: [{ name: 'Zercher carry', reps: '30 s', sets: 2 }] }] }
  world(on, plan, { startedOn: TODAY })
  await $.session.start(SESSION)
  await $.command.run(workout('now'))
  expect((await keysOf($)).keys).not.toContain('different')
  expect((await $.command.run(workout('different'))).text).toBe(line('reply-no-different', { day: TODAY }))
})
