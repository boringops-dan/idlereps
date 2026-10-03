import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import { EMPTY_CARD, PUNCHES, stamp } from '../hooks/punch'
import { BAND, drawnRows, OPTIONS, ownStore, SESSION, STATUS, TINY, TODAY, workout, world } from './world'

/** The punch card (owner, 2026-10-03): a stamp a day you move; ten, and he drinks a free shake for you. */

const nineDays = { days: Array.from({ length: PUNCHES - 1 }, (_, i) => TODAY - 1 - i), shakes: 0 }

async function bandOf($: Engine) {
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  const rows = drawnRows(await ui.drawn())
  const keys = (await ui.findAll({ type: 'Button' })).map(b => String(b.key))
  await ui.unmount()
  return { keys, text: rows.join('\n') }
}

test('stamps: one a day; the tenth fills the card: a shake, and a fresh card', () => {
  const once = stamp(EMPTY_CARD, TODAY)
  expect(once).toEqual({ card: { days: [TODAY], shakes: 0 }, isFull: false })
  expect(stamp(once.card, TODAY)).toEqual(once)
  expect(stamp(nineDays, TODAY)).toEqual({ card: { days: [], shakes: 1 }, isFull: true })
  // A missed day costs nothing: the stamps are days moved, not days in a row.
  expect(stamp({ days: [TODAY - 30], shakes: 0 }, TODAY).card.days).toEqual([TODAY - 30, TODAY])
})

test('the tenth day, with a plan: the logged line and Undo first; the shake after it', OPTIONS, async ($, on) => {
  const store = ownStore(on, { punchCard: nineDays })
  world(on, TINY, 'own-store')
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  expect((await bandOf($)).keys).toContain('undo')
  expect(store.get('punchCard')).toEqual({ days: [], shakes: 1 })
  await $.turn.start({ text: 'go', turnId: 't1' })
  const shake = await bandOf($)
  expect(shake.keys).toEqual(['nice'])
  expect(shake.text).toMatch(/Free shake|Ten stamps/)
})

test('the tenth day in Just remind me: the shake at once', OPTIONS, async ($, on) => {
  world(on, null, { mode: 'remind', punchCard: nineDays })
  await $.session.start(SESSION)
  await $.command.run(workout('log'))
  await $.command.run(workout('upper'))
  expect((await bandOf($)).text).toMatch(/Free shake|Ten stamps/)
})

test('a second move the same day: no second stamp', OPTIONS, async ($, on) => {
  const store = ownStore(on, { mode: 'remind' })
  world(on, null, 'own-store')
  await $.session.start(SESSION)
  for (const what of ['upper', 'lower']) {
    await $.command.run(workout('log'))
    await $.command.run(workout(what))
  }
  expect(store.get('punchCard')).toEqual({ days: [TODAY], shakes: 0 })
})

test('the pane: the card and the shakes', OPTIONS, async ($, on) => {
  world(on, TINY, { punchCard: { days: [TODAY - 2, TODAY - 1, TODAY], shakes: 2 } })
  await $.session.start(SESSION)
  await $.command.run(workout(''))
  const pane = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...STATUS })
  expect(drawnRows(await pane.drawn()).join('\n')).toMatch(/Punch card ●●●○○○○○○○ +3\/10 .*🥤 2/)
  await pane.unmount()
})
