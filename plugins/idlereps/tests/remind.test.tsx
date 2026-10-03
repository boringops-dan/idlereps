import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import { line } from '../hooks/copy'
import { ideasFor, IDEAS, remindWeekMarks } from '../hooks/remind'
import type { HistoryEntry, Plan } from '../types'
import { BAND, drawnRows, NOON, OPTIONS, ownStore, SESSION, STATUS, tallyOf, TINY, TODAY, workout, world } from './world'

/**
 * Just remind me (owner, 2026-10-03: "Hey why don't you go and do a set or do some quick cardio"): no
 * plan. While the agent works Swolomon says do a set, anything; one tap logs what it worked, and it counts
 * as a set. And Build my own's ways to a plan: Quick start (now with weights), build it, or bring your own.
 */

const REMIND = { mode: 'remind' }
const REMIND_KEYS = ['upper', 'lower', 'cardio', 'other', 'later', 'skipday']
const done = (turnId: string) => ({ turnId, answer: '', reason: 'answer', durationMs: 60_000, isAborted: false }) as never

async function bandOf($: Engine) {
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  const rows = drawnRows(await ui.drawn())
  const keys = (await ui.findAll({ type: 'Button' })).map(b => String(b.key))
  await ui.unmount()
  return { rows, keys, text: rows.join('\n') }
}

/** A long turn: the band once the wait has passed, the turn left running. */
async function longTurn($: Engine, clock: { advance: (ms: number) => Promise<void> }, turnId: string) {
  await $.turn.start({ text: 'go', turnId })
  await clock.advance(61_000)
  return bandOf($)
}

const moved = (store: Map<string, unknown>) => ((store.get('history') as HistoryEntry[] | undefined) ?? []).filter(e => e.kind === 'moved')

test('Just remind me from the introduction: no plan, and a set offered right there, the safety note on it', OPTIONS, async ($, on) => {
  const store = ownStore(on, {}, { fresh: true })
  const { w } = world(on, null, 'own-store')
  await $.session.start(SESSION)
  await $.command.run(workout('remind'))
  const first = await bandOf($)
  expect(first.keys).toEqual(REMIND_KEYS)
  expect(first.text).toContain(line('remind-first', { day: TODAY }))
  expect(first.text).toContain(line('safety-short', { day: TODAY }))
  expect(store.get('mode')).toBe('remind')
  expect(w.writes.filter(x => x.path.endsWith('plan.json'))).toEqual([])
  await $.command.run(workout('upper'))
  expect(moved(store)).toMatchObject([{ kind: 'moved', d: TODAY, what: 'upper' }])
  expect(store.get('totalDoneSets')).toBe(1)
  expect((store.get('seen') as Record<string, unknown>).safety).toBeDefined()
})

test('while the agent works: a reminder; one tap logs it, and the gap holds the next one off', OPTIONS, async ($, on) => {
  const store = ownStore(on, REMIND)
  const { clock, w } = world(on, null, 'own-store')
  await $.session.start(SESSION)
  expect((await longTurn($, clock, 't1')).keys).toEqual(REMIND_KEYS)
  await $.command.run(workout('cardio'))
  expect(w.toasts.at(-1)).toMatch(/Cardio/)
  await $.turn.complete(done('t1'))
  // Inside the gap: nothing.
  expect((await longTurn($, clock, 't2')).keys).toEqual([])
  await $.turn.complete(done('t2'))
  await clock.advance(15 * 60_000)
  expect((await longTurn($, clock, 't3')).keys).toEqual(REMIND_KEYS)
  expect(moved(store)).toHaveLength(1)
})

test('Later holds it off for the gap; Not today for the day', OPTIONS, async ($, on) => {
  const { clock } = world(on, null, REMIND)
  await $.session.start(SESSION)
  await longTurn($, clock, 't1')
  await $.command.run(workout('later'))
  expect((await bandOf($)).keys).toEqual([])
  await $.turn.complete(done('t1'))
  await clock.advance(15 * 60_000)
  expect((await longTurn($, clock, 't2')).keys).toEqual(REMIND_KEYS)
  await $.command.run(workout('skipday'))
  await $.turn.complete(done('t2'))
  await clock.advance(60 * 60_000)
  expect((await longTurn($, clock, 't3')).keys).toEqual([])
})

test('a short turn, paused, or quiet hours: no reminder', OPTIONS, async ($, on) => {
  const { clock } = world(on, null, { ...REMIND, paused: true })
  await $.session.start(SESSION)
  expect((await longTurn($, clock, 't1')).keys).toEqual([])
})

test('Swolomon still misreads the agent in Just remind me', OPTIONS, async ($, on) => {
  const { clock } = world(on, null, REMIND)
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await $.tool.call({ tool: 'Read', file_path: '/x' } as never)
  await $.turn.complete({ turnId: 't1', answer: '', reason: 'answer', durationMs: 183_000, isAborted: false } as never)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', component: 'TurnDuration', props: { word: 'Baked', durationMs: 183_000 } })
  expect(drawnRows(await ui.drawn())[1]).toMatch(/^Swolomon: Your agent read a fitness magazine/)
  await ui.unmount()
  void clock
})

