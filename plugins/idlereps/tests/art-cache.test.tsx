import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import type { Plan } from '../types'
import { moveById, moveMs } from '../hooks/moves'
import type { Clock } from './world'
import { ANIMATED, BAND, blitLog, cellsOf, HALLOWEEN, microOf, noonOf, SESSION, STATUS, workout, world } from './world'

/**
 * His moves are drawn the first time they play, not all at load (2026-10-07: hundreds of moves made the first
 * session start slow enough to time CI out). Each must still be the right picture, in the right outfit.
 */

const DEMOS_PLAN: Plan = {
  version: 1,
  name: 'Demos',
  schedule: { everyNDays: 2 },
  workouts: [
    { name: 'A', exercises: [{ name: 'Goblet squats', reps: '10 reps', sets: 4 }] },
    { name: 'B', exercises: [{ name: 'Hindu push-ups', reps: '8 reps', sets: 1 }] },
  ],
}

const GOBLET = moveById('goblet-squat')!
const PLAIN = new Set(cellsOf('goblet-squat'))
const COSTUME = new Set(cellsOf('goblet-squat', HALLOWEEN))
/** Poses that differ in costume: the ones that show which outfit he was drawn in. */
const ONLY_PLAIN = [...PLAIN].filter(cells => !COSTUME.has(cells))
const ONLY_COSTUME = [...COSTUME].filter(cells => !PLAIN.has(cells))

/** A session's next set (its first, Done, then the next) on the band for 8 s: every picture drawn meanwhile. */
async function secondSetDrawn($: Engine, clock: Clock, blits: ReturnType<typeof blitLog>): Promise<Set<string>> {
  const before = blits.length
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  await $.command.run(workout('now'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await clock.advance(8_000)
  await ui.unmount()
  return new Set(blits.slice(before).map(b => b.cells))
}

test('animated: a demo first played on a set band is its own move, drawn on the spot', ANIMATED, async ($, on) => {
  const { clock } = world(on, DEMOS_PLAN)
  const seen = await secondSetDrawn($, clock, blitLog(on))
  expect([...PLAIN].some(cells => seen.has(cells))).toBe(true)
  expect(cellsOf('squat').some(cells => seen.has(cells) && !PLAIN.has(cells))).toBe(false)
})

test('animated: in costume, a move is drawn in the costume, never the plain one', ANIMATED, async ($, on) => {
  const { clock } = world(on, DEMOS_PLAN, {}, { now: noonOf(10, 31) })
  const seen = await secondSetDrawn($, clock, blitLog(on))
  expect(ONLY_COSTUME.some(cells => seen.has(cells))).toBe(true)
  expect(ONLY_PLAIN.some(cells => seen.has(cells))).toBe(false)
})

test('animated: a move drawn plain stays plain only until the costume goes on, then is drawn again', ANIMATED, async ($, on) => {
  const { clock } = world(on, DEMOS_PLAN, {}, { now: noonOf(10, 23) })
  const blits = blitLog(on)
  const seen = await secondSetDrawn($, clock, blits)
  expect(ONLY_PLAIN.some(cells => seen.has(cells))).toBe(true)
  // Two days on (the plan's next training day) it is Halloween: a new session, the same move, now in costume.
  await $.command.run(workout('later'))
  await clock.advance(48 * 3_600_000)
  const after = await secondSetDrawn($, clock, blits)
  expect(ONLY_COSTUME.some(cells => after.has(cells))).toBe(true)
  expect(ONLY_PLAIN.some(cells => after.has(cells))).toBe(false)
})

test('a silent set (Quiet): the tiny one beside it does a demo it has never drawn before', { options: { ...ANIMATED.options, coachChat: 'quiet' } }, async ($, on) => {
  const { clock } = world(on, DEMOS_PLAN)
  const blits = blitLog(on)
  await $.session.start(SESSION)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  await $.command.run(workout('now'))
  const cells = microOf('goblet-squat')
  const tiny = (await ui.find({ key: 'swolomon-tiny' })) as { props: { cells: string } } | undefined
  expect(tiny?.props.cells).toBe(cells[0])
  await clock.advance(moveMs(GOBLET) + 500)
  expect(blits.map(b => b.cells)).toContain(cells[1])
  await ui.unmount()
})

test('animated: the status pane demonstrates the next exercise from its own demo', ANIMATED, async ($, on) => {
  const { clock } = world(on, DEMOS_PLAN)
  const blits = blitLog(on)
  await $.session.start(SESSION)
  await $.command.run(workout(''))
  const pane = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...STATUS })
  await clock.advance(1_000 + moveMs(GOBLET))
  const toPane = new Set(blits.filter(b => b.requestId === STATUS.requestId).map(b => b.cells))
  expect([...PLAIN].every(cells => toPane.has(cells))).toBe(true)
  await pane.unmount()
})
