import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import type { HistoryEntry, Plan } from '../types'
import { closeUnfinished, START } from '../hooks/plan'
import { BAND, drawnRows, footerLabelOf, NOON, OPTIONS, ownStore, SESSION, STATUS, tallyOf, TODAY, workout, world } from './world'

/**
 * The tally is today's, and every open session's (owner, 2026-10-11: "the app seems to have no idea when the
 * day rolls over, I did my workouts 2 days ago and the bottom of the screen says 7/9. Also I notice that not
 * all sessions get updated with the current workout status"; then: "workouts dont carry over days").
 */

const DAY_MS = 86_400_000
const MINUTE = 60_000

/** One workout of five sets, a training day every day. */
const FIVE: Plan = {
  version: 1,
  name: 'Five',
  schedule: { everyNDays: 1 },
  workouts: [
    { name: 'A', exercises: [{ name: 'Push-ups', reps: '10 reps', sets: 5 }] },
    { name: 'B', exercises: [{ name: 'Squats', reps: '20 reps', sets: 1 }] },
  ],
}

/** Set `n` (from 1) of workout `w` (A unless given), logged on `day`. */
const setOn = (day: number, n: number, w = 0): HistoryEntry => ({
  kind: 'set',
  t: NOON - (TODAY - day) * DAY_MS + n,
  d: day,
  w,
  exercise: 'Push-ups',
  set: n,
  target: '10 reps',
  result: 'done',
  count: 10,
})

/** Three of the five sets done two days ago (a Wednesday), the workout left there. */
const LEFT = { progress: { ...START, done: 3 }, history: [setOn(TODAY - 2, 1), setOn(TODAY - 2, 2), setOn(TODAY - 2, 3)] }

/** The partial completion a workout left part way gets, for the day it was done. */
const closedOn = (day: number, n: number): HistoryEntry => ({ kind: 'workout-complete', t: setOn(day, n).t, d: day, w: 0, partial: true })

test('workouts never carry over: one left part way on an earlier day counts for that day, and today is the next workout', OPTIONS, async ($, on) => {
  const store = ownStore(on, LEFT)
  world(on, FIVE, 'own-store')
  await $.session.start(SESSION)
  expect(await tallyOf($)).toBe('💪 0/1')
  expect(store.get('progress')).toEqual({ ...START, workout: 1, lastCompletedOn: TODAY - 2 })
  expect((store.get('history') as HistoryEntry[]).at(-1)).toEqual(closedOn(TODAY - 2, 3))
})

test('a session open past midnight: the day’s unfinished workout closes at midnight', OPTIONS, async ($, on) => {
  const store = ownStore(on, { progress: { ...START, done: 3 }, history: [1, 2, 3].map(n => setOn(TODAY, n)) })
  const { clock } = world(on, FIVE, 'own-store')
  await $.session.start(SESSION)
  expect(await tallyOf($)).toBe('💪 3/5')
  // The next local day (NOON is noon UTC, whatever the zone the tests run in).
  await clock.advance(DAY_MS)
  expect(await tallyOf($)).toBe('💪 0/1')
  expect(store.get('progress')).toEqual({ ...START, workout: 1, lastCompletedOn: TODAY })
})

test('a closed workout moves no targets and asks no rating; the week counts the day', OPTIONS, async ($, on) => {
  const targets = { 'Push-ups': { reps: 10 } }
  const store = ownStore(on, { ...LEFT, targets })
  world(on, FIVE, 'own-store')
  await $.session.start(SESSION)
  expect(store.get('targets')).toEqual(targets)
  await $.command.run(workout(''))
  const pane = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...STATUS })
  const rows = drawnRows(await pane.drawn())
  expect(rows).toContain('0 of 1 set today')
  expect(rows.find(row => row.startsWith('Mon '))).toContain('Wed ●')
  await pane.unmount()
})

test('closing: nothing done, done today, or no log to date it leaves the workout as it is; half is dropped', () => {
  const half = { ...START, done: 2, half: true as const }
  expect(closeUnfinished(FIVE, START, [], TODAY)).toBeNull()
  expect(closeUnfinished(FIVE, { ...START, done: 2 }, [setOn(TODAY - 1, 1), setOn(TODAY, 2)], TODAY)).toBeNull()
  expect(closeUnfinished(FIVE, { ...START, done: 2 }, [], TODAY)).toBeNull()
  expect(closeUnfinished(FIVE, half, [setOn(TODAY - 1, 1), setOn(TODAY - 1, 2)], TODAY)?.progress).toEqual({ ...START, workout: 1, lastCompletedOn: TODAY - 1 })
  // Another workout's sets do not date this one.
  expect(closeUnfinished(FIVE, { ...START, done: 1 }, [setOn(TODAY - 1, 1, 1)], TODAY)).toBeNull()
})

