import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import type { Plan } from '../types'
import { arrive, isHisSession, leave, mayVisit, NO_VISIT, VISIT_MS, WORKING_CAP, WORKING_FRESH_MS, withWorking } from '../hooks/visit'
import type { Visit } from '../hooks/visit'
import { BAND, footerLabelOf, NOON, OPTIONS, ownStore, SESSION, TODAY, workout, world } from './world'

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

test('a band left up here after the turn: once he shows up in another session, it goes from here', OPTIONS, async ($, on) => {
  const store = ownStore(on, DUE)
  const { clock } = world(on, PLAN, 'own-store')
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await clock.advance(31_000)
  await $.turn.complete({ turnId: 't1', answer: '', reason: 'answer', durationMs: 31_000, isAborted: false } as never)
  expect(await keys($)).toContain('start')
  // His visit here lapsed; another session's agent started and he went there.
  await clock.advance(VISIT_MS)
  store.set('visit', arrive('other', NOON + 2 * MIN))
  await clock.advance(MIN)
  expect(await keys($)).toEqual([])
})

test('he goes where they prompted last first; elsewhere only once he left it unanswered, or it is idle', () => {
  const working = { me: NOON, there: NOON }
  const there = { session: 'there' }
  expect(mayVisit(NO_VISIT, 'me', NOON, working, there)).toBe(false)
  expect(mayVisit(NO_VISIT, 'there', NOON, working, there)).toBe(true)
  expect(mayVisit(leave('there', NOON), 'me', NOON + 1_000, working, there)).toBe(true)
  expect(mayVisit(NO_VISIT, 'me', NOON, { me: NOON }, there)).toBe(true)
  expect(mayVisit(NO_VISIT, 'me', NOON, working, undefined)).toBe(true)
})

test('his session: the one he visits; else where they prompted last; else any', () => {
  expect(isHisSession(arrive('me', NOON), { session: 'there' }, 'me', NOON)).toBe(true)
  expect(isHisSession(arrive('there', NOON), { session: 'me' }, 'me', NOON)).toBe(false)
  expect(isHisSession(arrive('there', NOON), { session: 'me' }, 'me', NOON + VISIT_MS)).toBe(true)
  expect(isHisSession(NO_VISIT, { session: 'there' }, 'me', NOON)).toBe(false)
  expect(isHisSession(NO_VISIT, undefined, 'me', NOON)).toBe(true)
})

test('the footer: his face only in the session he is in; the others keep the tally and the time', OPTIONS, async ($, on) => {
  const store = ownStore(on, DUE)
  const { clock } = world(on, PLAN, 'own-store')
  await $.session.start(SESSION)
  // A turn here, ended before any set comes: he is here, but raised nothing.
  await $.turn.start({ text: 'go', turnId: 't1' })
  await $.turn.complete({ turnId: 't1', answer: '', reason: 'answer', durationMs: 1_000, isAborted: false } as never)
  expect(await footerLabelOf($)).toBe('👀 💪 0/5 · ready')
  // They prompted in another window: he is there.
  store.set('lastPrompt', { session: 'there', at: NOON + 1_000 })
  await clock.advance(MIN)
  expect(await footerLabelOf($)).toBe('💪 0/5 · ready')
  // A prompt here brings him back.
  await $.turn.start({ text: 'again', turnId: 't2' })
  expect(await footerLabelOf($)).toBe('👀 💪 0/5 · ready')
  // He visits another window (a set up there): not here, prompt or not.
  store.set('visit', arrive('there', NOON + 2 * MIN))
  await clock.advance(MIN)
  expect(await footerLabelOf($)).toMatch(/^💪 /)
})
