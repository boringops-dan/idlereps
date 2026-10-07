import { expect, test } from 'claude-code/testing'

import type { Exercise, HistoryEntry, Plan, SetResult, Target } from '../types'
import { appendHistory, HISTORY_CAP, nextTarget, streak, weekMarks } from '../hooks/history'
import { STEPS } from '../hooks/migrations'
import type { Snapshot } from '../hooks/migrations'
import { START } from '../hooks/plan'
import { harderVariant, OFFICE_REPLACED } from '../hooks/programs'
import { moveForExercise } from '../hooks/moves'
import { answerSet, BAND, NOON, OPTIONS, SESSION, TINY, TODAY, workout, world } from './world'

/** History, streaks, week marks and double progression (plan §5.3, Task 4). */

const T = (reps: number, extra: Partial<Target> = {}): Target => ({ reps, belowStreak: 0, toughStreak: 0, ...extra })
const done = (...counts: number[]): SetResult[] => counts.map(count => ({ result: 'done', count }))

const PUSHUPS: Exercise = { name: 'Push-ups', reps: '12 reps', range: [12, 18], sets: 3 }
const DUMBBELL: Exercise = { name: 'Goblet squats', reps: '10 reps', range: [10, 15], sets: 3, weight: { start: 10, step: 2, unit: 'kg' } }
const BAND_ROWS: Exercise = { name: 'Band rows', reps: '12 reps', range: [12, 18], sets: 2, band: { levels: ['light', 'medium', 'heavy', 'x-heavy'], start: 'light' } }
const PLANK: Exercise = { name: 'Plank', reps: '20 s', range: [20, 40], sets: 2 }
const INCLINE: Exercise = { name: 'Incline push-ups', reps: '10 reps', range: [10, 15], sets: 2 }

test('every set at the top: weight up one step and reps back to the bottom', () => {
  expect(nextTarget(DUMBBELL, T(15, { weight: 12 }), done(15, 15, 15), 'good', 'home')).toEqual(T(10, { weight: 14 }))
  expect(nextTarget(DUMBBELL, T(15, { weight: 12 }), done(15, 15, 14), 'good', 'home')).toEqual(T(15, { weight: 12, belowStreak: 1 }))
})

test('every set at the target: +1 when Good or unrated, +2 when Easy, nothing when Tough', () => {
  expect(nextTarget(PUSHUPS, T(12), done(12, 12, 12), 'good', 'home').reps).toBe(13)
  expect(nextTarget(PUSHUPS, T(12), done(12, 12, 12), undefined, 'home').reps).toBe(13)
  expect(nextTarget(PUSHUPS, T(12), done(12, 12, 12), 'easy', 'home').reps).toBe(14)
  expect(nextTarget(PUSHUPS, T(12), done(12, 12, 12), 'tough', 'home').reps).toBe(12)
})

test('never above the top of the range; timed targets move by 5 s (10 s when Easy)', () => {
  expect(nextTarget(PUSHUPS, T(17), done(17, 17, 17), 'easy', 'home').reps).toBe(18)
  expect(nextTarget(PLANK, T(20), done(20, 20), 'good', 'home').reps).toBe(25)
  expect(nextTarget(PLANK, T(20), done(20, 20), 'easy', 'home').reps).toBe(30)
})

test('three workouts in a row below target deload: weight − 10 % rounded down to the step, at most one step', () => {
  let t = T(12, { weight: 20 })
  t = nextTarget(DUMBBELL, t, done(12, 11, 10), 'good', 'home')
  t = nextTarget(DUMBBELL, t, done(12, 11, 10), 'good', 'home')
  expect(t.belowStreak).toBe(2)
  expect(t.weight).toBe(20)
  t = nextTarget(DUMBBELL, t, done(12, 11, 10), 'good', 'home')
  expect(t).toEqual(T(12, { weight: 18 }))
  // A heavy weight still drops only one step.
  expect(nextTarget(DUMBBELL, T(12, { weight: 40, belowStreak: 2 }), done(1), 'good', 'home').weight).toBe(38)
  expect(nextTarget(DUMBBELL, T(12, { weight: 2, belowStreak: 2 }), done(1), 'good', 'home').weight).toBe(0)
})

