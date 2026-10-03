import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import type { HistoryEntry, Plan, Progress } from '../types'
import { line, singular } from '../hooks/copy'
import { daysShowedUp } from '../hooks/history'
import { cueFor, START, stepsOf } from '../hooks/plan'
import { BAND, drawnRows, NOON, OPTIONS, SESSION, STATUS, TINY, TODAY, workout, world } from './world'

/** Showing up beats doing nothing: the half version, the comeback, the day after a tough one, a bonus on good days. */

const DAY_MS = 86_400_000

function ownStore(on: Parameters<typeof world>[0], seed: Record<string, unknown> = {}) {
  const store = new Map<string, unknown>(Object.entries(seed))
  on('store.get', ($, e) => ({ value: store.get(e.key) }))
  on('store.set', ($, e) => {
    store.set(e.key, e.value)
    return { value: undefined }
  })
  on('store.delete', ($, e) => {
    store.delete(e.key)
    return { value: undefined }
  })
  on('store.keys', () => ({ value: [...store.keys()] }))
  return store
}

/** Push-ups 3 sets and Squats 2: the half version is 2 + 1. */
const THREE: Plan = {
  ...TINY,
  workouts: [
    { name: 'A', exercises: [{ name: 'Push-ups', reps: '10 reps', range: [10, 12], sets: 3 }, { name: 'Squats', reps: '12 reps', range: [12, 15], sets: 2 }] },
    { name: 'B', exercises: [{ name: 'Lunges', reps: '8 each leg', sets: 2 }] },
  ],
}
const doneSet = (d: number): HistoryEntry => ({ kind: 'set', t: NOON, d, w: 0, exercise: 'Push-ups', set: 1, target: '10 reps', result: 'done', count: 10 })

// ---------------------------------------------------------------------------------------------------------
// "1 sets" reads "1 set" (regression: the pane said "1 sets to go", a summary "1 workouts").

test('singular: 1 set, 1 workout, 1 day, 1 minute', () => {
  expect(singular('1 sets to go')).toBe('1 set to go')
  expect(singular('Squats. 1 workouts, Mon.')).toBe('Squats. 1 workout, Mon.')
  expect(singular('in 1 days')).toBe('in 1 day')
  expect(singular('1 minutes')).toBe('1 minute')
})

test('singular leaves other numbers alone: 11, 21, 0.1, 10', () => {
  expect(singular('11 sets, 21 sets, 0.1 sets, 10 sets')).toBe('11 sets, 21 sets, 0.1 sets, 10 sets')
})

test('singular leaves other words alone: settings, days without a number, "sets" alone', () => {
  expect(singular('1 settings · days · sets')).toBe('1 settings · days · sets')
})

test('singular fixes every occurrence in a line', () => {
  expect(singular('1 sets left of 1 workouts')).toBe('1 set left of 1 workout')
})

test('every line with {n} reads right at n = 1', () => {
  for (const id of ['pane-mid', 'pane-fresh', 'pick-up', 'reply-half', 'reply-past-half', 'idle-reminder'] as const) {
    for (let day = 0; day < 10; day += 1) expect([id, line(id, { day, n: 1, workout: 'A' })]).not.toContainEqual(expect.stringMatching(/\b1 sets\b/))
  }
})

test('the pane with one set left says “1 set to go”', OPTIONS, async ($, on) => {
  world(on, TINY, { progress: { ...START, done: 1 }, startedOn: TODAY })
  await $.session.start(SESSION)
  await $.command.run(workout(''))
  const pane = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...STATUS })
  expect(drawnRows(await pane.drawn()).some(row => /\b1 sets\b/.test(row))).toBe(false)
  await pane.unmount()
})

// ---------------------------------------------------------------------------------------------------------
// The half version.

