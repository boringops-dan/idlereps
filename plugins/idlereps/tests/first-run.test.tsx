import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import { line } from '../hooks/copy'
import { BAND, drawnRows, OPTIONS, SESSION, TINY, TODAY, workout, world } from './world'

/**
 * Installed, not yet engaged: the first session introduces Swolomon (and a toast points at him); later
 * sessions open quietly and ask again only while the agent works, once a day, five times in all.
 */

const DAY_MS = 86_400_000
const done = (turnId: string) => ({ turnId, answer: '', reason: 'answer', durationMs: 60_000, isAborted: false }) as never

/** A turn long enough to cue (the 30 s wait), its band as drawn then. */
async function longTurn($: Engine, clock: { advance: (ms: number) => Promise<void> }, turnId: string) {
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await $.turn.start({ text: 'go', turnId })
  await clock.advance(31_000)
  const rows = drawnRows(await ui.drawn())
  const nudged = (await ui.find({ key: 'program' })) !== undefined
  await $.turn.complete(done(turnId))
  await ui.unmount()
  return { rows, nudged }
}

test('the first session: the introduction, and a toast saying where Swolomon is, once', OPTIONS, async ($, on) => {
  const { w, clock } = world(on, null)
  await $.session.start(SESSION)
  expect(w.toasts).toContain(line('installed', { day: TODAY }))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await ui.find({ key: 'program' })).toBeDefined()
  await ui.unmount()
  await clock.advance(DAY_MS)
  await $.session.start(SESSION)
  expect(w.toasts.filter(t => t === line('installed', { day: TODAY })).length).toBe(1)
})

test('a later session opens quietly: no band until the agent is working', OPTIONS, async ($, on) => {
  const { clock } = world(on, null, { seen: { intro: { at: 1, n: 1 } } })
  await $.session.start(SESSION)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await ui.find({ key: 'program' })).toBeUndefined()
  await ui.unmount()
  const { rows, nudged } = await longTurn($, clock, 't1')
  expect(nudged).toBe(true)
  expect(rows).toContain(line('nudge', { day: TODAY }))
  expect(rows).toContain(line('nudge-detail', { day: TODAY }))
  expect(rows.at(-1)).toBe("1: Give me a plan   2: Just remind me   3: Not now   4: Don't ask again")
})

test('the nudge leads straight into Quick start', OPTIONS, async ($, on) => {
  const { clock } = world(on, null, { seen: { intro: { at: 1, n: 1 } } })
  await $.session.start(SESSION)
  await longTurn($, clock, 't1')
  await $.command.run(workout('quickstart'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await ui.find({ key: 'understand' })).toBeDefined()
  await ui.unmount()
})

test('once a day: a second long turn that day asks nothing', OPTIONS, async ($, on) => {
  const { clock } = world(on, null, { seen: { intro: { at: 1, n: 1 } } })
  await $.session.start(SESSION)
  await longTurn($, clock, 't1')
  await $.command.run(workout('notnow'))
  expect((await longTurn($, clock, 't2')).nudged).toBe(false)
})

test('never on the introduction’s own day', OPTIONS, async ($, on) => {
  const { clock } = world(on, null)
  await $.session.start(SESSION)
  await $.command.run(workout('notnow'))
  expect((await longTurn($, clock, 't1')).nudged).toBe(false)
})

test('five times in all, the fifth saying it is the last; then quiet for good', OPTIONS, async ($, on) => {
  const { clock } = world(on, null, { seen: { intro: { at: 1, n: 1 } } })
  await $.session.start(SESSION)
  const seen: string[][] = []
  for (let i = 0; i < 6; i += 1) {
    const { rows, nudged } = await longTurn($, clock, `t${i}`)
    seen.push(nudged ? rows : [])
    // The band is left unanswered; the next day is a new chance.
    await clock.advance(DAY_MS)
  }
  expect(seen.map(rows => rows.length > 0)).toEqual([true, true, true, true, true, false])
  expect(seen[3]).toContain(line('nudge-detail', { day: TODAY + 3 }))
  expect(seen[4]).toContain(line('nudge-last', { day: TODAY + 4 }))
})

test('Not now quiets it for the session; Don’t ask again for good', OPTIONS, async ($, on) => {
  const { clock } = world(on, null, { seen: { intro: { at: 1, n: 1 } } })
  await $.session.start(SESSION)
  await longTurn($, clock, 't1')
  await $.command.run(workout('dontask'))
  await clock.advance(DAY_MS)
  await $.session.start(SESSION)
  expect((await longTurn($, clock, 't2')).nudged).toBe(false)
})

test('paused: no nudge', OPTIONS, async ($, on) => {
  const { clock } = world(on, null, { seen: { intro: { at: 1, n: 1 } }, paused: true })
  await $.session.start(SESSION)
  expect((await longTurn($, clock, 't1')).nudged).toBe(false)
})

test('a non-interactive first session shows nothing; the first interactive one introduces', OPTIONS, async ($, on) => {
  const { w } = world(on, null)
  await $.session.start({ ...SESSION, isInteractive: false })
  expect(w.toasts).toEqual([])
  await $.session.start(SESSION)
  expect(w.toasts).toContain(line('installed', { day: TODAY }))
})

test('an unanswered nudge goes with the next prompt', OPTIONS, async ($, on) => {
  const { clock } = world(on, null, { seen: { intro: { at: 1, n: 1 } } })
  await $.session.start(SESSION)
  await longTurn($, clock, 't1')
  await $.turn.start({ text: 'next', turnId: 't2' })
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await ui.find({ key: 'program' })).toBeUndefined()
  await ui.unmount()
})

