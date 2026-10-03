import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import { asidesAllowed, engagementOf, extrasCap, OUTCOMES_KEPT, recordOutcome, spend, START_ATTENTION } from '../hooks/attention'
import type { Attention } from '../hooks/attention'
import { line } from '../hooks/copy'
import { ANIMATED, BAND, drawnRows, mountAt, NOON, ONBOARDED, OPTIONS, ownStore, SESSION, TINY, TODAY, workout, world } from './world'

/**
 * Reading the room (owner, 2026-10-03: "what is the big thing that we're missing"): his extras on one
 * budget, quieter when ignored, livelier when answered; the person's setting first.
 */

const ignored = (n: number): Attention => ({ outcomes: Array.from({ length: n }, () => 0 as const), day: 0, spent: 0 })
const answered = (n: number): Attention => ({ outcomes: Array.from({ length: n }, () => 1 as const), day: 0, spent: 0 })
const REMIND = { mode: 'remind' }
const done = (turnId: string) => ({ turnId, answer: '', reason: 'answer', durationMs: 61_000, isAborted: false }) as never

async function keysOf($: Engine) {
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  const keys = (await ui.findAll({ type: 'Button' })).map(b => String(b.key))
  await ui.unmount()
  return keys
}

test('engagement: a half to start; then the share answered', () => {
  expect(engagementOf([])).toBe(0.5)
  expect(engagementOf([0, 0])).toBe(0.5)
  expect(engagementOf([1, 0, 1, 1])).toBe(0.75)
  expect(recordOutcome(answered(OUTCOMES_KEPT), false).outcomes).toHaveLength(OUTCOMES_KEPT)
  expect(recordOutcome(START_ATTENTION, true).outcomes).toEqual([1])
})

test('the extras a day: none Quiet, eight Chatty; adaptive one to six, four to start', () => {
  expect(extrasCap('quiet', 1)).toBe(0)
  expect(extrasCap('chatty', 0)).toBe(8)
  expect([0, 0.25, 0.5, 1].map(e => extrasCap('adaptive', e))).toEqual([1, 2, 4, 6])
  expect([0, 0.25, 0.5].map(e => asidesAllowed('adaptive', e))).toEqual([0, 2, 5])
  expect(asidesAllowed('quiet', 1)).toBe(0)
  expect(asidesAllowed('chatty', 0)).toBe(5)
})

test('spending: while the day’s cap lasts; a new day, a new budget', () => {
  const one = spend(START_ATTENTION, TODAY, 1)
  expect(one.allowed).toBe(true)
  expect(spend(one.attention, TODAY, 1).allowed).toBe(false)
  expect(spend(one.attention, TODAY + 1, 1)).toEqual({ attention: { ...one.attention, day: TODAY + 1, spent: 1 }, allowed: true })
})

test('a reminder answered counts as answered; one left as they prompt again counts as ignored', OPTIONS, async ($, on) => {
  const store = ownStore(on, REMIND)
  const { clock } = world(on, null, 'own-store')
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await clock.advance(61_000)
  await $.command.run(workout('upper'))
  await $.turn.complete(done('t1'))
  expect((store.get('attention') as Attention).outcomes).toEqual([1])
  await clock.advance(16 * 60_000)
  await $.turn.start({ text: 'go', turnId: 't2' })
  await clock.advance(61_000)
  expect(await keysOf($)).toContain('upper')
  await $.turn.complete(done('t2'))
  await $.turn.start({ text: 'next thing', turnId: 't3' })
  expect((store.get('attention') as Attention).outcomes).toEqual([1, 0])
})

test('a press answers too', OPTIONS, async ($, on) => {
  const store = ownStore(on, REMIND)
  const { clock } = world(on, null, 'own-store')
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await clock.advance(61_000)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await ui.press({ key: 'later' })
  await ui.unmount()
  expect((store.get('attention') as Attention).outcomes).toEqual([1])
})

test('animated: ignored lately, a waiting band gets no asides', ANIMATED, async ($, on) => {
  const { clock } = world(on, null, { ...REMIND, attention: ignored(10) })
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  const ui = await mountAt($, 200)
  let seen = false
  for (let t = 0; t < 150_000; t += 1000) {
    await clock.advance(1000)
    seen ||= drawnRows(await ui.drawn()).some(r => r.includes('   / '))
  }
  await ui.unmount()
  expect(seen).toBe(false)
})

test('Quiet: no hello, no question, no asides; the workout still asks', { options: { ...ANIMATED.options, coachChat: 'quiet' } }, async ($, on) => {
  const { clock, w } = world(on, null, { ...REMIND, lastSeenOn: TODAY - 3, about: {} })
  await $.session.start(SESSION)
  expect(w.toasts.some(t => t === line('greet-missed', { day: TODAY, n: 3 }))).toBe(false)
  await $.turn.start({ text: 'go', turnId: 't1' })
  const ui = await mountAt($, 200)
  let aside = false
  for (let t = 0; t < 120_000; t += 1000) {
    await clock.advance(1000)
    aside ||= drawnRows(await ui.drawn()).some(r => r.includes('   / '))
  }
  const keys = (await ui.findAll({ type: 'Button' })).map(b => String(b.key))
  await ui.unmount()
  expect(aside).toBe(false)
  expect(keys).toContain('upper')
})

test('the day’s extras spent: the hello held back, and the day toast as usual', OPTIONS, async ($, on) => {
  const { w } = world(on, TINY, { lastSeenOn: TODAY - 3, attention: { outcomes: [], day: TODAY, spent: 4 } })
  await $.session.start(SESSION)
  expect(w.toasts.some(t => t === line('greet-missed', { day: TODAY, n: 3 }))).toBe(false)
  expect(w.toasts).toHaveLength(1)
})

test('ignored lately: one extra a day; the question comes, a second extra does not', OPTIONS, async ($, on) => {
  const store = ownStore(on, { mode: 'remind', about: {}, nextCueAt: NOON + 10 * 60_000, attention: ignored(10), seen: { ...ONBOARDED }, gyms: ['work'] })
  const { clock } = world(on, null, 'own-store')
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await clock.advance(31_000)
  expect(await keysOf($)).toEqual(['a', 'b', 'c', 'pass'])
  expect((store.get('attention') as Attention).spent).toBe(1)
  await $.session.start({ ...SESSION, cwd: '/home/me/elsewhere' })
  expect((store.get('attention') as Attention).spent).toBe(1)
  expect(store.get('gyms')).toEqual(['work', 'elsewhere'])
})