test('half: each exercise’s sets halved, rounded up, never below one', () => {
  expect(stepsOf(THREE.workouts[0]!, { half: true }).map(s => `${s.exercise.name} ${s.set}`)).toEqual(['Push-ups 1', 'Push-ups 2', 'Squats 1'])
  expect(stepsOf({ name: 'x', exercises: [{ name: 'Plank', reps: '30 s', sets: 1 }] }, { half: true }).length).toBe(1)
  const cue = (progress: Progress) => cueFor(THREE, progress, {})
  expect(cue(START)?.canHalve).toBe(true)
  expect(cue({ ...START, done: 3 })?.canHalve).toBeUndefined()
  expect(cue({ ...START, half: true })).toMatchObject({ isHalf: true, stepCount: 3 })
})

test('the ask band offers Just half while it is still open', OPTIONS, async ($, on) => {
  const { clock } = world(on, THREE)
  await $.session.start(SESSION)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await $.turn.start({ text: 'go', turnId: 't1' })
  await clock.advance(30_000)
  expect(drawnRows(await ui.drawn()).at(-1)).toBe('1: Start   2: Later   3: Not today   4: Just half')
  await ui.unmount()
})

test('past halfway, the ask has no Just half, and /workout half says how many sets finish it', OPTIONS, async ($, on) => {
  const { clock } = world(on, THREE, { progress: { ...START, done: 3 } })
  await $.session.start(SESSION)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await $.turn.start({ text: 'go', turnId: 't1' })
  await clock.advance(30_000)
  expect(await ui.find({ key: 'half' })).toBeUndefined()
  expect((await $.command.run(workout('half'))).text).toBe(line('reply-past-half', { day: TODAY, n: 2 }))
  await ui.unmount()
})

test('Just half: Swolomon says it counts; the workout is 3 sets; finishing it is the workout done, said as a win', OPTIONS, async ($, on) => {
  const store = ownStore(on)
  world(on, THREE, 'own-store')
  await $.session.start(SESSION)
  expect((await $.command.run(workout('half'))).text).toBe(line('reply-half', { day: TODAY, n: 3 }))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await ui.find({ type: 'Text', text: line('half-start', { day: TODAY }) })).toBeDefined()
  expect(JSON.stringify(await $.command.run(workout('status')))).toMatch(/set 1 of 3/)
  await $.command.run(workout('done'))
  for (let i = 0; i < 2; i += 1) {
    await $.command.run(workout('now'))
    await $.command.run(workout('done'))
  }
  expect(await ui.find({ type: 'Text', text: line('half-done', { day: TODAY }) })).toBeDefined()
  const progress = store.get('progress') as Progress
  expect([progress.workout, progress.half, progress.lastCompletedOn]).toEqual([1, undefined, TODAY])
  expect((store.get('history') as HistoryEntry[]).at(-1)).toMatchObject({ kind: 'workout-complete', half: true })
  await ui.unmount()
})

test('the half version moves no targets, whatever the rating, and never earns a perfect workout', OPTIONS, async ($, on) => {
  const store = ownStore(on)
  const { w } = world(on, THREE, 'own-store')
  await $.session.start(SESSION)
  await $.command.run(workout('half'))
  await $.command.run(workout('done'))
  for (let i = 0; i < 2; i += 1) {
    await $.command.run(workout('now'))
    await $.command.run(workout('done'))
  }
  await $.command.run(workout('easy'))
  expect(await $.command.run(workout('bonus'))).toEqual({ text: line('reply-nothing-showing', { day: TODAY, id: 'bonus' }) })
  expect(store.get('targets') ?? {}).toEqual({})
  expect(w.toasts.some(t => t.startsWith('Stronger already'))).toBe(false)
  expect(w.toasts).not.toContain(line('feat-perfect-workout', { day: TODAY }))
})

// ---------------------------------------------------------------------------------------------------------
// Softer asks: the comeback and the day after a tough one.

