import { expect, test } from 'claude-code/testing'

import { line } from '../hooks/copy'
import { decodeFrame, encodeCells, encodeSprite, recolour } from '../hooks/portrait'
import { isShinyAt, SHINY_COLOURS, SHINY_ODDS } from '../hooks/shiny'
import { SPRITE } from '../hooks/swolomon-sprite'
import { ANIMATED, BAND, blitLog, drawnRows, NOON, OPTIONS, ownStore, SESSION, STATUS, TINY, TODAY, workout, world } from './world'

/** The shiny Swolomon (owner, 2026-10-03): about one band in a hundred, recoloured. */

const FRAMES = encodeSprite(SPRITE)
/** The first moment from noon that places a shiny band. */
const SHINY_AT = (() => {
  for (let ms = NOON; ; ms += 1000) if (isShinyAt(ms)) return ms
})()
const shiny = (cells: string) => recolour(cells, SHINY_COLOURS)

test('recolouring: his colours swapped, nothing else; no map, no change', () => {
  const grid = decodeFrame(SPRITE, 'idle')
  expect(recolour(FRAMES.idle, new Map())).toBe(FRAMES.idle)
  const swapped = grid.map(row => row.map(c => (c === null ? null : (SHINY_COLOURS.get(c) ?? c))))
  expect(shiny(FRAMES.idle)).toBe(encodeCells(swapped))
  expect(shiny(FRAMES.idle)).not.toBe(FRAMES.idle)
})

test('about one in a hundred, the same for the same moment', () => {
  const hits = Array.from({ length: 100_000 }, (_, i) => isShinyAt(NOON + i * 1000)).filter(Boolean).length
  expect(hits).toBeGreaterThan(100_000 / SHINY_ODDS / 2)
  expect(hits).toBeLessThan((100_000 / SHINY_ODDS) * 2)
  expect(isShinyAt(SHINY_AT)).toBe(true)
  expect(isShinyAt(SHINY_AT + 999)).toBe(true)
})

test('a shiny band: the portrait recoloured; the first one ever, he says so; counted', OPTIONS, async ($, on) => {
  const store = ownStore(on, {})
  const { w } = world(on, TINY, 'own-store', { now: SHINY_AT })
  await $.session.start(SESSION)
  await $.command.run(workout('flex'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  const cells = ((await ui.find({ key: 'swolomon' })) as { props: { cells: string } } | undefined)?.props.cells
  await ui.unmount()
  expect(cells).toBe(shiny(FRAMES.flex))
  expect(w.toasts).toContain(line('shiny-first', { day: TODAY }))
  expect(store.get('shinies')).toBe(1)
})

test('animated: every blit to a shiny portrait is recoloured', ANIMATED, async ($, on) => {
  const { clock } = world(on, TINY, {}, { now: SHINY_AT })
  const blits = blitLog(on)
  await $.session.start(SESSION)
  await $.command.run(workout('flex'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await clock.advance(20_000)
  await ui.unmount()
  expect(blits.length).toBeGreaterThan(0)
  const plain = new Set(Object.values(FRAMES))
  expect(blits.some(b => plain.has(b.cells))).toBe(false)
})

test('the second shiny: no word, just counted; the pane shows the tally', OPTIONS, async ($, on) => {
  const store = ownStore(on, { shinies: 1 })
  const { w } = world(on, TINY, 'own-store', { now: SHINY_AT })
  await $.session.start(SESSION)
  await $.command.run(workout('flex'))
  expect(w.toasts).not.toContain(line('shiny-first', { day: TODAY }))
  expect(store.get('shinies')).toBe(2)
  await $.command.run(workout('nice'))
  await $.command.run(workout(''))
  const pane = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...STATUS })
  expect(drawnRows(await pane.drawn()).join('\n')).toContain('✨ Shiny Swolomon seen 2 times')
  await pane.unmount()
})

test('not shiny: his own colours', OPTIONS, async ($, on) => {
  world(on, TINY, {}, { now: SHINY_AT + 1000 })
  await $.session.start(SESSION)
  await $.command.run(workout('flex'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  const cells = ((await ui.find({ key: 'swolomon' })) as { props: { cells: string } } | undefined)?.props.cells
  await ui.unmount()
  expect(cells).toBe(FRAMES.flex)
})
