import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import { line } from '../hooks/copy'
import { daysLabel, parseDays, routineWeekMarks, wantsLog, ASK_AFTER_MS } from '../hooks/routine'
import { weekdayName } from '../hooks/schedule'
import type { HistoryEntry, Plan, Routine } from '../types'
import { BAND, drawnRows, NOON, OPTIONS, ownStore, SESSION, STATUS, tallyOf, TINY, TODAY, workout, world } from './world'

/**
 * Just remind me (owner, 2026-10-02: "some people may just want reminders ... hey go for a lift and tracking
 * that"): no plan; on their days Swolomon reminds them while the agent works, and asks what they hit.
 * And Give me a plan's three ways: Quick start (now with weights), build it, or bring their own.
 */

const ACKED = { seen: { safety: { at: 1, n: 1 } } }
const TODAYS = weekdayName(TODAY)
const OTHER_DAY = weekdayName(TODAY + 1)
const done = (turnId: string) => ({ turnId, answer: '', reason: 'answer', durationMs: 60_000, isAborted: false }) as never

async function bandOf($: Engine) {
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  const rows = drawnRows(await ui.drawn())
  const keys = (await ui.findAll({ type: 'Button' })).map(b => String(b.key))
  await ui.unmount()
  return { rows, keys, text: rows.join('\n') }
}

/** A long turn: the band as it stands once the wait has passed, the turn left running. */
async function longTurn($: Engine, clock: { advance: (ms: number) => Promise<void> }, turnId: string) {
  await $.turn.start({ text: 'go', turnId })
  await clock.advance(31_000)
  return bandOf($)
}

const trained = (store: Map<string, unknown>) => ((store.get('history') as HistoryEntry[] | undefined) ?? []).filter(e => e.kind === 'trained')

test('Just remind me from the introduction: the safety step, the days, how it works, then today’s reminder', OPTIONS, async ($, on) => {
  const store = ownStore(on, {}, { fresh: true })
  world(on, null, 'own-store')
  await $.session.start(SESSION)
  expect((await bandOf($)).keys).toEqual(['program', 'remind', 'notnow', 'dontask'])
  await $.command.run(workout('remind'))
  expect((await bandOf($)).keys).toContain('understand')
  await $.command.run(workout('understand'))
  expect((await bandOf($)).keys).toEqual(['mwf', 'tts', 'weekdays', 'everyday', 'back'])
  await $.command.run(workout('everyday'))
  expect((store.get('routine') as Routine).days).toHaveLength(7)
  const howto = await bandOf($)
  expect(howto.keys).toEqual(['gotit'])
  expect(howto.text).toContain(line('howto-remind-days', { day: TODAY }))
  await $.command.run(workout('gotit'))
  expect((await bandOf($)).keys).toEqual(['going', 'did', 'skipday'])
})

test('on one of their days, a long turn reminds; Going, and a later turn asks what they hit', OPTIONS, async ($, on) => {
  const store = ownStore(on, { routine: { days: [TODAYS] } })
  const { clock, w } = world(on, null, 'own-store')
  await $.session.start(SESSION)
  const remind = await longTurn($, clock, 't1')
  expect(remind.keys).toEqual(['going', 'did', 'skipday'])
  await $.command.run(workout('going'))
  expect(w.toasts.at(-1)).toBe(line('remind-going', { day: TODAY }))
  expect((store.get('routine') as Routine).going?.d).toBe(TODAY)
  await $.turn.complete(done('t1'))
  // Too soon: no question yet.
  expect((await longTurn($, clock, 't2')).keys).toEqual([])
  await $.turn.complete(done('t2'))
  await clock.advance(ASK_AFTER_MS)
  const ask = await longTurn($, clock, 't3')
  expect(ask.keys).toEqual(['upper', 'lower', 'full', 'cardio', 'other', 'didnt'])
  await $.command.run(workout('upper'))
  expect(trained(store)).toMatchObject([{ kind: 'trained', d: TODAY, what: 'upper' }])
  expect((store.get('routine') as Routine).going).toBeUndefined()
})

