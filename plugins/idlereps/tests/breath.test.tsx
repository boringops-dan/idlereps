import { expect, test } from 'claude-code/testing'

import { BREATH_HALF_MS, breathedIn, decodeCells, decodeFrame, encodeCells, encodeSprite } from '../hooks/portrait'
import { SPRITE } from '../hooks/swolomon-sprite'
import { ANIMATED, BAND, blitLog, OPTIONS, SESSION, TINY, workout, world } from './world'

/** His breathing on the terminal (owner, 2026-10-06: "he's ALWAYS gotta have life"). */

const FRAMES = encodeSprite(SPRITE)
const idleIn = breathedIn(FRAMES.idle, SPRITE.width)

test('cells decode back to the pixels they were made from', () => {
  for (const name of ['idle', 'flex', 'walkA'] as const) expect(decodeCells(FRAMES[name], SPRITE.width)).toEqual(decodeFrame(SPRITE, name))
  expect(decodeCells(FRAMES.miniIdle, SPRITE.miniSize)).toEqual(decodeFrame(SPRITE, 'miniIdle'))
})

test('a breath in: every row a pixel up, a clear row under', () => {
  const grid = decodeFrame(SPRITE, 'idle')
  expect(decodeCells(idleIn, SPRITE.width)).toEqual([...grid.slice(1), new Array(SPRITE.width).fill(null)])
  expect(idleIn).toBe(encodeCells([...grid.slice(1), new Array(SPRITE.width).fill(null)]))
})

test('animated: once his line is out he breathes, in and out, while the band shows', ANIMATED, async ($, on) => {
  const { clock } = world(on, TINY)
  const blits = blitLog(on)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await clock.advance(30_000)
  const cells = blits.map(b => b.cells)
  expect(cells).toContain(idleIn)
  expect(cells.filter(c => c === idleIn).length).toBeGreaterThan(2)
  await ui.unmount()
})

test('animated: the band gone, his breathing stops with it', ANIMATED, async ($, on) => {
  const { clock } = world(on, TINY)
  const blits = blitLog(on)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await clock.advance(20_000)
  await $.command.run(workout('later'))
  const gone = blits.filter(b => b.cells === idleIn).length
  await clock.advance(BREATH_HALF_MS * 10)
  expect(blits.filter(b => b.cells === idleIn).length).toBe(gone)
  await ui.unmount()
})

test('not animated: no breathing', OPTIONS, async ($, on) => {
  const { clock } = world(on, TINY)
  const blits = blitLog(on)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await clock.advance(30_000)
  expect(blits.some(b => b.cells === idleIn)).toBe(false)
  await ui.unmount()
})
