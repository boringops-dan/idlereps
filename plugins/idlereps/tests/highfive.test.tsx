import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import { STARTER_MOVES, UNLOCK_ORDER } from '../hooks/collection'
import { CELEBRATION_MOVES, GESTURES, MOVES } from '../hooks/moves'
import { ANIMATED, BAND, blitLog, cellsOf, drawnRows, OPTIONS, ownStore, SESSION, TINY, workout, world } from './world'

/** High five (owner, 2026-10-03): after a logged set, h, and he slaps one out of the screen. */

async function bandOf($: Engine) {
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  const rows = drawnRows(await ui.drawn())
  const keys = (await ui.findAll({ type: 'Button' })).map(b => String(b.key))
  const hasPortrait = (await ui.find({ key: 'swolomon' })) !== undefined
  await ui.unmount()
  return { keys, text: rows.join('\n'), hasPortrait }
}

test('a logged set offers a high five; he gives one, the line and Undo stay; counted', OPTIONS, async ($, on) => {
  const store = ownStore(on, {})
  world(on, TINY, 'own-store')
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  expect((await bandOf($)).keys).toEqual(['highfive', 'undo'])
  await $.command.run(workout('highfive'))
  const band = await bandOf($)
  expect(band.keys).toEqual(['undo'])
  expect(band.text).toContain('✓ Logged Push-ups 10 reps')
  expect(band.text).toMatch(/Up top|Felt that one|Clean contact|Worth it/)
  expect(band.hasPortrait).toBe(true)
  expect(store.get('highFives')).toBe(1)
})

test('Undo from the high five takes the set back', OPTIONS, async ($, on) => {
  const store = ownStore(on, {})
  world(on, TINY, 'own-store')
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  await $.command.run(workout('highfive'))
  await $.command.run(workout('undo'))
  expect(store.get('totalDoneSets') ?? 0).toBe(0)
})

test('animated: he plays the high five', ANIMATED, async ($, on) => {
  const { clock } = world(on, TINY)
  const blits = blitLog(on)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await ui.press({ key: 'highfive' })
  await clock.advance(6_000)
  await ui.unmount()
  const frames = cellsOf('high-five')
  expect(frames.some(cells => blits.some(b => b.cells === cells))).toBe(true)
})

test('the next prompt puts it away, like the logged line', OPTIONS, async ($, on) => {
  world(on, TINY)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  await $.command.run(workout('highfive'))
  await $.turn.start({ text: 'go', turnId: 't1' })
  expect((await bandOf($)).keys).toEqual([])
})

test('a gesture, not a move to collect: the 33 stay 33', () => {
  expect(GESTURES.map(m => m.id).slice(0, 3)).toEqual(['high-five', 'hug', 'struggle'])
  expect(GESTURES.slice(3)).toEqual([...CELEBRATION_MOVES])
  expect(MOVES.some(m => GESTURES.includes(m))).toBe(false)
  expect(STARTER_MOVES.length + UNLOCK_ORDER.length).toBe(MOVES.length)
})