test('not one of their days: no reminder, however long the turn', OPTIONS, async ($, on) => {
  const { clock } = world(on, null, { routine: { days: [OTHER_DAY] } })
  await $.session.start(SESSION)
  expect((await longTurn($, clock, 't1')).keys).toEqual([])
})

test('Not today: no reminder again that day', OPTIONS, async ($, on) => {
  const { clock } = world(on, null, { routine: { days: [TODAYS] } })
  await $.session.start(SESSION)
  await longTurn($, clock, 't1')
  await $.command.run(workout('skipday'))
  await $.turn.complete(done('t1'))
  expect((await longTurn($, clock, 't2')).keys).toEqual([])
})

test('Already did: straight to what it was, logged today', OPTIONS, async ($, on) => {
  const store = ownStore(on, { routine: { days: [TODAYS] } })
  const { clock } = world(on, null, 'own-store')
  await $.session.start(SESSION)
  await longTurn($, clock, 't1')
  await $.command.run(workout('did'))
  await $.command.run(workout('cardio'))
  expect(trained(store)).toMatchObject([{ d: TODAY, what: 'cardio' }])
  // Logged today: no reminder after that.
  await $.turn.complete(done('t1'))
  expect((await longTurn($, clock, 't2')).keys).toEqual([])
})

test("Didn't go: nothing logged, and the question goes", OPTIONS, async ($, on) => {
  const store = ownStore(on, { routine: { days: [TODAYS], going: { d: TODAY - 1, t: NOON - 86_400_000 } } })
  const { clock } = world(on, null, 'own-store')
  await $.session.start(SESSION)
  const ask = await longTurn($, clock, 't1')
  expect(ask.text).toContain(line('trained-detail-late', { day: TODAY, when: 'yesterday' }))
  await $.command.run(workout('didnt'))
  expect(trained(store)).toEqual([])
  expect((store.get('routine') as Routine).going).toBeUndefined()
})

test('a session from an earlier day is logged on that day', OPTIONS, async ($, on) => {
  const store = ownStore(on, { routine: { days: [OTHER_DAY], going: { d: TODAY - 2, t: NOON - 2 * 86_400_000 } } })
  const { clock } = world(on, null, 'own-store')
  await $.session.start(SESSION)
  await longTurn($, clock, 't1')
  await $.command.run(workout('lower'))
  expect(trained(store)).toMatchObject([{ d: TODAY - 2, what: 'lower' }])
})

test('/workout days names the days; reminders replace the plan’s sets', OPTIONS, async ($, on) => {
  const store = ownStore(on, {})
  const { clock } = world(on, TINY, 'own-store')
  await $.session.start(SESSION)
  expect((await $.command.run(workout(`days ${TODAYS}`))).text).toBe(line('days-set', { day: TODAY, days: daysLabel([TODAYS]) }))
  expect((store.get('routine') as Routine).days).toEqual([TODAYS])
  // TINY would cue a set today: with reminders, the reminder comes instead.
  expect((await longTurn($, clock, 't1')).keys).toEqual(['going', 'did', 'skipday'])
  expect((await $.command.run(workout('days someday'))).text).toBe(line('reply-days-usage', { day: TODAY }))
})

test('/workout in reminders: the week, the count, their days, and its own buttons', OPTIONS, async ($, on) => {
  const history: HistoryEntry[] = [{ kind: 'trained', t: NOON, d: TODAY, what: 'full' }]
  const { w } = world(on, null, { routine: { days: ['mon', 'wed', 'fri'] }, history })
  await $.session.start(SESSION)
  await $.command.run(workout(''))
  expect(w.opened).toContain('workout-status')
  const pane = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...STATUS })
  const rows = drawnRows(await pane.drawn()).join('\n')
  expect(rows).toContain('Mon Wed Fri')
  expect(rows).toContain('1 of 3')
  expect(rows).toContain('Last session: Full body, today')
  expect((await pane.findAll({ type: 'Button' })).map(b => String(b.key))).toEqual(['log', 'days', 'plan', 'close'])
  await pane.unmount()
  expect((await $.command.run(workout('status'))).text).toBe(line('routine-status', { day: TODAY, days: 'Mon Wed Fri', done: 1, of: 3, today: 'Trained today.' }))
})

