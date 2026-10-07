import { expect, test } from 'claude-code/testing'

import { BREATH_HALF_MS, breathedIn, breathParts, decodeCells, decodeFrame, encodeCells, encodeSprite } from '../hooks/portrait'
import { SPRITE } from '../hooks/swolomon-sprite'
import { ANIMATED, BAND, blitLog, OPTIONS, SESSION, TINY, workout, world } from './world'

/** His breathing on the terminal (owner, 2026-10-06: "he's ALWAYS gotta have life"). */

const FRAMES = encodeSprite(SPRITE)
const idleIn = breathedIn(FRAMES.idle, SPRITE.width)

test('cells decode back to the pixels they were made from', () => {
  for (const name of ['idle', 'flex', 'walkA'] as const) expect(decodeCells(FRAMES[name], SPRITE.width)).toEqual(decodeFrame(SPRITE, name))
  expect(decodeCells(FRAMES.miniIdle, SPRITE.miniSize)).toEqual(decodeFrame(SPRITE, 'miniIdle'))
})

test('a breath in: head and shoulders a pixel up, the chest a pixel taller, the bottom planted', () => {
  const grid = decodeFrame(SPRITE, 'idle')
  const h = grid.length
  expect(decodeCells(idleIn, SPRITE.width)).toEqual([...grid.slice(1, h - 1), grid[h - 2], grid[h - 1]])
})

test('a breath in leaves his bottom cell row as drawn: the bust stays on the frame’s edge', () => {
  expect(decodeCells(idleIn, SPRITE.width).slice(-2)).toEqual(decodeFrame(SPRITE, 'idle').slice(-2))
})

test('the terminal and the desktop breathe alike: the same parts make both', () => {
  const parts = breathParts(decodeFrame(SPRITE, 'idle'))!
  const risen = [...parts.rising.slice(1), parts.rising[0]!.map(() => null)]
  const film = risen.map((row, y) => row.map((c, x) => c ?? parts.fill[y]![x] ?? parts.planted[y]![x] ?? null))
  expect(decodeCells(idleIn, SPRITE.width)).toEqual(film)
})

test('a frame with no clear top row has nowhere to rise: drawn as it is', () => {
  expect(breathedIn(FRAMES.miniIdle, SPRITE.miniSize)).toBe(FRAMES.miniIdle)
  expect(breathedIn(FRAMES.flex, SPRITE.width)).toBe(FRAMES.flex)
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
