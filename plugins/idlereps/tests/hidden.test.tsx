import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import { setsForUnlock, UNLOCK_ORDER } from '../hooks/collection'
import { line } from '../hooks/copy'
import { ANIMATED, BAND, blitLog, cellsOf, drawnRows, OPTIONS, ownStore, SESSION, TINY, TODAY, workout, world } from './world'

/** Hidden commands (owner, 2026-10-03: "found by word of mouth"): /workout hug, dance, highfive. */

async function bandOf($: Engine) {
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  const rows = drawnRows(await ui.drawn())
  const keys = (await ui.findAll({ type: 'Button' })).map(b => String(b.key))
  await ui.unmount()
  return { keys, text: rows.join('\n') }
}

test('/workout hug: he brings it in; Nice puts it away', OPTIONS, async ($, on) => {
  world(on, TINY)
  await $.session.start(SESSION)
  expect((await $.command.run(workout('hug'))).text).toBeUndefined()
  const band = await bandOf($)
  expect(band.keys).toEqual(['nice'])
  expect(band.text).toMatch(/Bring it in|Hug accepted|Come here/)
  await $.command.run(workout('nice'))
  expect((await bandOf($)).keys).toEqual([])
})

test('animated: the hug is played', ANIMATED, async ($, on) => {
  const { clock } = world(on, TINY)
  const blits = blitLog(on)
  await $.session.start(SESSION)
  await $.command.run(workout('hug'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await clock.advance(5_000)
  await ui.unmount()
  expect(cellsOf('hug').some(cells => blits.some(b => b.cells === cells))).toBe(true)
})

test('/workout highfive with nothing logged: a high five anyway, counted', OPTIONS, async ($, on) => {
  const store = ownStore(on, {})
  world(on, TINY, 'own-store')
  await $.session.start(SESSION)
  await $.command.run(workout('highfive'))
  expect((await bandOf($)).keys).toEqual(['nice'])
  expect(store.get('highFives')).toBe(1)
})

test('/workout highfive on a logged set: that band’s own high five, Undo kept', OPTIONS, async ($, on) => {
  world(on, TINY)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  await $.command.run(workout('highfive'))
  const band = await bandOf($)
  expect(band.keys).toEqual(['undo'])
  expect(band.text).toContain('✓ Logged Push-ups 10 reps')
})

test('/workout dance before it is unlocked: a tease, how many sets to go; no band', OPTIONS, async ($, on) => {
  world(on, TINY, { moves: [], totalDoneSets: 4 })
  await $.session.start(SESSION)
  const toGo = setsForUnlock(UNLOCK_ORDER.indexOf('dance') + 1) - 4
  expect((await $.command.run(workout('dance'))).text).toBe(`Swolomon: ${line('dance-locked', { day: TODAY, n: toGo })}`)
  expect((await bandOf($)).keys).toEqual([])
})

test('/workout dance once unlocked: he dances', OPTIONS, async ($, on) => {
  world(on, TINY)
  await $.session.start(SESSION)
  await $.command.run(workout('dance'))
  expect((await bandOf($)).text).toMatch(/hips|but fun/)
})

test('no plan, no reminders: still a hug', OPTIONS, async ($, on) => {
  world(on, null)
  await $.session.start(SESSION)
  await $.command.run(workout('hug'))
  expect((await bandOf($)).keys).toEqual(['nice'])
})

test('a band that matters more is up: the hug is a line instead', OPTIONS, async ($, on) => {
  world(on, TINY)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  expect((await $.command.run(workout('hug'))).text).toMatch(/^Swolomon: (Bring it in|Hug accepted|Come here)/)
  expect((await bandOf($)).keys).toContain('done')
})

test('hidden: in no usage line', OPTIONS, async ($, on) => {
  world(on, TINY)
  await $.session.start(SESSION)
  const usage = (await $.command.run(workout('nonsense'))).text ?? ''
  for (const hidden of ['hug', 'dance', 'highfive']) expect(usage.includes(hidden)).toBe(false)
})