test('the last workout of the plan left part way: the program is complete', OPTIONS, async ($, on) => {
  const store = ownStore(on, { progress: { ...START, workout: 1, done: 0 }, history: [] })
  store.set('progress', { ...START, workout: 1, done: 1 })
  store.set('history', [{ ...setOn(TODAY - 1, 1, 1), exercise: 'Squats' }])
  world(on, { ...FIVE, workouts: [FIVE.workouts[0]!, { name: 'B', exercises: [{ name: 'Squats', reps: '20 reps', sets: 2 }] }] }, 'own-store')
  await $.session.start(SESSION)
  expect((store.get('progress') as { workout: number }).workout).toBe(2)
  expect(JSON.stringify(await $.command.run(workout('status')))).toMatch(/program complete/)
})

test('two sessions see midnight together: the log gets the completion once', OPTIONS, async ($, on) => {
  // The other session closed it already, and this one read the progress before that.
  const store = ownStore(on, { ...LEFT, history: [...LEFT.history, closedOn(TODAY - 2, 3)] })
  world(on, FIVE, 'own-store')
  await $.session.start(SESSION)
  expect((store.get('history') as HistoryEntry[]).filter(e => e.kind === 'workout-complete')).toHaveLength(1)
})

test('while the agent works, a set logged in another session reaches this session’s tally within a minute', OPTIONS, async ($, on) => {
  const store = ownStore(on, {})
  const { clock } = world(on, FIVE, 'own-store')
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  store.set('progress', { ...START, done: 1 })
  store.set('history', [setOn(TODAY, 1)])
  await clock.advance(MINUTE)
  expect(await tallyOf($)).toBe('💪 1/5')
})

test('a session nobody is using catches up within five minutes, and never redraws for nothing', OPTIONS, async ($, on) => {
  const store = ownStore(on, {})
  const { clock } = world(on, FIVE, 'own-store')
  await $.session.start(SESSION)
  expect(await tallyOf($)).toBe('💪 0/5')
  store.set('progress', { ...START, done: 1 })
  store.set('history', [setOn(TODAY, 1)])
  await clock.advance(4 * MINUTE)
  expect(await tallyOf($)).toBe('💪 0/5')
  await clock.advance(MINUTE)
  expect(await tallyOf($)).toBe('💪 1/5')
})

test('Not today said in another session takes the tally away here too: within a minute in use, five idle', OPTIONS, async ($, on) => {
  const store = ownStore(on, {})
  const { clock } = world(on, FIVE, 'own-store')
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  expect(await tallyOf($)).toBe('💪 0/5')
  store.set('declinedOn', TODAY)
  await clock.advance(MINUTE)
  expect(await tallyOf($)).toBeUndefined()
})

test('a session nobody is using: Not today there reaches it at its next look', OPTIONS, async ($, on) => {
  const store = ownStore(on, {})
  const { clock } = world(on, FIVE, 'own-store')
  await $.session.start(SESSION)
  store.set('declinedOn', TODAY)
  await clock.advance(5 * MINUTE)
  expect(await tallyOf($)).toBeUndefined()
})

test('a prompt in a session shows the tally as the store has it, without waiting for the minute', OPTIONS, async ($, on) => {
  const store = ownStore(on, {})
  world(on, FIVE, 'own-store')
  await $.session.start(SESSION)
  store.set('progress', { ...START, done: 2 })
  store.set('history', [setOn(TODAY, 1), setOn(TODAY, 2)])
  await $.turn.start({ text: 'go', turnId: 't1' })
  expect(await tallyOf($)).toBe('💪 2/5')
})

test('Later in another session: this session’s “ready” becomes the same countdown within a minute', OPTIONS, async ($, on) => {
  const store = ownStore(on, { startedOn: TODAY, nextCueAt: NOON })
  const { clock } = world(on, FIVE, 'own-store')
  await $.session.start(SESSION)
  // In use: its turn just ended.
  await $.turn.start({ text: 'go', turnId: 't1' })
  await $.turn.complete({ turnId: 't1', answer: '', reason: 'end_turn', durationMs: 1_000, isAborted: false } as never)
  expect(await footerLabelOf($)).toMatch(/💪 0\/5 · ready$/)
  // Later there: the next set fifteen minutes on.
  store.set('nextCueAt', NOON + 15 * MINUTE)
  await clock.advance(MINUTE)
  expect(await footerLabelOf($)).toBe('💪 0/5 · 14m')
})