test('two Tough ratings in a row deload; a good workout resets both streaks', () => {
  const once = nextTarget(PUSHUPS, T(14), done(14, 14, 14), 'tough', 'home')
  expect(once).toEqual(T(14, { toughStreak: 1 }))
  expect(nextTarget(PUSHUPS, once, done(14, 14, 14), 'tough', 'home')).toEqual(T(12))
  const reset = nextTarget(PUSHUPS, T(14, { belowStreak: 2, toughStreak: 1 }), done(14, 14, 14), 'good', 'home')
  expect(reset).toEqual(T(15))
})

test('skips count as below target', () => {
  const t = nextTarget(PUSHUPS, T(12), [{ result: 'done', count: 12 }, { result: 'skip' }, { result: 'done', count: 12 }], 'good', 'home')
  expect(t).toEqual(T(12, { belowStreak: 1 }))
})

test('bands step a level up at the top and down on a deload; past the heaviest, the reps keep climbing', () => {
  expect(nextTarget(BAND_ROWS, T(18, { band: 'light' }), done(18, 18), 'good', 'home')).toEqual(T(12, { band: 'medium' }))
  expect(nextTarget(BAND_ROWS, T(18, { band: 'x-heavy' }), done(18, 18), 'good', 'home')).toEqual(T(19, { band: 'x-heavy' }))
  expect(nextTarget(BAND_ROWS, T(12, { band: 'medium', belowStreak: 2 }), done(1, 1), 'good', 'home').band).toBe('light')
  expect(nextTarget(BAND_ROWS, T(12, { band: 'light', belowStreak: 2 }), done(1, 1), 'good', 'home').band).toBe('light')
})

test('bodyweight at the top moves to the next level’s variant; at the hardest, the reps keep climbing', () => {
  const pushups = nextTarget(INCLINE, T(15), done(15, 15), 'good', 'home')
  expect(pushups.variant).toEqual({ name: 'Push-ups', reps: '12 reps', range: [12, 18] })
  expect(pushups.reps).toBe(12)
  const decline = nextTarget(INCLINE, { ...pushups, reps: 18 }, done(18, 18), 'good', 'home')
  expect(decline.variant?.name).toBe('Decline push-ups')
  const top = nextTarget(INCLINE, { ...decline, reps: 18 }, done(18, 18), 'good', 'home')
  expect(top.variant?.name).toBe('Decline push-ups')
  expect(top.reps).toBe(19)
  // Same-name rows never swap: a hold just gets longer.
  expect(nextTarget(PLANK, T(40), done(40, 40), 'good', 'home')).toEqual(T(45))
})

test('office mode moves on only to standing, quiet exercises; at the last, the reps keep climbing', () => {
  const desk: Exercise = { name: 'Desk push-ups', reps: '10 reps', range: [10, 15], sets: 2 }
  const closeGrip = nextTarget(desk, T(15), done(15, 15), 'good', 'office')
  expect(closeGrip.variant).toEqual({ name: 'Close-grip desk push-ups', reps: '10 reps', range: [10, 15] })
  expect(nextTarget(desk, { ...closeGrip, reps: 15 }, done(15, 15), 'good', 'office')).toMatchObject({ variant: { name: 'Close-grip desk push-ups' }, reps: 16 })
  const wall: Exercise = { name: 'Wall push-ups', reps: '15 reps', range: [15, 23], sets: 2 }
  expect(nextTarget(wall, T(23), done(23, 23), 'good', 'office').variant?.name).toBe('Desk push-ups')
  expect(nextTarget(wall, T(23), done(23, 23), 'good', 'home').variant?.name).toBe('Pike push-ups')
})

test('office squats step up to pulse squats, then Bulgarian split squats; reverse lunges go there too', () => {
  const squats: Exercise = { name: 'Squats', reps: '12 reps', range: [12, 18], sets: 2 }
  const pulse = nextTarget(squats, T(18), done(18, 18), 'good', 'office')
  expect(pulse.variant).toEqual({ name: 'Pulse squats', reps: '12 reps', range: [12, 18] })
  expect(nextTarget(squats, { ...pulse, reps: 18 }, done(18, 18), 'good', 'office').variant?.name).toBe('Bulgarian split squats')
  const lunges: Exercise = { name: 'Reverse lunges', reps: '6 each leg', range: [6, 9], sets: 2 }
  expect(nextTarget(lunges, T(9), done(9, 9), 'good', 'office').variant).toEqual({ name: 'Bulgarian split squats', reps: '8 each leg', range: [8, 12] })
})

