import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import { introLines, line } from '../hooks/copy'
import { BAND, drawnRows, OPTIONS, ownStore, SESSION, STATUS, TINY, TODAY, workout, world } from './world'

/**
 * Onboarding (owner, 2026-10-02: "/workout shouldn't just be into a workout where we never talked to the
 * user"): Swolomon introduces himself, then two presses to the first set (or one to keep a plan already
 * there, made by hand or brought from the prototype); the safety note rides on that first offer.
 */

const done = (turnId: string) => ({ turnId, answer: '', reason: 'answer', durationMs: 60_000, isAborted: false }) as never

async function bandOf($: Engine) {
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  const rows = drawnRows(await ui.drawn())
  const has = async (key: string) => (await ui.find({ key })) !== undefined
  const keys = { keep: await has('keep'), quickstart: await has('quickstart'), remind: await has('remind'), start: await has('start') }
  await ui.unmount()
  return { rows, ...keys, text: rows.join('\n') }
}

test('a plan Swolomon never walked in: the first session introduces him, with Keep my plan in place of Quick start', OPTIONS, async ($, on) => {
  const { w } = world(on, TINY, {}, { fresh: true })
  await $.session.start(SESSION)
  const band = await bandOf($)
  expect([band.keep, band.quickstart, band.remind]).toEqual([true, false, true])
  expect(band.text).toContain('You brought your own plan! Keep it, or just get nudges')
  expect(introLines(TODAY, true).slice(0, 3)).toEqual(introLines(TODAY).slice(0, 3))
  expect(w.toasts).toContain(line('installed', { day: TODAY }))
})

test('Keep my plan: one press to today’s first set, the safety note on it; the plan untouched', OPTIONS, async ($, on) => {
  const store = ownStore(on, {}, { fresh: true })
  const { w } = world(on, TINY, 'own-store')
  await $.session.start(SESSION)
  await $.command.run(workout('keep'))
  const offer = await bandOf($)
  expect(offer.start).toBe(true)
  expect(offer.text).toContain(line('safety-short', { day: TODAY }))
  expect((store.get('seen') as Record<string, unknown>).onboarded).toBeDefined()
  expect(w.writes.filter(write => write.path.endsWith('plan.json'))).toEqual([])
})

test('Quick start from nothing: two presses to the first set', OPTIONS, async ($, on) => {
  const store = ownStore(on, {}, { fresh: true })
  world(on, null, 'own-store')
  await $.session.start(SESSION)
  await $.command.run(workout('quickstart'))
  await $.command.run(workout('desk'))
  expect((await bandOf($)).start).toBe(true)
  expect((store.get('seen') as Record<string, unknown>).onboarded).toBeDefined()
})

test('/workout before onboarding: the introduction where they are, not the week', OPTIONS, async ($, on) => {
  const { w } = world(on, TINY, { seen: { intro: { at: 1, n: 1 } } }, { fresh: true })
  await $.session.start(SESSION)
  expect((await $.command.run(workout(''))).text).toBe(line('reply-meet', { day: TODAY }))
  expect(w.opened).not.toContain('workout-status')
  expect((await bandOf($)).keep).toBe(true)
  expect((await $.command.run(workout('status'))).text).toBe(line('reply-meet', { day: TODAY }))
})

test('/workout with no plan and onboarding ahead: the introduction with Quick start', OPTIONS, async ($, on) => {
  world(on, null, { seen: { intro: { at: 1, n: 1 } } }, { fresh: true })
  await $.session.start(SESSION)
  expect((await $.command.run(workout(''))).text).toBe(line('reply-meet', { day: TODAY }))
  const band = await bandOf($)
  expect([band.quickstart, band.keep]).toEqual([true, false])
})

test('/workout after Not now still introduces: asking for it is asking', OPTIONS, async ($, on) => {
  world(on, TINY, {}, { fresh: true })
  await $.session.start(SESSION)
  await $.command.run(workout('notnow'))
  expect((await bandOf($)).keep).toBe(false)
  expect((await $.command.run(workout(''))).text).toBe(line('reply-meet', { day: TODAY }))
  expect((await bandOf($)).keep).toBe(true)
})