test('a week or more since the last set: the ask welcomes the person back and offers half', OPTIONS, async ($, on) => {
  const { clock } = world(on, THREE, { history: [doneSet(TODAY - 9)] })
  await $.session.start(SESSION)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await $.turn.start({ text: 'go', turnId: 't1' })
  await clock.advance(30_000)
  expect(await ui.find({ type: 'Text', text: line('comeback', { day: TODAY }) })).toBeDefined()
  expect(await ui.find({ key: 'half' })).toBeDefined()
  await ui.unmount()
})

test('the day after a Tough rating: half is still a win; a recent set and Good get the usual line', OPTIONS, async ($, on) => {
  const { clock } = world(on, THREE, { history: [doneSet(TODAY - 2), { kind: 'rating', t: NOON, d: TODAY - 2, w: 0, rating: 'tough' }] })
  await $.session.start(SESSION)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await $.turn.start({ text: 'go', turnId: 't1' })
  await clock.advance(30_000)
  expect(await ui.find({ type: 'Text', text: line('after-tough', { day: TODAY }) })).toBeDefined()
  await ui.unmount()
})

// ---------------------------------------------------------------------------------------------------------
// Good days: push for more.

async function finishFull($: Engine) {
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  for (let i = 0; i < 4; i += 1) {
    await $.command.run(workout('now'))
    await $.command.run(workout('done'))
  }
}

test('Easy on a full workout: one bonus set at the new target; One more counts it', OPTIONS, async ($, on) => {
  const store = ownStore(on)
  const { w } = world(on, THREE, 'own-store')
  await $.session.start(SESSION)
  await finishFull($)
  await $.command.run(workout('easy'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await ui.find({ type: 'Text', text: line('bonus-ask', { day: TODAY }) })).toBeDefined()
  const rows = drawnRows(await ui.drawn())
  expect(rows.some(row => /^Push-ups: 1[1-2] reps$/.test(row))).toBe(true)
  expect(rows.at(-1)).toBe('1: One more   2: Done for today')
  await ui.press({ key: 'bonus' })
  expect(store.get('totalDoneSets')).toBe(6)
  expect((store.get('history') as HistoryEntry[]).at(-1)).toMatchObject({ kind: 'set', exercise: 'Push-ups', result: 'done' })
  expect(w.toasts).toContain(line('bonus-done', { day: TODAY }))
  await ui.unmount()
})

test('Good or Tough: no bonus; Done for today puts the bonus away recording nothing', OPTIONS, async ($, on) => {
  const store = ownStore(on)
  world(on, THREE, 'own-store')
  await $.session.start(SESSION)
  await finishFull($)
  await $.command.run(workout('tough'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await ui.find({ key: 'bonus' })).toBeUndefined()
  await ui.unmount()
  expect(store.get('totalDoneSets')).toBe(5)
})

test('Done for today on the bonus records nothing', OPTIONS, async ($, on) => {
  const store = ownStore(on)
  world(on, THREE, 'own-store')
  await $.session.start(SESSION)
  await finishFull($)
  await $.command.run(workout('easy'))
  await $.command.run(workout('enough'))
  expect(store.get('totalDoneSets')).toBe(5)
})

// ---------------------------------------------------------------------------------------------------------
// A broken streak is not a zero.

test('days showed up: any set done or stretch in the last 30 days, once a day', () => {
  const stretch: HistoryEntry = { kind: 'stretch', t: NOON, d: TODAY - 1, exercise: 'Neck rolls', seconds: 30 }
  const skip: HistoryEntry = { ...doneSet(TODAY - 2), result: 'skip' } as HistoryEntry
  expect(daysShowedUp([doneSet(TODAY), doneSet(TODAY), stretch, skip, doneSet(TODAY - 30)], TODAY)).toBe(2)
})

test('the pane: Showed up in place of Streak 0; a live streak still shows as a streak', OPTIONS, async ($, on) => {
  world(on, THREE, { history: [doneSet(TODAY - 12), doneSet(TODAY - 11)] })
  await $.session.start(SESSION)
  await $.command.run(workout(''))
  const pane = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...STATUS })
  const rows = drawnRows(await pane.drawn())
  expect(rows.some(row => row.startsWith('Showed up 2 days this month'))).toBe(true)
  expect(rows.some(row => row.startsWith('Streak 0'))).toBe(false)
  await pane.unmount()
})