test('every office step-up is standing and quiet, and Swolomon has its own demo', () => {
  for (const name of ['Wall push-ups', 'Desk push-ups', 'Squats', 'Pulse squats', 'Reverse lunges']) {
    const next = harderVariant(name, 'office')
    expect(next).not.toBeNull()
    expect(OFFICE_REPLACED).not.toContain(next?.name)
    expect(moveForExercise(next?.name ?? '')).not.toBeNull()
  }
})

test('at the last step, Easy climbs two and a hold five seconds; Tough holds it', () => {
  const angels: Exercise = { name: 'Wall angels', reps: '8 reps', range: [8, 12], sets: 2 }
  expect(nextTarget(angels, T(12), done(12, 12), 'easy', 'office').reps).toBe(14)
  expect(nextTarget(angels, T(12), done(12, 12), 'tough', 'office').reps).toBe(12)
  const plank: Exercise = { name: 'Desk plank', reps: '30 s', range: [30, 60], sets: 2 }
  expect(nextTarget(plank, T(60), done(60, 60), 'good', 'office').reps).toBe(65)
})

test('past the top, a missed target still holds it, and three misses still deload', () => {
  const angels: Exercise = { name: 'Wall angels', reps: '8 reps', range: [8, 12], sets: 2 }
  expect(nextTarget(angels, T(14), done(14, 13), 'good', 'office').reps).toBe(14)
  expect(nextTarget(angels, T(14, { belowStreak: 2 }), done(10, 10), 'good', 'office').reps).toBe(12)
})

test('the climb stops at 999, the most a set can log', () => {
  const angels: Exercise = { name: 'Wall angels', reps: '8 reps', range: [8, 12], sets: 2 }
  expect(nextTarget(angels, T(999), done(999, 999), 'easy', 'office').reps).toBe(999)
})

test('a plan exercise with no range keeps its target', () => {
  const fixed: Exercise = { name: 'Stretch', reps: '30 s', sets: 1 }
  expect(nextTarget(fixed, T(30), done(60), 'easy', 'home')).toEqual(T(30))
})

const VARIANT_PLAN: Plan = {
  ...TINY,
  schedule: { everyNDays: 1 },
  workouts: [
    { name: 'A', exercises: [{ name: 'Incline push-ups', reps: '10 reps', range: [10, 15], sets: 1 }] },
    { name: 'B', exercises: [{ name: 'Incline push-ups', reps: '10 reps', range: [10, 15], sets: 1 }] },
  ],
}

test('after a swap the band and last: use the variant; Undo of the set that swapped puts it back', OPTIONS, async ($, on) => {
  const { clock } = world(on, VARIANT_PLAN, { targets: { 'Incline push-ups': T(15) } })
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await ui.find({ type: 'Text', text: /Incline push-ups: 15 reps/ })).toBeDefined()
  await answerSet(ui, 'done')
  await ui.press({ key: 'undo' })
  expect(await ui.find({ type: 'Text', text: /Incline push-ups: 15 reps/ })).toBeDefined()
  await answerSet(ui, 'done')
  await ui.press({ key: 'good' })
  await clock.advance(86_400_000)
  await $.command.run(workout('start'))
  expect(await ui.find({ type: 'Text', text: /^Push-ups: 12 reps/ })).toBeDefined()
  await ui.unmount()
})

// ---------------------------------------------------------------------------------------------------------

const complete = (d: number): HistoryEntry => ({ kind: 'workout-complete', t: 0, d, w: 0 })
const MWF: Plan = { ...TINY, schedule: { days: ['mon', 'wed', 'fri'] } }
/** TODAY is a Friday; Monday and Wednesday of its week. */
const MON = TODAY - 4
const WED = TODAY - 2

