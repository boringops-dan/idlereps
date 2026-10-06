import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import { encodeCells } from '../hooks/portrait'
import { PEEK_AWAKE_MS, PEEK_NEAR_MS, PEEK_WIDTH, peekChangeIn, peekGrid, peekText } from '../hooks/peek'
import { SPRITE } from '../hooks/swolomon-sprite'
import { ANIMATED, BAND, blitLog, drawnRows, OPTIONS, SESSION, TINY, workout, world } from './world'

/** The peek (owner, 2026-10-06): his eyes above the prompt when nothing else is there. */

const eyes = (pose: Parameters<typeof peekGrid>[1]) => encodeCells(peekGrid(SPRITE, pose))

async function peekOf($: Engine, surface: 'terminal' | 'desktop' = 'terminal') {
  const ui = await $.ui.mount({ plugin: 'idlereps', surface, ...BAND })
  const raster = (await ui.find({ key: 'swolomon-eyes' })) as { props: { cells: string; columns: number; rows: number } } | undefined
  const rows = drawnRows(await ui.drawn())
  await ui.unmount()
  return { raster, rows }
}

test('his brows and eyes: one row, the face wide; blinking, glancing and staring each look different', () => {
  const idle = peekGrid(SPRITE, 'idle')
  expect([idle.length, idle.every(row => row.length === PEEK_WIDTH)]).toEqual([2, true])
  const all = (['idle', 'blink', 'glanceL', 'glanceR', 'lookYou'] as const).map(eyes)
  expect(new Set(all).size).toBe(all.length)
})

test('the word: minutes to the next set, near it, watching, nothing, dozing', () => {
  const now = 1_000_000
  expect(peekText({ isWorking: true, cueDueAt: now + 5 * 60_000, now }).text).toBe('next set in 5 min')
  expect(peekText({ isWorking: true, cueDueAt: now + 4 * 60_000 + 1, now }).text).toBe('next set in 5 min')
  expect(peekText({ isWorking: true, cueDueAt: now + PEEK_NEAR_MS - 1, now })).toEqual({ text: 'your set is coming up…', isNear: true, isDozing: false })
  expect(peekText({ isWorking: true, cueDueAt: null, now }).text).toBe('watching')
  expect(peekText({ isWorking: false, cueDueAt: null, now }).text).toBe('')
  expect(peekText({ isWorking: false, cueDueAt: null, now, isDozing: true })).toEqual({ text: 'z z z', isNear: false, isDozing: true })
  // Working wakes him whatever.
  expect(peekText({ isWorking: true, cueDueAt: null, now, isDozing: true }).isDozing).toBe(false)
})

test('when the word next changes: the minute, the minute before the set, dozing off; else never', () => {
  const now = 1_000_000
  expect(peekChangeIn({ isWorking: true, cueDueAt: now + 5 * 60_000, now, awakeUntil: 0 })).toBe(60_000)
  expect(peekChangeIn({ isWorking: true, cueDueAt: now + 90_000, now, awakeUntil: 0 })).toBe(30_000)
  expect(peekChangeIn({ isWorking: true, cueDueAt: now + 30_000, now, awakeUntil: 0 })).toBeNull()
  expect(peekChangeIn({ isWorking: true, cueDueAt: null, now, awakeUntil: 0 })).toBeNull()
  expect(peekChangeIn({ isWorking: false, cueDueAt: null, now, awakeUntil: now + PEEK_AWAKE_MS })).toBe(PEEK_AWAKE_MS)
  expect(peekChangeIn({ isWorking: false, cueDueAt: null, now, awakeUntil: now - 1 })).toBeNull()
})

test('nothing up, a plan: his eyes on one row, no buttons', OPTIONS, async ($, on) => {
  world(on, TINY)
  await $.session.start(SESSION)
  const { raster } = await peekOf($)
  expect([raster?.props.columns, raster?.props.rows]).toEqual([PEEK_WIDTH, 1])
})

test('a band up: the band, not the peek; it comes back when the band goes', OPTIONS, async ($, on) => {
  world(on, TINY)
  await $.session.start(SESSION)
  await $.command.run(workout('now'))
  expect((await peekOf($)).raster).toBeUndefined()
  await $.command.run(workout('later'))
  expect((await peekOf($)).raster).toBeDefined()
})

test('paused: no peek; resumed, he is back; never off the terminal', OPTIONS, async ($, on) => {
  world(on, TINY, { paused: true })
  await $.session.start(SESSION)
  expect((await peekOf($)).raster).toBeUndefined()
  await $.command.run(workout('resume'))
  expect((await peekOf($)).raster).toBeDefined()
  expect((await peekOf($, 'desktop')).raster).toBeUndefined()
  await $.command.run(workout('pause'))
  expect((await peekOf($)).raster).toBeUndefined()
})

test('Quiet: no peek', { options: { ...OPTIONS.options, coachChat: 'quiet' } }, async ($, on) => {
  world(on, TINY)
  await $.session.start(SESSION)
  expect((await peekOf($)).raster).toBeUndefined()
})

test('no plan yet: no peek', OPTIONS, async ($, on) => {
  world(on, null, { seen: { onboarded: { at: 1, n: 1 } } })
  await $.session.start(SESSION)
  expect((await peekOf($)).raster).toBeUndefined()
})

test('the agent working, a set coming: the minutes; under a minute, his eyes on you', OPTIONS, async ($, on) => {
  const { clock } = world(on, TINY)
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  // The first ask waits 30 s (cueAfter): near at once.
  let peek = await peekOf($)
  expect(peek.rows.join(' ')).toMatch(/your set is coming up/)
  expect(peek.raster?.props.cells).toBe(eyes('lookYou'))
  await clock.advance(31_000)
  // The ask is up: no peek.
  peek = await peekOf($)
  expect(peek.raster).toBeUndefined()
})

test('animated: his eyes blink and glance while the agent works; after a turn he dozes off, eyes shut, still', ANIMATED, async ($, on) => {
  const { clock } = world(on, TINY, { nextCueAt: Number.MAX_SAFE_INTEGER })
  const blits = blitLog(on, { withPeek: true })
  await $.session.start(SESSION)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await $.turn.start({ text: 'go', turnId: 't1' })
  await clock.advance(20_000)
  const moving = blits.filter(b => b.key === 'swolomon-eyes')
  expect(moving.length).toBeGreaterThan(2)
  expect(moving.some(b => b.cells === eyes('blink'))).toBe(true)
  await $.turn.complete({ turnId: 't1', durationMs: 20_000 } as never)
  await clock.advance(PEEK_AWAKE_MS + 5_000)
  expect(drawnRows(await ui.drawn()).join(' ')).toMatch(/z z z/)
  const settled = blits.length
  await clock.advance(10 * 60_000)
  expect(blits.length).toBe(settled)
  // The next turn wakes him.
  await $.turn.start({ text: 'go', turnId: 't2' })
  await clock.advance(20_000)
  expect(blits.length).toBeGreaterThan(settled)
  await ui.unmount()
})