test('a session left alone over an hour looks every half hour; a prompt there brings it back to every minute', OPTIONS, async ($, on) => {
  const store = ownStore(on, {})
  const { clock } = world(on, FIVE, 'own-store')
  await $.session.start(SESSION)
  await clock.advance(60 * MINUTE)
  store.set('progress', { ...START, done: 1 })
  store.set('history', [setOn(TODAY, 1)])
  await clock.advance(25 * MINUTE)
  expect(await tallyOf($)).toBe('💪 0/5')
  await clock.advance(5 * MINUTE)
  expect(await tallyOf($)).toBe('💪 1/5')
  await $.turn.start({ text: 'go', turnId: 't1' })
  store.set('progress', { ...START, done: 2 })
  store.set('history', [setOn(TODAY, 1), setOn(TODAY, 2)])
  await clock.advance(MINUTE)
  expect(await tallyOf($)).toBe('💪 2/5')
})

// ---------------------------------------------------------------------------------------------------------
// Later is nothing unasked until the gap ends, in every session (owner, 2026-10-12: "If the user says 'later'
// then dont show up to ask him questions about himself I got asked what I lift to after saying later in
// different agent window. Also the cooldown times do not seem to be sycned between windows").

async function bandKeys($: Engine): Promise<string[]> {
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  const keys = (await ui.findAll({ type: 'Button' })).map(b => String(b.key))
  await ui.unmount()
  return keys
}

/** Just remind me, nothing logged yet today: the set is due, and a quiet moment is open to him. */
const REMIND = { mode: 'remind', about: {} }

test('Later on the set: no question of his for the rest of the gap, even with nothing else due', OPTIONS, async ($, on) => {
  ownStore(on, REMIND)
  const { clock } = world(on, null, 'own-store')
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await clock.advance(31_000)
  expect(await bandKeys($)).toContain('later')
  await $.command.run(workout('later'))
  await $.turn.start({ text: 'go on', turnId: 't2' })
  for (let i = 0; i < 12; i++) {
    await clock.advance(MINUTE)
    expect(await bandKeys($)).not.toContain('pass')
  }
})

test('Later said in another session: no question here either, until the gap ends', OPTIONS, async ($, on) => {
  ownStore(on, { ...REMIND, nextCueAt: NOON + 15 * MINUTE, laterUntil: NOON + 15 * MINUTE })
  const { clock } = world(on, null, 'own-store')
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  for (let i = 0; i < 10; i++) {
    await clock.advance(MINUTE)
    expect(await bandKeys($)).toEqual([])
  }
})

test('his question showing here goes when Later is said in another session', OPTIONS, async ($, on) => {
  const store = ownStore(on, { ...REMIND, nextCueAt: NOON + 10 * MINUTE })
  const { clock } = world(on, null, 'own-store')
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await clock.advance(31_000)
  expect(await bandKeys($)).toContain('pass')
  store.set('nextCueAt', NOON + 25 * MINUTE)
  store.set('laterUntil', NOON + 25 * MINUTE)
  await clock.advance(MINUTE)
  expect(await bandKeys($)).toEqual([])
})

test('a set waiting here for Start goes when another session says Later, and both count down alike', OPTIONS, async ($, on) => {
  const store = ownStore(on, { startedOn: TODAY, nextCueAt: NOON })
  const { clock } = world(on, FIVE, 'own-store')
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await clock.advance(31_000)
  expect(await bandKeys($)).toContain('start')
  store.set('nextCueAt', NOON + 20 * MINUTE)
  store.set('laterUntil', NOON + 20 * MINUTE)
  await clock.advance(MINUTE)
  expect(await bandKeys($)).toEqual([])
  expect(await footerLabelOf($)).toMatch(/💪 0\/5 · 19m$/)
})

test('a set waiting here goes once it is logged in another session; one already started stays to be answered', OPTIONS, async ($, on) => {
  const store = ownStore(on, { startedOn: TODAY, nextCueAt: NOON })
  const { clock } = world(on, FIVE, 'own-store')
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await clock.advance(31_000)
  expect(await bandKeys($)).toContain('start')
  // Started here, then logged there: how it went is still asked here (Done then finds it stale).
  await $.command.run(workout('start'))
  store.set('progress', { ...START, done: 1, doneBy: [1, 0], cursor: 0 })
  store.set('history', [setOn(TODAY, 1)])
  store.set('nextCueAt', NOON + 16 * MINUTE)
  await clock.advance(MINUTE)
  expect(await bandKeys($)).toContain('all')
  expect(await tallyOf($)).toBe('💪 1/5')
})