test('the footer says it is a lift day, and done once trained', OPTIONS, async ($, on) => {
  world(on, null, { routine: { days: [TODAYS] } })
  await $.session.start(SESSION)
  expect(await tallyOf($)).toBe('💪 lift day')
  await $.command.run(workout('log'))
  await $.command.run(workout('upper'))
  expect(await tallyOf($)).toBe('💪 done')
})

test('/workout log any day, and without reminders it says how to set them', OPTIONS, async ($, on) => {
  world(on, null, {})
  await $.session.start(SESSION)
  expect((await $.command.run(workout('log'))).text).toBe(line('reply-no-routine', { day: TODAY }))
})

test('a plan replaces reminders: Get a plan from the pane, Quick start, and the reminders are gone', OPTIONS, async ($, on) => {
  const store = ownStore(on, { ...ACKED, routine: { days: [TODAYS] } })
  world(on, null, 'own-store')
  await $.session.start(SESSION)
  await $.command.run(workout(''))
  const pane = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...STATUS })
  await pane.press({ key: 'plan' })
  await pane.unmount()
  expect((await bandOf($)).keys).toEqual(['quickstart', 'setup', 'own', 'back'])
  await $.command.run(workout('quickstart'))
  await $.command.run(workout('desk'))
  expect(store.get('routine')).toBeUndefined()
})

test('I have my own: how to paste it, or where the file is; Back to the three ways', OPTIONS, async ($, on) => {
  world(on, null, ACKED, { fresh: true })
  await $.session.start(SESSION)
  await $.command.run(workout('program'))
  await $.command.run(workout('own'))
  const own = await bandOf($)
  expect(own.text).toContain(line('byoplan-paste', { day: TODAY }))
  expect(own.text).toContain('plan.json')
  await $.command.run(workout('back'))
  expect((await bandOf($)).keys).toEqual(['quickstart', 'setup', 'own', 'back'])
  await $.command.run(workout('back'))
  expect((await bandOf($)).keys).toEqual(['program', 'remind', 'notnow', 'dontask'])
})

test('Quick start with weights: the starter plan built for dumbbells, a bar and bands', OPTIONS, async ($, on) => {
  const { w } = world(on, null, ACKED)
  await $.session.start(SESSION)
  await $.command.run(workout('quickstart'))
  expect((await bandOf($)).keys).toEqual(['desk', 'home', 'gym'])
  await $.command.run(workout('gym'))
  const plan = JSON.parse(w.writes.filter(x => x.path.endsWith('plan.json')).at(-1)?.text ?? '{}') as Plan
  expect(plan.builtFor).toEqual({ dumbbells: true, bar: true, bands: true })
  expect(w.toasts).toContain(line('quick-start-gym', { day: TODAY }))
})

test('the safety step remembers which way in asked for it', OPTIONS, async ($, on) => {
  world(on, TINY, {}, { fresh: true })
  await $.session.start(SESSION)
  await $.command.run(workout('remind'))
  await $.command.run(workout('understand'))
  expect((await bandOf($)).keys).toContain('mwf')
})

test('reminder words: the days parsed from any spelling, the week marked, the question timed', () => {
  expect(parseDays('Mon, wednesday & FRI')).toEqual(['mon', 'wed', 'fri'])
  expect(parseDays('sunday saturday')).toEqual(['sat', 'sun'])
  expect(parseDays('someday')).toBeNull()
  expect(daysLabel(['fri', 'mon'])).toBe('Mon Fri')
  expect(daysLabel(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'])).toBe('Every day')
  const routine: Routine = { days: [TODAYS] }
  const marks = routineWeekMarks(routine, [{ kind: 'trained', t: NOON, d: TODAY, what: 'upper' }], TODAY)
  expect(marks.filter(m => m === '●')).toHaveLength(1)
  expect(wantsLog({ ...routine, going: { d: TODAY, t: NOON } }, NOON + ASK_AFTER_MS - 1, TODAY)).toBe(false)
  expect(wantsLog({ ...routine, going: { d: TODAY, t: NOON } }, NOON + ASK_AFTER_MS, TODAY)).toBe(true)
  expect(wantsLog({ ...routine, going: { d: TODAY - 1, t: NOON } }, NOON, TODAY)).toBe(true)
})