test('before onboarding, a long turn brings the ask to begin, never a set', OPTIONS, async ($, on) => {
  const { clock } = world(on, TINY, { seen: { intro: { at: 1, n: 1 } } }, { fresh: true })
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await clock.advance(31_000)
  const band = await bandOf($)
  expect([band.keep, band.start]).toEqual([true, false])
  await $.turn.complete(done('t1'))
})

test('Don’t ask again with a plan there: training goes on with it, sets and all', OPTIONS, async ($, on) => {
  const { clock } = world(on, TINY, {}, { fresh: true })
  await $.session.start(SESSION)
  await $.command.run(workout('dontask'))
  await $.turn.start({ text: 'go', turnId: 't1' })
  await clock.advance(31_000)
  expect((await bandOf($)).start).toBe(true)
})

test('someone who has trained before (an update, not an install) is never walked in again', OPTIONS, async ($, on) => {
  const history = [{ kind: 'set', t: 1, d: TODAY - 1, w: 0, exercise: 'Squat', set: 1, target: '10 reps', result: 'done', count: 10 }]
  const { w } = world(on, TINY, { history }, { fresh: true })
  await $.session.start(SESSION)
  expect((await bandOf($)).keep).toBe(false)
  await $.command.run(workout(''))
  expect(w.opened).toContain('workout-status')
  const pane = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...STATUS })
  expect(drawnRows(await pane.drawn()).length).toBeGreaterThan(0)
  await pane.unmount()
})

test('a broken plan file is not met with the introduction: the fix comes first', OPTIONS, async ($, on) => {
  const { w } = world(on, TINY, {}, { fresh: true })
  w.file.text = '{ not json'
  await $.session.start(SESSION)
  expect((await bandOf($)).keep).toBe(false)
  expect((await $.command.run(workout(''))).text).not.toBe(line('reply-meet', { day: TODAY }))
})

/** A later session: what's new and the introduction already seen, so only what training brings would show. */
const QUIET = { schemaVersion: 1, seen: { 'whats-new:1.0.0': { at: 1, n: 1 }, intro: { at: 1, n: 1 } } }

test('before onboarding, no day toast and no idle reminder: nothing about training until they are in', OPTIONS, async ($, on) => {
  const { clock, w } = world(on, TINY, QUIET, { fresh: true })
  await $.session.start(SESSION)
  await clock.advance(3 * 60 * 60_000)
  expect(w.toasts).toEqual([])
})

test('the same session once onboarded: the day toast comes', OPTIONS, async ($, on) => {
  const { w } = world(on, TINY, QUIET)
  await $.session.start(SESSION)
  expect(w.toasts.length).toBe(1)
})

test('someone who trained before is marked as onboarded at session start, once', OPTIONS, async ($, on) => {
  const history = [{ kind: 'set', t: 1, d: TODAY - 1, w: 0, exercise: 'Squat', set: 1, target: '10 reps', result: 'done', count: 10 }]
  const store = ownStore(on, { history }, { fresh: true })
  world(on, TINY, 'own-store')
  await $.session.start(SESSION)
  expect((store.get('seen') as Record<string, unknown>).onboarded).toBeDefined()
})

test('/workout now before onboarding: the set they asked for, the safety note taken as read', OPTIONS, async ($, on) => {
  const store = ownStore(on, { seen: { intro: { at: 1, n: 1 } } }, { fresh: true })
  world(on, TINY, 'own-store')
  await $.session.start(SESSION)
  await $.command.run(workout('now'))
  expect((store.get('seen') as Record<string, unknown>).onboarded).toBeDefined()
  expect((store.get('seen') as Record<string, unknown>).safety).toBeDefined()
  expect((await bandOf($)).keep).toBe(false)
})