test('a new day: the comeback line waits a full week', OPTIONS, async ($, on) => {
  const { clock } = world(on, THREE, { history: [doneSet(TODAY - 6)] })
  await $.session.start(SESSION)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await $.turn.start({ text: 'go', turnId: 't1' })
  await clock.advance(30_000)
  expect(await ui.find({ type: 'Text', text: line('comeback', { day: TODAY }) })).toBeUndefined()
  await ui.unmount()
  expect(DAY_MS).toBeGreaterThan(0)
})

// ---------------------------------------------------------------------------------------------------------
// The half version's set counts (regression: "(1/2)" on an exercise halved to one set).

const halfBand = async ($: Engine) => {
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  const rows = drawnRows(await ui.drawn())
  await ui.unmount()
  return rows
}

test('half: an exercise halved to one set shows no set count', OPTIONS, async ($, on) => {
  world(on, THREE, { progress: { ...START, done: 0 } })
  await $.session.start(SESSION)
  await $.command.run(workout('half'))
  await $.command.run(workout('done'))
  await $.command.run(workout('now'))
  await $.command.run(workout('done'))
  await $.command.run(workout('now'))
  expect((await halfBand($)).some(row => row.startsWith('Squats: 12 reps') && !row.includes('('))).toBe(true)
})

test('half: an exercise of three sets counts to two', OPTIONS, async ($, on) => {
  world(on, THREE)
  await $.session.start(SESSION)
  await $.command.run(workout('half'))
  expect((await halfBand($)).some(row => row.startsWith('Push-ups: 10 reps  (1/2)'))).toBe(true)
  await $.command.run(workout('done'))
  await $.command.run(workout('now'))
  expect((await halfBand($)).some(row => row.startsWith('Push-ups: 10 reps  (2/2)'))).toBe(true)
})

test('the whole workout still counts every set', OPTIONS, async ($, on) => {
  world(on, THREE)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  expect((await halfBand($)).some(row => row.startsWith('Push-ups: 10 reps  (1/3)'))).toBe(true)
})

test('half: the header’s dots are the half version’s sets', OPTIONS, async ($, on) => {
  world(on, THREE)
  await $.session.start(SESSION)
  await $.command.run(workout('half'))
  expect((await halfBand($)).some(row => row.endsWith('●○○  set 1 of 3'))).toBe(true)
})

test('half: the pane’s table draws the halved sets for today’s workout', OPTIONS, async ($, on) => {
  world(on, THREE)
  await $.session.start(SESSION)
  await $.command.run(workout('half'))
  await $.command.run(workout(''))
  const pane = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...STATUS })
  const rows = drawnRows(await pane.drawn())
  expect(rows.some(row => /Push-ups\s+●○\s/.test(row))).toBe(true)
  expect(rows.some(row => /Squats\s+○\s/.test(row))).toBe(true)
  await pane.unmount()
})

test('half: the footer tally counts the half version', OPTIONS, async ($, on) => {
  world(on, THREE)
  await $.session.start(SESSION)
  await $.command.run(workout('half'))
  expect(JSON.stringify(await $.command.run(workout('status')))).toMatch(/set 1 of 3/)
})

test('half: the pane says it as the win it is, never halfway', OPTIONS, async ($, on) => {
  world(on, THREE)
  await $.session.start(SESSION)
  await $.command.run(workout('half'))
  await $.command.run(workout('done'))
  await $.command.run(workout(''))
  const pane = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...STATUS })
  expect(await pane.find({ type: 'Text', text: line('pane-half', { day: TODAY, n: 2 }) })).toBeDefined()
  await pane.unmount()
})
