import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import type { Plan } from '../types'
import { arrive, leave, mayVisit, NO_VISIT, VISIT_MS, WORKING_CAP, WORKING_FRESH_MS, withWorking } from '../hooks/visit'
import type { Visit } from '../hooks/visit'
import { BAND, NOON, OPTIONS, ownStore, SESSION, TODAY, workout, world } from './world'

/**
 * One Swolomon (owner, 2026-10-12: "Dp you think we can limit Swolomon to showing up in one agent window at a
 * time? Or maybe he'll spend one minute in one session, dismiss and then go into a different window looking
 * for the user?"). The other session is the shared store's `visit` and `working`.
 */

const MIN = 60_000
const PLAN: Plan = { version: 1, name: 'P', schedule: { everyNDays: 1 }, workouts: [{ name: 'A', exercises: [{ name: 'Push-ups', reps: '10 reps', sets: 5 }] }] }
/** A set due now, today's workout started. */
const DUE = { startedOn: TODAY, nextCueAt: NOON }

async function keys($: Engine): Promise<string[]> {
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  const found = (await ui.findAll({ type: 'Button' })).map(b => String(b.key))
  await ui.unmount()
  return found
}

test('the visit: here already or nowhere; never where he is now; just left, the others look first', () => {
  const working = { other: NOON }
  expect(mayVisit(NO_VISIT, 'me', NOON, working)).toBe(true)
  expect(mayVisit(arrive('me', NOON), 'me', NOON, working)).toBe(true)
  expect(mayVisit(arrive('other', NOON), 'me', NOON + 30_000, working)).toBe(false)
  // The other session vanished mid-visit: free once its minute is up.
  expect(mayVisit(arrive('other', NOON), 'me', NOON + VISIT_MS, working)).toBe(true)
  expect(mayVisit(leave('me', NOON), 'me', NOON + 30_000, working)).toBe(false)
  expect(mayVisit(leave('me', NOON), 'other', NOON + 30_000, working)).toBe(true)
  // Nobody else working: he comes back to where he was.
  expect(mayVisit(leave('me', NOON), 'me', NOON + 30_000, {})).toBe(true)
})

test('the working list: fresh sessions only, the newest kept up to its cap', () => {
  expect(withWorking({ old: NOON - WORKING_FRESH_MS, other: NOON - MIN }, 'me', NOON, true)).toEqual({ me: NOON, other: NOON - MIN })
  expect(withWorking({ me: NOON - MIN, other: NOON }, 'me', NOON, false)).toEqual({ other: NOON })
  const many = Object.fromEntries(Array.from({ length: 40 }, (_, i) => [`s${i}`, NOON - i]))
  expect(Object.keys(withWorking(many, 'me', NOON, true))).toHaveLength(WORKING_CAP)
})

test('he is in another session: no set here; once he is free, it shows here', OPTIONS, async ($, on) => {
  const store = ownStore(on, { ...DUE, visit: arrive('other', NOON + 10_000), working: { other: NOON } })
  const { clock } = world(on, PLAN, 'own-store')
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await clock.advance(31_000)
  expect(await keys($)).toEqual([])
  // Answered there: the visit is free.
  store.set('visit', NO_VISIT)
  await clock.advance(MIN)
  expect(await keys($)).toContain('start')
  expect((store.get('visit') as Visit).session).not.toBeNull()
})

test('a minute unanswered with another agent working: he leaves to look there, and the set waits', OPTIONS, async ($, on) => {
  const store = ownStore(on, DUE)
  const { clock } = world(on, PLAN, 'own-store')
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await clock.advance(31_000)
  expect(await keys($)).toContain('start')
  const here = (store.get('visit') as Visit).session!
  store.set('working', { ...(store.get('working') as object), other: NOON + 31_000 })
  await clock.advance(VISIT_MS)
  expect(await keys($)).toEqual([])
  expect(store.get('visit')).toMatchObject({ session: null, left: here })
  // Nobody answered there either: back here a minute later, the same set.
  await clock.advance(VISIT_MS + 2_000)
  expect(await keys($)).toContain('start')
})

test('alone, he stays: a minute unanswered with no other agent working keeps the set up', OPTIONS, async ($, on) => {
  ownStore(on, DUE)
  const { clock } = world(on, PLAN, 'own-store')
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await clock.advance(31_000)
  await clock.advance(3 * VISIT_MS)
  expect(await keys($)).toContain('start')
})

test('answered here (Later): the visit is free at once for the others', OPTIONS, async ($, on) => {
  const store = ownStore(on, DUE)
  const { clock } = world(on, PLAN, 'own-store')
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await clock.advance(31_000)
  expect((store.get('visit') as Visit).session).not.toBeNull()
  await $.command.run(workout('later'))
  expect(store.get('visit')).toEqual(NO_VISIT)
})

test('a turn running counts this session as working; its end takes it off the list', OPTIONS, async ($, on) => {
  const store = ownStore(on, {})
  world(on, PLAN, 'own-store')
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  expect(Object.keys(store.get('working') as object)).toHaveLength(1)
  await $.turn.complete({ turnId: 't1', answer: '', reason: 'answer', durationMs: 60_000, isAborted: false } as never)
  expect(store.get('working')).toEqual({})
})
