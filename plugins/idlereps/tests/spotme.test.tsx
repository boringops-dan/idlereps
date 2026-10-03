import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import { line } from '../hooks/copy'
import { ANIMATED, ASKED, BAND, blitLog, cellsOf, drawnRows, NOON, ONBOARDED, OPTIONS, ownStore, SESSION, TODAY, workout, world } from './world'

/** Spot me (owner, 2026-10-03): the roles flipped; he is stuck on his last rep and you cheer him through. */

/** Just remind me, inside the gap, every question asked, and spot me due. */
const QUIET = { mode: 'remind', nextCueAt: NOON + 10 * 60_000, about: ASKED, seen: { ...ONBOARDED, spotme: { at: 1, n: 1 } } }

async function bandOf($: Engine) {
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  const rows = drawnRows(await ui.drawn())
  const keys = (await ui.findAll({ type: 'Button' })).map(b => String(b.key))
  await ui.unmount()
  return { keys, text: rows.join('\n') }
}

async function quietTurn($: Engine, clock: { advance: (ms: number) => Promise<void> }, turnId = 't1') {
  await $.turn.start({ text: 'go', turnId })
  await clock.advance(31_000)
  return bandOf($)
}

test('a quiet turn: he is stuck on his last rep; You got this! gets it up, and he celebrates; counted', OPTIONS, async ($, on) => {
  const store = ownStore(on, QUIET)
  const { clock } = world(on, null, 'own-store')
  await $.session.start(SESSION)
  const band = await quietTurn($, clock)
  expect(band.keys).toEqual(['spot', 'nospot'])
  expect(band.text).toContain('1: You got this!   2: Not now')
  await $.command.run(workout('spot'))
  const after = await bandOf($)
  expect(after.keys).toEqual(['nice'])
  expect(after.text).toMatch(/WE did that|Got it up|Best spotter/)
  expect(store.get('spots')).toBe(1)
})

test('Not now: he racks it, no hard feelings', OPTIONS, async ($, on) => {
  const { clock, w } = world(on, null, QUIET)
  await $.session.start(SESSION)
  await quietTurn($, clock)
  await $.command.run(workout('nospot'))
  expect((await bandOf($)).keys).toEqual([])
  expect(w.toasts.at(-1)).toMatch(/Racked it|get it tomorrow/)
})

test('one quiet moment a day; spot me at most every three days', OPTIONS, async ($, on) => {
  const { clock } = world(on, null, QUIET)
  await $.session.start(SESSION)
  expect((await quietTurn($, clock, 't1')).keys).toEqual(['spot', 'nospot'])
  await $.command.run(workout('nospot'))
  await $.turn.complete({ turnId: 't1', answer: '', reason: 'answer', durationMs: 31_000, isAborted: false } as never)
  expect((await quietTurn($, clock, 't2')).keys).toEqual([])
})

test('a question left: spot me only every third day, a question otherwise', OPTIONS, async ($, on) => {
  const { clock } = world(on, null, { ...QUIET, about: {} })
  await $.session.start(SESSION)
  const band = await quietTurn($, clock)
  if (TODAY % 3 === 0) expect(band.keys).toEqual(['spot', 'nospot'])
  else expect(band.text).toContain(line('ask-owl', { day: TODAY }))
})

test('animated: he strains and shakes', ANIMATED, async ($, on) => {
  const { clock } = world(on, null, QUIET)
  const blits = blitLog(on)
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await clock.advance(40_000)
  await ui.unmount()
  expect(cellsOf('struggle').some(cells => blits.some(b => b.cells === cells))).toBe(true)
})
