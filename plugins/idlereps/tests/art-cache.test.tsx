import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import type { Plan } from '../types'
import { drawMicro, MICRO_HEIGHT, MICRO_WIDTH } from '../hooks/figure'
import { drawMove, moveById, moveMs } from '../hooks/moves'
import { encodeMicro, encodeMove } from '../hooks/portrait'
import { dressed, SEASONS } from '../hooks/season'
import { SPRITE } from '../hooks/swolomon-sprite'
import { ANIMATED, BAND, blitLog, cellsOf, SESSION, STATUS, workout, world } from './world'

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

const AGENT = SEASONS.find(s => s.id === 'halloween')?.outfit ?? null
const noonOf = (month: number, date: number) => Date.UTC(2026, month - 1, date, 12)
const dressedCellsOf = (id: string) => {
  const move = moveById(id)
  if (move === undefined || AGENT === null) throw new Error(`no ${id} or no Halloween outfit`)
  return encodeMove(dressed(SPRITE, AGENT), id, drawMove(move, AGENT))
}
const microOf = (id: string) => encodeMicro(SPRITE, id, (moveById(id)?.poses ?? []).map(drawMicro), MICRO_WIDTH, MICRO_HEIGHT)

/** Today's first set, Done, then the next set. */
async function secondSet($: Engine) {
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  await $.command.run(workout('now'))
}

test('animated: a demo first played on a set band is its own move, drawn on the spot', ANIMATED, async ($, on) => {
  const { clock } = world(on, DEMOS_PLAN)
  const blits = blitLog(on)
  await $.session.start(SESSION)
  await secondSet($)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await clock.advance(8_000)
  await ui.unmount()
  const seen = new Set(blits.map(b => b.cells))
  expect(cellsOf('goblet-squat').some(cells => seen.has(cells))).toBe(true)
  expect(cellsOf('squat').some(cells => seen.has(cells) && !cellsOf('goblet-squat').includes(cells))).toBe(false)
})

test('animated: in costume, a move is drawn in the costume, never the plain one', ANIMATED, async ($, on) => {
  const { clock } = world(on, DEMOS_PLAN, {}, { now: noonOf(10, 31) })
  const blits = blitLog(on)
  await $.session.start(SESSION)
  await secondSet($)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await clock.advance(8_000)
  await ui.unmount()
  const seen = new Set(blits.map(b => b.cells))
  expect(dressedCellsOf('goblet-squat').some(cells => seen.has(cells))).toBe(true)
  expect(cellsOf('goblet-squat').some(cells => seen.has(cells) && !dressedCellsOf('goblet-squat').includes(cells))).toBe(false)
})

test('animated: a move drawn plain stays plain only until the costume goes on, then is drawn again', ANIMATED, async ($, on) => {
  const { clock } = world(on, DEMOS_PLAN, {}, { now: noonOf(10, 23) })
  const blits = blitLog(on)
  await $.session.start(SESSION)
  await secondSet($)
  let ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await clock.advance(8_000)
  await ui.unmount()
  expect(cellsOf('goblet-squat').some(cells => blits.some(b => b.cells === cells))).toBe(true)
  // Two days on (the plan's next training day) it is Halloween: a new session, the same move, now in costume.
  await $.command.run(workout('later'))
  await clock.advance(48 * 3_600_000)
  const before = blits.length
  await $.session.start(SESSION)
  await secondSet($)
  ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await clock.advance(8_000)
  await ui.unmount()
  const after = new Set(blits.slice(before).map(b => b.cells))
  expect([...after].some(cells => dressedCellsOf('goblet-squat').includes(cells) && !cellsOf('goblet-squat').includes(cells))).toBe(true)
  expect([...after].some(cells => cellsOf('goblet-squat').includes(cells) && !dressedCellsOf('goblet-squat').includes(cells))).toBe(false)
})

test('a silent set (Quiet): the tiny one beside it does a demo it has never drawn before', { options: { ...ANIMATED.options, coachChat: 'quiet' } }, async ($, on) => {
  const { clock } = world(on, DEMOS_PLAN)
  const blits = blitLog(on)
  await $.session.start(SESSION)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await secondSet($)
  const cells = microOf('goblet-squat')
  const tiny = (await ui.find({ key: 'swolomon-tiny' })) as { props: { cells: string } } | undefined
  expect(tiny?.props.cells).toBe(cells[0])
  const move = moveById('goblet-squat')
  if (move === undefined) throw new Error('no goblet-squat')
  await clock.advance(moveMs(move) + 500)
  expect(blits.map(b => b.cells)).toContain(cells[1])
  await ui.unmount()
})

test('animated: the status pane demonstrates the next exercise from its own demo', ANIMATED, async ($, on) => {
  const { clock } = world(on, DEMOS_PLAN)
  const blits = blitLog(on)
  await $.session.start(SESSION)
  await $.command.run(workout(''))
  const pane = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...STATUS })
  const move = moveById('goblet-squat')
  if (move === undefined) throw new Error('no goblet-squat')
  await clock.advance(1_000 + moveMs(move))
  const toPane = blits.filter(b => b.requestId === STATUS.requestId).map(b => b.cells)
  const cells = cellsOf('goblet-squat')
  expect(toPane).toContain(cells[0])
  expect(toPane).toContain(cells[1])
  await pane.unmount()
})
