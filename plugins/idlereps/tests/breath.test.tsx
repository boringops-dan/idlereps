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

test('a breath in: head and shoulders a pixel up, the chest a pixel taller, the bottom planted', () => {
  const grid = decodeFrame(SPRITE, 'idle')
  const h = grid.length
  expect(decodeCells(idleIn, SPRITE.width)).toEqual([...grid.slice(1, h - 1), grid[h - 2], grid[h - 1]])
})

test('a breath in never leaves a clear row under him: the bust stays on the frame’s edge', () => {
  const breathed = decodeCells(idleIn, SPRITE.width)
  expect(breathed.at(-1)!.some(c => c !== null)).toBe(true)
  expect(breathed.at(-2)!.some(c => c !== null)).toBe(true)
})

test('a breath in leaves his bottom cell row exactly as drawn', () => {
  const columns = SPRITE.width
  const cellRows = (cells: string) => fromCells(cells).slice(-columns * 12)
  const fromCells = (cells: string) => Array.from(atob(cells))
  expect(cellRows(idleIn)).toEqual(cellRows(FRAMES.idle))
})

test('a breath in keeps every pixel of him: only the clear top row goes', () => {
  const count = (cells: string, columns: number) => decodeCells(cells, columns).flat().filter(c => c !== null).length
  const chest = decodeFrame(SPRITE, 'idle').at(-2)!.filter(c => c !== null).length
  expect(count(idleIn, SPRITE.width)).toBe(count(FRAMES.idle, SPRITE.width) + chest)
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