// ---------------------------------------------------------------------------------------------------------
// Around the next prompt (regression: an unanswered nudge stayed up for good).

test('a nudge the next prompt put away is not a Not now: the next day asks again', OPTIONS, async ($, on) => {
  const { clock } = world(on, null, { seen: { intro: { at: 1, n: 1 } } })
  await $.session.start(SESSION)
  await longTurn($, clock, 't1')
  await clock.advance(DAY_MS)
  expect((await longTurn($, clock, 't2')).nudged).toBe(true)
})

test('the first session’s introduction is not put away by a prompt', OPTIONS, async ($, on) => {
  world(on, null)
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await ui.find({ key: 'program' })).toBeDefined()
  await ui.unmount()
})

test('answered, the nudge’s next step (the safety step) stays through the next prompt', OPTIONS, async ($, on) => {
  const { clock } = world(on, null, { seen: { intro: { at: 1, n: 1 } } })
  await $.session.start(SESSION)
  await longTurn($, clock, 't1')
  await $.command.run(workout('quickstart'))
  await $.turn.start({ text: 'next', turnId: 't2' })
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await ui.find({ key: 'understand' })).toBeDefined()
  await ui.unmount()
})

test('a plan written by hand ends the nudges', OPTIONS, async ($, on) => {
  const { clock, w } = world(on, null, { seen: { intro: { at: 1, n: 1 } } })
  await $.session.start(SESSION)
  w.file.text = JSON.stringify(TINY)
  w.file.mtimeMs += 1
  expect((await longTurn($, clock, 't1')).nudged).toBe(false)
})

test('a plan file that is there but broken: no nudge to overwrite it', OPTIONS, async ($, on) => {
  const { clock, w } = world(on, null, { seen: { intro: { at: 1, n: 1 } } })
  await $.session.start(SESSION)
  w.file.text = '{ not json'
  w.file.mtimeMs += 1
  expect((await longTurn($, clock, 't1')).nudged).toBe(false)
})

test('Set up my plan from the nudge opens the setup dialog', OPTIONS, async ($, on) => {
  const { clock, w } = world(on, null, { seen: { intro: { at: 1, n: 1 } } })
  await $.session.start(SESSION)
  await longTurn($, clock, 't1')
  await $.command.run(workout('setup'))
  expect(w.opened).toContain('workout-setup')
})