test('streak: rest days never break it, a missed training day does, and today untrained does not', () => {
  expect(streak(MWF, [], TODAY)).toBe(0)
  expect(streak(MWF, [complete(MON), complete(WED)], TODAY)).toBe(2)
  expect(streak(MWF, [complete(MON - 2), complete(MON), complete(WED)], TODAY)).toBe(3)
  // Monday missed between last Friday and Wednesday.
  expect(streak(MWF, [complete(MON - 3), complete(WED)], TODAY)).toBe(1)
  // Wednesday missed before today: broken now.
  expect(streak(MWF, [complete(MON)], TODAY)).toBe(0)
  expect(streak(MWF, [complete(WED), complete(TODAY)], TODAY)).toBe(2)
})

test('streak, every N days: a gap longer than N breaks it', () => {
  const plan: Plan = { ...TINY, schedule: { everyNDays: 2 } }
  expect(streak(plan, [complete(TODAY - 4), complete(TODAY - 2)], TODAY)).toBe(2)
  expect(streak(plan, [complete(TODAY - 5), complete(TODAY - 2)], TODAY)).toBe(1)
  expect(streak(plan, [complete(TODAY - 3)], TODAY)).toBe(0)
})

test('week marks: completed, started, a training day untrained, and not a training day', () => {
  const set: HistoryEntry = { kind: 'set', t: 0, d: WED, w: 1, exercise: 'x', set: 1, target: '1', result: 'done', count: 1 }
  const marks = weekMarks(MWF, START, [complete(MON), set], TODAY)
  expect(marks).toEqual(['●', '·', '◐', '·', '○', '·', '·'])
})

test('the history keeps the newest 5000 entries', () => {
  const many = Array.from({ length: HISTORY_CAP }, (_, i): HistoryEntry => complete(i))
  const next = appendHistory(many, complete(HISTORY_CAP))
  expect(next.length).toBe(HISTORY_CAP)
  expect(next[0]).toEqual(complete(1))
  expect(next.at(-1)).toEqual(complete(HISTORY_CAP))
})

test('migration 0 → 1: the prototype log and weights move; running it twice changes nothing more', () => {
  const step = STEPS[0]
  if (step === undefined) throw new Error('no step 0')
  const snapshot: Snapshot = {
    log: [
      { kind: 'set', t: NOON, workout: 0, exercise: 'Goblet squats', set: 1, target: '10 reps', result: 'done', count: 9, weight: 12, weightUnit: 'kg' },
      { kind: 'rating', t: NOON, workout: 0, rating: 'tough' },
    ],
    weights: { 'Goblet squats': 12 },
    progress: { day: 1, done: 0, finishedOnDay: TODAY },
  }
  const change = step(snapshot)
  expect(change.set.history).toEqual([
    { kind: 'set', t: NOON, d: TODAY, w: 0, exercise: 'Goblet squats', set: 1, target: '10 reps', result: 'done', count: 9, weight: 12 },
    { kind: 'rating', t: NOON, d: TODAY, w: 0, rating: 'tough' },
  ])
  expect(change.set.targets).toEqual({ 'Goblet squats': { reps: 0, weight: 12, belowStreak: 0, toughStreak: 0 } })
  expect(change.set.progress).toEqual({ workout: 1, done: 0, lastCompletedOn: TODAY, extraDay: null })
  expect(change.remove).toEqual(['log', 'weights'])
  const again = step({ history: change.set.history, targets: change.set.targets, progress: change.set.progress })
  expect(again).toEqual({ set: { schemaVersion: 1 }, remove: [] })
})

test('a migrated weight is where the next set starts', OPTIONS, async ($, on) => {
  const plan: Plan = { ...TINY, workouts: [{ name: 'W', exercises: [{ name: 'Goblet squats', reps: '10 reps', range: [10, 15], sets: 2, weight: { start: 8, step: 2, unit: 'kg' } }] }] }
  world(on, plan, { weights: { 'Goblet squats': 14 } })
  await $.session.start(SESSION)
  expect(JSON.stringify(await $.command.run(workout('start')))).toMatch(/Goblet squats, 10 reps @ 14 kg/)
})
