import { expect, test } from 'claude-code/testing'

import type { HistoryEntry, Plan } from '../types'
import { START } from '../hooks/plan'
import { todayOf } from '../hooks/status'
import { drawnRows, NOON, OPTIONS, ownStore, SESSION, STATUS, tallyOf, TODAY, workout, world } from './world'

/**
 * The tally is today's, and every open session's (owner, 2026-10-11: "the app seems to have no idea when the
 * day rolls over, I did my workouts 2 days ago and the bottom of the screen says 7/9. Also I notice that not
 * all sessions get updated with the current workout status").
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

/** Three of the five sets done two days ago (a Wednesday), none today. */
const CARRIED = { progress: { ...START, done: 3 }, history: [setOn(TODAY - 2, 1), setOn(TODAY - 2, 2), setOn(TODAY - 2, 3)] }

test('a workout left unfinished on an earlier day: the tally counts today, out of what was left', OPTIONS, async ($, on) => {
  world(on, FIVE, CARRIED)
  await $.session.start(SESSION)
  expect(await tallyOf($)).toBe('💪 0/2')
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  expect(await tallyOf($)).toBe('💪 1/2')
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  expect(await tallyOf($)).toBe('💪 done')
})

test('the pane says the same of today, and when the rest was done', OPTIONS, async ($, on) => {
  world(on, FIVE, CARRIED)
  await $.session.start(SESSION)
  await $.command.run(workout(''))
  const pane = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...STATUS })
  expect(drawnRows(await pane.drawn())).toContain('0 of 2 sets today · 3 done Wed')
  await pane.unmount()
})

test('today’s sets and the carried ones are told apart, a reset never counts its old sets, and no log says “before”', () => {
  const both = { plan: FIVE, today: TODAY, progress: { ...START, done: 3 }, history: [setOn(TODAY - 1, 1), setOn(TODAY - 1, 2), setOn(TODAY, 3)] }
  expect(todayOf(both)).toEqual({ done: 1, total: 3, carried: 2, carriedOn: TODAY - 1 })
  // `/workout reset` after three sets today, then one more: the one counts, the three are not carried.
  const reset = { plan: FIVE, today: TODAY, progress: { ...START, done: 1 }, history: [1, 2, 3, 1].map(n => setOn(TODAY, n)) }
  expect(todayOf(reset)).toEqual({ done: 1, total: 5, carried: 0, carriedOn: undefined })
  // Progress with no log behind it (a hand-edited store): all of it is from before today.
  expect(todayOf({ plan: FIVE, today: TODAY, progress: { ...START, done: 2 }, history: [] })).toEqual({ done: 0, total: 3, carried: 2, carriedOn: undefined })
  // Another workout's sets today are not this one's.
  expect(todayOf({ plan: FIVE, today: TODAY, progress: START, history: [setOn(TODAY, 1, 1)] })).toEqual({ done: 0, total: 5, carried: 0, carriedOn: undefined })
})

test('while the agent works, a set logged in another session reaches this session’s tally within a minute', OPTIONS, async ($, on) => {
  const store = ownStore(on, {})
  const { clock } = world(on, FIVE, 'own-store')
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  // The look that was due before the turn, then the turn's own: every minute from there.
  await clock.advance(5 * MINUTE)
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

test('Not today said in another session takes the tally away here too', OPTIONS, async ($, on) => {
  const store = ownStore(on, {})
  const { clock } = world(on, FIVE, 'own-store')
  await $.session.start(SESSION)
  expect(await tallyOf($)).toBe('💪 0/5')
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

test('the next day, an unfinished workout from yesterday: the tally starts over at what is left', OPTIONS, async ($, on) => {
  const { clock } = world(on, FIVE, { progress: { ...START, done: 3 }, history: [1, 2, 3].map(n => setOn(TODAY, n)) })
  await $.session.start(SESSION)
  expect(await tallyOf($)).toBe('💪 3/5')
  await clock.advance(DAY_MS)
  expect(await tallyOf($)).toBe('💪 0/2')
})

test('one set left of today’s: “1 set”, never “1 sets”', OPTIONS, async ($, on) => {
  world(on, FIVE, { progress: { ...START, done: 4 }, history: [1, 2, 3, 4].map(n => setOn(TODAY - 1, n)) })
  await $.session.start(SESSION)
  await $.command.run(workout(''))
  const pane = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...STATUS })
  expect(drawnRows(await pane.drawn())).toContain('0 of 1 set today · 4 done Thu')
  await pane.unmount()
})
