import { expect, test } from 'claude-code/testing'

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

test('a busy day (Later three times running): Later waits thirty minutes', THREE, async ($, on) => {
  const store = ownStore(on, { easyDay: TODAY })
  world(on, TINY, 'own-store')
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  await $.command.run(workout('later'))
  expect(store.get('nextCueAt')).toBe(NOON + 30 * MIN)
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
