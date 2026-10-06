import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import { BAND, OPTIONS, SESSION, TINY, workout, world } from './world'

/**
 * An 80-column window (owner, 2026-10-06: "if I have the width space, then I'd like the full Swolomon"):
 * the engine leaves 75 columns for the band's body, and every band he is on fits the full portrait in it, the
 * introduction aside: its four buttons need 62 columns, so it has his head at 80 and all of him from 85.
 * Button rows tighten from three spaces to two where that is what makes the room.
 */

const EIGHTY = { ...BAND, props: { ...BAND.props, bodyColumns: 75 } }

async function sizeOf($: Engine, bodyColumns = 75): Promise<number | undefined> {
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...EIGHTY, props: { ...EIGHTY.props, bodyColumns } })
  const size = ((await ui.find({ key: 'swolomon' })) as { props: { columns: number } } | undefined)?.props.columns
  await ui.unmount()
  return size
}

test('the introduction: his head at 80 columns (its four buttons need 62), all of him from 85', OPTIONS, async ($, on) => {
  world(on, null)
  await $.session.start(SESSION)
  expect(await sizeOf($)).toBe(6)
  expect(await sizeOf($, 80)).toBe(16)
})

test('80 columns: the ask, the first set, a later set, the celebration, the high five, the rating', OPTIONS, async ($, on) => {
  const { clock } = world(on, TINY)
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await clock.advance(30_000)
  expect(['ask', await sizeOf($)]).toEqual(['ask', 16])
  await $.command.run(workout('start'))
  expect(['first set', await sizeOf($)]).toEqual(['first set', 16])
  await $.command.run(workout('done'))
  expect(['celebration', await sizeOf($)]).toEqual(['celebration', 16])
  await $.command.run(workout('highfive'))
  expect(['high five', await sizeOf($)]).toEqual(['high five', 16])
  await $.command.run(workout('now'))
  expect(['later set', await sizeOf($)]).toEqual(['later set', 16])
  await $.command.run(workout('done'))
  expect(['rating', await sizeOf($)]).toEqual(['rating', 16])
})

