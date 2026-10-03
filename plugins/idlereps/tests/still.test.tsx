import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import { line } from '../hooks/copy'
import { dailyTarget, START_TARGET, TARGET_MAX } from '../hooks/remind'
import { sittingMs, STILL_MS } from '../hooks/still'
import type { HistoryEntry } from '../types'
import { BAND, drawnRows, NOON, OPTIONS, ownStore, SESSION, STATUS, tallyOf, TINY, TODAY, workout, world } from './world'

/**
 * A daily target that follows you, and standing up after a long while sitting (owner, 2026-10-03: "keeping
 * our eye on being a light workout prompter for exercise while coding").
 */

const H = 3_600_000
const REMIND = { mode: 'remind' }
const moved = (d: number, n: number): HistoryEntry[] => Array.from({ length: n }, (_, i) => ({ kind: 'moved', t: NOON - (TODAY - d) * 24 * H + i, d, what: 'upper' }))
/** Today: the agent worked 2.5 hours this morning. */
const SAT = { workIntervals: { [String(TODAY)]: [[NOON - 3 * H, NOON - H / 2]] } }

async function bandOf($: Engine) {
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  const rows = drawnRows(await ui.drawn())
  const keys = (await ui.findAll({ type: 'Button' })).map(b => String(b.key))
  await ui.unmount()
  return { keys, text: rows.join('\n') }
}

async function longTurn($: Engine, clock: { advance: (ms: number) => Promise<void> }, turnId = 't1') {
  await $.turn.start({ text: 'go', turnId })
  await clock.advance(61_000)
  return bandOf($)
}

test('the target: three to start; then a usual active day; a quarter lower in a rough week; within 1 to 6', () => {
  expect(dailyTarget([], TODAY)).toBe(START_TARGET)
  expect(dailyTarget([...moved(TODAY - 1, 4), ...moved(TODAY - 2, 4)], TODAY)).toBe(START_TARGET)
  const steady = [1, 2, 3, 8, 9, 10].flatMap(ago => moved(TODAY - ago, 4))
  expect(dailyTarget(steady, TODAY)).toBe(4)
  // This week: one active day; last week: four. A rough week: 4 × 0.75.
  const rough = [1, 8, 9, 10, 11].flatMap(ago => moved(TODAY - ago, 4))
  expect(dailyTarget(rough, TODAY)).toBe(3)
  expect(dailyTarget([1, 2, 3].flatMap(ago => moved(TODAY - ago, 20)), TODAY)).toBe(TARGET_MAX)
  // Today never counts toward its own target.
  expect(dailyTarget([...steady, ...moved(TODAY, 20)], TODAY)).toBe(4)
})

test('sitting: the working time after the last move', () => {
  expect(sittingMs([[0, 100], [200, 300]], 50)).toBe(150)
  expect(sittingMs([[0, 100]], 200)).toBe(0)
  expect(STILL_MS).toBe(2 * H)
})

test('reaching the target: Swolomon says so, and the footer ticks it', OPTIONS, async ($, on) => {
  const { w } = world(on, null, { ...REMIND, history: moved(TODAY, 2) })
  await $.session.start(SESSION)
  await $.command.run(workout('log'))
  await $.command.run(workout('cardio'))
  expect(w.toasts.at(-1)).toBe(line('target-hit', { day: TODAY, n: 3 }))
  expect(await tallyOf($)).toBe('💪 3 today ✓')
})

test('two hours of agent work and nothing moved: stand up with him; it counts as moving, not a set', OPTIONS, async ($, on) => {
  const store = ownStore(on, { ...REMIND, ...SAT })
  const { clock, w } = world(on, null, 'own-store')
  await $.session.start(SESSION)
  const band = await longTurn($, clock)
  expect(band.keys).toEqual(['stood', 'later'])
  expect(band.text).toContain(line('still-detail', { day: TODAY }))
  await $.command.run(workout('stood'))
  expect((store.get('history') as HistoryEntry[]).at(-1)).toMatchObject({ kind: 'stood', d: TODAY })
  expect(store.get('totalDoneSets')).toBeUndefined()
  expect(w.toasts.at(-1)).toMatch(/upright|Blood flowing|Legs: awake/)
  expect(await tallyOf($)).toBe('💪 1/3 today')
})