test('a set from a reminder can rank you up', OPTIONS, async ($, on) => {
  world(on, null, { ...REMIND, totalDoneSets: 24 })
  await $.session.start(SESSION)
  await $.command.run(workout('log'))
  await $.command.run(workout('lower'))
  const band = await bandOf($)
  expect(band.keys).toEqual(['letsgo'])
  expect(band.text).toContain('Rank up')
})

test('/workout in Just remind me: today, the week, the rank, and its own buttons', OPTIONS, async ($, on) => {
  const history: HistoryEntry[] = [{ kind: 'moved', t: NOON, d: TODAY, what: 'upper' }, { kind: 'moved', t: NOON + 1, d: TODAY, what: 'cardio' }]
  const { w } = world(on, null, { ...REMIND, history, totalDoneSets: 2 })
  await $.session.start(SESSION)
  await $.command.run(workout(''))
  expect(w.opened).toContain('workout-status')
  const pane = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...STATUS })
  const rows = drawnRows(await pane.drawn()).join('\n')
  expect(rows).toContain('2 sets')
  expect(rows).toContain('Last set: Cardio, today')
  expect(rows).toContain('Rank:')
  expect((await pane.findAll({ type: 'Button' })).map(b => String(b.key))).toEqual(['now', 'plan', 'close'])
  await pane.press({ key: 'now' })
  await pane.unmount()
  expect((await bandOf($)).keys).toEqual(REMIND_KEYS)
  expect((await $.command.run(workout('status'))).text).toBe(line('remind-status', { day: TODAY, n: 2, week: 2 }))
})

test('the footer counts today’s sets', OPTIONS, async ($, on) => {
  world(on, null, REMIND)
  await $.session.start(SESSION)
  expect(await tallyOf($)).toBeUndefined()
  await $.command.run(workout('log'))
  await $.command.run(workout('other'))
  expect(await tallyOf($)).toBe('💪 1 today')
})

test('/workout log and /workout remind: off, it says how to turn it on; /workout remind turns it on', OPTIONS, async ($, on) => {
  const store = ownStore(on, {})
  world(on, TINY, 'own-store')
  await $.session.start(SESSION)
  expect((await $.command.run(workout('log'))).text).toBe(line('reply-no-remind', { day: TODAY }))
  expect((await $.command.run(workout('remind'))).text).toBe(line('reply-remind-on', { day: TODAY }))
  expect(store.get('mode')).toBe('remind')
})

test('a plan replaces Just remind me: Get a plan from the pane, Quick start', OPTIONS, async ($, on) => {
  const store = ownStore(on, REMIND)
  world(on, null, 'own-store')
  await $.session.start(SESSION)
  await $.command.run(workout(''))
  const pane = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...STATUS })
  await pane.press({ key: 'plan' })
  await pane.unmount()
  expect((await bandOf($)).keys).toEqual(['quickstart', 'setup', 'own', 'back'])
  await $.command.run(workout('quickstart'))
  await $.command.run(workout('desk'))
  expect(store.get('mode')).toBeUndefined()
})

test('I have my own: how to paste it, or where the file is; Back, and Back again to the introduction', OPTIONS, async ($, on) => {
  world(on, null, {}, { fresh: true })
  await $.session.start(SESSION)
  await $.command.run(workout('program'))
  await $.command.run(workout('own'))
  const own = await bandOf($)
  expect(own.text).toContain(line('byoplan-paste', { day: TODAY }))
  expect(own.text).toContain('plan.json')
  await $.command.run(workout('back'))
  expect((await bandOf($)).keys).toEqual(['quickstart', 'setup', 'own', 'back'])
  await $.command.run(workout('back'))
  expect((await bandOf($)).keys).toEqual(['quickstart', 'remind', 'program', 'notnow'])
})

test('Quick start with weights: the starter plan built for dumbbells, a bar and bands', OPTIONS, async ($, on) => {
  const { w } = world(on, null)
  await $.session.start(SESSION)
  await $.command.run(workout('quickstart'))
  expect((await bandOf($)).keys).toEqual(['desk', 'home', 'gym'])
  await $.command.run(workout('gym'))
  const plan = JSON.parse(w.writes.filter(x => x.path.endsWith('plan.json')).at(-1)?.text ?? '{}') as Plan
  expect(plan.builtFor).toEqual({ dumbbells: true, bar: true, bands: true })
  expect(w.toasts).toContain(line('quick-start-gym', { day: TODAY }))
})

test('ideas: three at a time, a different three each time, every idea in turn', () => {
  expect(ideasFor(0)).toHaveLength(3)
  expect(ideasFor(1)).not.toEqual(ideasFor(0))
  const seen = new Set(Array.from({ length: IDEAS.length }, (_, n) => ideasFor(n)).flat())
  expect(seen.size).toBe(IDEAS.length)
  const marks = remindWeekMarks([{ kind: 'moved', t: NOON, d: TODAY, what: 'upper' }], TODAY)
  expect(marks.filter(m => m === '●')).toHaveLength(1)
})
