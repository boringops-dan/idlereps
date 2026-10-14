import { expect, test } from 'claude-code/testing'

import { startOfDayMs } from '../hooks/plan'
import { laterUntil } from '../hooks/schedule'
import { NOON, OPTIONS, ownStore, SESSION, TINY, TODAY, workout, world } from './world'

/**
 * Rest between sets (owner, 2026-10-12: "the cooldown between SETS should be 2-3 min no?"): three minutes by
 * default; Later, "not now", still waits at least fifteen.
 */

const MIN = 60_000
/** The settings as a new install has them: no rest between sets chosen. */
const DEFAULTS = { options: { cueAfter: '30', coachAnimation: false, warmUp: false } } as const
const THREE = { options: { ...OPTIONS.options, cueEvery: '3' } } as const

test('by default a set is three minutes after the last one', DEFAULTS, async ($, on) => {
  const store = ownStore(on, {})
  world(on, TINY, 'own-store')
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  expect(store.get('nextCueAt')).toBe(NOON + 3 * MIN)
})

test('Later hides the set fifteen minutes, not the three of the rest, and says so', THREE, async ($, on) => {
  const store = ownStore(on, {})
  world(on, TINY, 'own-store')
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  expect(JSON.stringify(await $.command.run(workout('later')))).toContain('Hidden for 15 minutes')
  expect(store.get('nextCueAt')).toBe(NOON + 15 * MIN)
  expect(store.get('laterUntil')).toBe(NOON + 15 * MIN)
})

test('a rest longer than fifteen minutes is Later’s wait too', { options: { ...OPTIONS.options, cueEvery: '30' } }, async ($, on) => {
  const store = ownStore(on, {})
  world(on, TINY, 'own-store')
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  await $.command.run(workout('later'))
  expect(store.get('nextCueAt')).toBe(NOON + 30 * MIN)
})

/** Each Later in a row waits twice the one before (owner, 2026-10-14). */

test('Laters in a row wait 15, 30, 60, then 120 minutes', THREE, async ($, on) => {
  const store = ownStore(on, {})
  world(on, TINY, 'own-store')
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  const waits: number[] = []
  for (let i = 0; i < 4; i += 1) {
    await $.command.run(workout('later'))
    waits.push(((store.get('laterUntil') as number) - NOON) / MIN)
  }
  expect(waits).toEqual([15, 30, 60, 120])
  expect(store.get('nextCueAt')).toBe(NOON + 120 * MIN)
})

test('a longer rest doubles too: 30, then 60', { options: { ...OPTIONS.options, cueEvery: '30' } }, async ($, on) => {
  const store = ownStore(on, {})
  world(on, TINY, 'own-store')
  await $.session.start(SESSION)
  await $.command.run(workout('later'))
  await $.command.run(workout('later'))
  expect(store.get('laterUntil')).toBe(NOON + 60 * MIN)
})

test('a set done ends the run: the next Later is back to the base wait', THREE, async ($, on) => {
  const store = ownStore(on, {})
  const { clock } = world(on, { ...TINY, workouts: [{ name: 'A', exercises: [{ name: 'Push-ups', reps: '10 reps', sets: 5 }] }] }, 'own-store')
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  await $.command.run(workout('later'))
  await $.command.run(workout('later'))
  await clock.advance(30 * MIN)
  await $.command.run(workout('now'))
  await $.command.run(workout('done'))
  const at = NOON + 30 * MIN
  await $.command.run(workout('later'))
  expect(store.get('laterUntil')).toBe(at + 15 * MIN)
})

test('the run of Laters counts across sessions: a Later in another window doubles on this one', THREE, async ($, on) => {
  const store = ownStore(on, { laterStreak: { day: TODAY, n: 2 } })
  world(on, TINY, 'own-store')
  await $.session.start(SESSION)
  await $.command.run(workout('later'))
  expect(store.get('laterUntil')).toBe(NOON + 60 * MIN)
  expect(store.get('laterStreak')).toEqual({ day: TODAY, n: 3 })
})

test('yesterday’s run is over: the first Later today waits the base', THREE, async ($, on) => {
  const store = ownStore(on, { laterStreak: { day: TODAY - 1, n: 6 } })
  world(on, TINY, 'own-store')
  await $.session.start(SESSION)
  await $.command.run(workout('later'))
  expect(store.get('laterUntil')).toBe(NOON + 15 * MIN)
})

test('laterUntil: doubles each time, never past midnight, and always the base wait', () => {
  const base = 15 * MIN
  const midnight = startOfDayMs(TODAY + 1)
  expect([1, 2, 3, 4].map(n => (laterUntil(NOON, base, n, midnight) - NOON) / MIN)).toEqual([15, 30, 60, 120])
  // Seven in a row from noon would be sixteen hours: it stops at midnight.
  expect(laterUntil(NOON, base, 7, midnight)).toBe(midnight)
  expect(laterUntil(NOON, base, 40, midnight)).toBe(midnight)
  // Five minutes before midnight, even the tenth Later still waits the base.
  expect(laterUntil(midnight - 5 * MIN, base, 10, midnight)).toBe(midnight - 5 * MIN + base)
  // n below 1 is the first.
  expect(laterUntil(NOON, base, 0, midnight)).toBe(NOON + base)
})

test('after a set, the next comes once the rest is over, not sooner', THREE, async ($, on) => {
  const store = ownStore(on, {})
  const { clock } = world(on, { ...TINY, workouts: [{ name: 'A', exercises: [{ name: 'Push-ups', reps: '10 reps', sets: 3 }] }] }, 'own-store')
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  await $.turn.start({ text: 'go', turnId: 't1' })
  await clock.advance(2 * MIN)
  expect(JSON.stringify(await $.command.run(workout('done')))).toMatch(/No set is showing/)
  await clock.advance(MIN + 31_000)
  await $.command.run(workout('done'))
  expect((store.get('progress') as { done: number }).done).toBe(2)
})