test('with a plan too, and only once a day', OPTIONS, async ($, on) => {
  const { clock } = world(on, TINY, SAT)
  await $.session.start(SESSION)
  expect((await longTurn($, clock, 't1')).keys).toEqual(['stood', 'later'])
  await $.command.run(workout('later'))
  await $.turn.complete({ turnId: 't1', answer: '', reason: 'answer', durationMs: 61_000, isAborted: false } as never)
  expect((await longTurn($, clock, 't2')).keys).not.toEqual(['stood', 'later'])
})

test('moved an hour ago: no ask', OPTIONS, async ($, on) => {
  const { clock } = world(on, null, { ...REMIND, ...SAT, history: [{ kind: 'moved', t: NOON - H, d: TODAY, what: 'upper' }] })
  await $.session.start(SESSION)
  expect((await longTurn($, clock)).keys).not.toEqual(['stood', 'later'])
})

test('Not today, paused, or not training: no ask', OPTIONS, async ($, on) => {
  const { clock } = world(on, null, { ...REMIND, ...SAT, declinedOn: TODAY })
  await $.session.start(SESSION)
  expect((await longTurn($, clock)).keys).toEqual([])
})

test('no plan and no reminders: no ask', OPTIONS, async ($, on) => {
  const { clock } = world(on, null, SAT)
  await $.session.start(SESSION)
  expect((await longTurn($, clock)).keys).not.toEqual(['stood', 'later'])
})

const done = (turnId: string) => ({ turnId, answer: '', reason: 'answer', durationMs: 61_000, isAborted: false }) as never

test('Later pressed on the band (with a plan): it goes, and stays gone today', OPTIONS, async ($, on) => {
  const { clock } = world(on, TINY, SAT)
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await clock.advance(61_000)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await ui.press({ key: 'later' })
  await ui.unmount()
  expect((await bandOf($)).keys).toEqual([])
})

test('Later in Just remind me: gone, and the next reminder after the gap is a set, not the ask to stand', OPTIONS, async ($, on) => {
  const { clock } = world(on, null, { ...REMIND, ...SAT })
  await $.session.start(SESSION)
  await longTurn($, clock, 't1')
  await $.command.run(workout('later'))
  expect((await bandOf($)).keys).toEqual([])
  await $.turn.complete(done('t1'))
  await clock.advance(16 * 60_000)
  expect((await longTurn($, clock, 't2')).keys).toEqual(['upper', 'lower', 'cardio', 'other', 'later', 'skipday'])
})

test('Stood up pressed with a plan: logged as standing, the workout untouched', OPTIONS, async ($, on) => {
  const store = ownStore(on, SAT)
  const { clock } = world(on, TINY, 'own-store')
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await clock.advance(61_000)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await ui.press({ key: 'stood' })
  await ui.unmount()
  expect((store.get('history') as HistoryEntry[]).map(e => e.kind)).toEqual(['stood'])
  expect(store.get('progress')).toBeUndefined()
})

test('the pane in Just remind me: today’s moves against the target', OPTIONS, async ($, on) => {
  world(on, null, { ...REMIND, history: [...moved(TODAY, 1), { kind: 'stood', t: NOON, d: TODAY }] })
  await $.session.start(SESSION)
  await $.command.run(workout(''))
  const pane = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...STATUS })
  const rows = drawnRows(await pane.drawn()).join('\n')
  expect(rows).toContain('1 set · 2 of 3 moves')
  await pane.unmount()
})

test('past the target: the usual logged line, and the tick stays', OPTIONS, async ($, on) => {
  const { w } = world(on, null, { ...REMIND, history: moved(TODAY, 3) })
  await $.session.start(SESSION)
  await $.command.run(workout('log'))
  await $.command.run(workout('upper'))
  expect(w.toasts.at(-1)).not.toBe(line('target-hit', { day: TODAY, n: 3 }))
  expect(await tallyOf($)).toBe('💪 4 today ✓')
})
