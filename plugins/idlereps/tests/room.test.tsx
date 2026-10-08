import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import { line } from '../hooks/copy'
import { setShown, BAND, OPTIONS, SESSION, TINY, TODAY, workout, world } from './world'

/**
 * Room for Swolomon (owner, 2026-10-06): the full portrait wherever it fits; and where only the window's
 * width keeps him out, he says so ("where am I?"), once a day.
 */

const WHERE = [0, 1, 2].map(i => line('where-am-i', { day: TODAY + i }))
const said = (toasts: readonly string[]) => toasts.filter(t => WHERE.includes(t)).length
/** Too narrow for even the mini head (6 columns, a 2-column gap) beside any band's text, whichever line it is. */
const NARROW = 12
const at = (props: { bodyColumns?: number; maxRows?: number }) => ({ ...BAND, props: { ...BAND.props, ...props } })
const portraitOf = async (ui: { find: (q: { key: string }) => Promise<unknown> }) =>
  ((await ui.find({ key: 'swolomon' })) as { props: { columns: number } } | undefined)?.props.columns

/** The flex band: a portrait band, put up on demand. */
async function flexBand($: Engine) {
  await $.session.start(SESSION)
  await $.command.run(workout('flex'))
}

test('too narrow for any portrait: no portrait, and he asks where he is', OPTIONS, async ($, on) => {
  const { w } = world(on, TINY)
  await flexBand($)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...at({ bodyColumns: NARROW }) })
  expect(await portraitOf(ui)).toBeUndefined()
  await ui.unmount()
  expect(said(w.toasts)).toBe(1)
})

test('where am I: once a day, however many narrow redraws', OPTIONS, async ($, on) => {
  const { w } = world(on, TINY)
  await flexBand($)
  for (let i = 0; i < 3; i += 1) {
    const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...at({ bodyColumns: NARROW }) })
    await ui.unmount()
  }
  expect(said(w.toasts)).toBe(1)
})

test('where am I: again the next day', OPTIONS, async ($, on) => {
  const { w, clock } = world(on, TINY)
  await flexBand($)
  const first = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...at({ bodyColumns: NARROW }) })
  await first.unmount()
  await clock.advance(24 * 3_600_000)
  await $.command.run(workout('flex'))
  const second = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...at({ bodyColumns: NARROW }) })
  await second.unmount()
  expect(said(w.toasts)).toBe(2)
})

test('a wide window: the full portrait and no complaint', OPTIONS, async ($, on) => {
  const { w } = world(on, TINY)
  await flexBand($)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await portraitOf(ui)).toBe(16)
  await ui.unmount()
  expect(said(w.toasts)).toBe(0)
})

test('too short, not too narrow: no complaint about the width', OPTIONS, async ($, on) => {
  const { w } = world(on, TINY)
  await flexBand($)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...at({ maxRows: 2 }) })
  expect(await portraitOf(ui)).toBeUndefined()
  await ui.unmount()
  expect(said(w.toasts)).toBe(0)
})

test('the desktop draws him as a picture: never a where-am-I', OPTIONS, async ($, on) => {
  const { w } = world(on, TINY)
  await flexBand($)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'desktop', ...at({ bodyColumns: NARROW }) })
  await ui.unmount()
  expect(said(w.toasts)).toBe(0)
})

test('a band with no portrait at all (a silent set, Quiet) never asks where he is', { options: { ...OPTIONS.options, coachChat: 'quiet' } }, async ($, on) => {
  const { w } = world(on, TINY, { seen: { hint: { at: 1, n: 3 } } })
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  await $.command.run(workout('now'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...at({ bodyColumns: NARROW }) })
  expect(await setShown(ui)).toBe(true)
  await ui.unmount()
  expect(said(w.toasts)).toBe(0)
})

test('the logged band: High five is 1, pressed from an empty prompt like every band button', OPTIONS, async ($, on) => {
  world(on, TINY)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  const button = (await ui.find({ key: 'highfive' })) as { props: { hotkey: string } } | undefined
  expect(button?.props.hotkey).toBe('1')
  await ui.unmount()
})
