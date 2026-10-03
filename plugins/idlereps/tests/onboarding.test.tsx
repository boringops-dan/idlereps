import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import { introLines, line } from '../hooks/copy'
import { BAND, drawnRows, OPTIONS, ownStore, SESSION, STATUS, TINY, TODAY, workout, world } from './world'

/**
 * Onboarding (owner, 2026-10-02: "/workout shouldn't just be into a workout where we never talked to the
 * user"): Swolomon introduces himself, the safety step, how training here works, then the first set. A plan
 * already there (made by hand, brought from the prototype) is kept, not skipped past.
 */

const ACKED = { seen: { safety: { at: 1, n: 1 } } }
const done = (turnId: string) => ({ turnId, answer: '', reason: 'answer', durationMs: 60_000, isAborted: false }) as never

async function bandOf($: Engine) {
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  const rows = drawnRows(await ui.drawn())
  const has = async (key: string) => (await ui.find({ key })) !== undefined
  const keys = { keep: await has('keep'), quickstart: await has('program'), understand: await has('understand'), gotit: await has('gotit'), start: await has('start') }
  await ui.unmount()
  return { rows, ...keys }
}

test('a plan Swolomon never walked in: the first session introduces him, with Keep my plan in place of Quick start', OPTIONS, async ($, on) => {
  const { w } = world(on, TINY, {}, { fresh: true })
  await $.session.start(SESSION)
  const band = await bandOf($)
  expect([band.keep, band.quickstart]).toEqual([true, false])
  expect(band.rows.join('\n')).toContain('You have a plan already. Keep it, or just get reminders')
  expect(introLines(TODAY, true).slice(0, 3)).toEqual(introLines(TODAY).slice(0, 3))
  expect(w.toasts).toContain(line('installed', { day: TODAY }))
})

test('Keep my plan: the safety step, how it works, then today’s first set', OPTIONS, async ($, on) => {
  const store = ownStore(on, {}, { fresh: true })
  const { w } = world(on, TINY, 'own-store')
  await $.session.start(SESSION)
  await $.command.run(workout('keep'))
  expect((await bandOf($)).understand).toBe(true)
  await $.command.run(workout('understand'))
  const howto = await bandOf($)
  expect(howto.gotit).toBe(true)
  for (const id of ['howto-sets', 'howto-keys', 'howto-gap', 'howto-more'] as const) expect(howto.rows.join('\n')).toContain(line(id, { day: TODAY }))
  await $.command.run(workout('gotit'))
  expect((await bandOf($)).start).toBe(true)
  expect((store.get('seen') as Record<string, unknown>).onboarded).toBeDefined()
  // The plan is the one that was there: nothing wrote over it.
  expect(w.writes.filter(write => write.path.endsWith('plan.json'))).toEqual([])
})

test('Quick start from nothing: how it works comes before the first set, and Got it offers it', OPTIONS, async ($, on) => {
  world(on, null, ACKED, { fresh: true })
  await $.session.start(SESSION)
  await $.command.run(workout('quickstart'))
  await $.command.run(workout('desk'))
  expect((await bandOf($)).gotit).toBe(true)
  await $.command.run(workout('gotit'))
  expect((await bandOf($)).start).toBe(true)
})

test('how it works shows once: a later new plan offers its first set straight away', OPTIONS, async ($, on) => {
  const { w } = world(on, null, ACKED, { fresh: true })
  await $.session.start(SESSION)
  await $.command.run(workout('quickstart'))
  await $.command.run(workout('desk'))
  await $.command.run(workout('gotit'))
  // Another plan, chosen later through Quick start again: no second walkthrough.
  w.file.text = null
  await $.command.run(workout('quickstart'))
  await $.command.run(workout('desk'))
  const band = await bandOf($)
  expect([band.gotit, band.start]).toEqual([false, true])
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

test('/workout now before onboarding: the set they asked for, and no walkthrough after it', OPTIONS, async ($, on) => {
  const store = ownStore(on, { seen: { intro: { at: 1, n: 1 } } }, { fresh: true })
  world(on, TINY, 'own-store')
  await $.session.start(SESSION)
  await $.command.run(workout('now'))
  expect((store.get('seen') as Record<string, unknown>).onboarded).toBeDefined()
  expect((await bandOf($)).gotit).toBe(false)
})
