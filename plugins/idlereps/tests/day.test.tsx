import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import type { HistoryEntry } from '../types'
import { ANIMATED, blitLog, cellsOf, drawnRows, mountAt, NOON, SESSION, STATUS, TINY, TODAY, workout, world } from './world'

/** His day, and their history (owner, 2026-10-03: "a real person"): the first aside of a band, once a day. */

const at = (hour: number, minute = 0) => new Date(2026, 9, 2, hour, minute).getTime()
const REMIND = { mode: 'remind' }

/** The first aside a waiting reminder band shows, wide enough for it. */
async function firstAside($: Engine, clock: { advance: (ms: number) => Promise<void> }): Promise<string | undefined> {
  await $.turn.start({ text: 'go', turnId: 't1' })
  const ui = await mountAt($, 200)
  let aside: string | undefined
  for (let t = 0; t < 120_000 && aside === undefined; t += 500) {
    await clock.advance(500)
    aside = drawnRows(await ui.drawn()).find(r => r.includes('   / '))
  }
  await ui.unmount()
  return aside?.slice(aside.indexOf('/ ') + 2)
}

test('animated: before eight, he is groggy', ANIMATED, async ($, on) => {
  const { clock } = world(on, null, REMIND, { now: at(6, 30) })
  await $.session.start(SESSION)
  expect(await firstAside($, clock)).toMatch(/pre-workout|eyes are open|iron is cold/)
})

test('animated: late at night, puzzled to see you', ANIMATED, async ($, on) => {
  const { clock } = world(on, null, REMIND, { now: at(23, 30) })
  await $.session.start(SESSION)
  expect(await firstAside($, clock)).toMatch(/both still here|very late|Night shift/)
})

test('animated: midday, after a good month, he has been counting', ANIMATED, async ($, on) => {
  const history: HistoryEntry[] = Array.from({ length: 6 }, (_, i) => ({ kind: 'moved', t: NOON - (i + 1) * 86_400_000, d: TODAY - 1 - i, what: 'upper' }))
  const { clock } = world(on, null, { ...REMIND, history })
  await $.session.start(SESSION)
  expect(await firstAside($, clock)).toMatch(/6 days this month|showed up 6 days/)
})

test('animated: once a day: the next band’s first aside is the usual one', ANIMATED, async ($, on) => {
  const { clock } = world(on, null, { ...REMIND, seen: { onboarded: { at: 1, n: 1 }, safety: { at: 1, n: 1 }, mood: { at: at(6), n: 1 } } }, { now: at(6, 30) })
  await $.session.start(SESSION)
  expect(await firstAside($, clock)).toMatch(/we doing this|No rush|stand here|right here|now-ish/)
})

test('animated: the pane late at night: he naps', ANIMATED, async ($, on) => {
  const { clock } = world(on, TINY, {}, { now: at(23, 30) })
  const blits = blitLog(on)
  await $.session.start(SESSION)
  await $.command.run(workout(''))
  const pane = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...STATUS })
  await clock.advance(6_000)
  await pane.unmount()
  expect(cellsOf('nap').some(cells => blits.some(b => b.cells === cells))).toBe(true)
})
