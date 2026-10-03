import { expect, test } from 'claude-code/testing'

import { line } from '../hooks/copy'
import { greetingOf, LONG_AWAY_DAYS } from '../hooks/greeting'
import type { HistoryEntry } from '../types'
import { dayNumberOf } from '../hooks/plan'
import { NOON, OPTIONS, ownStore, SESSION, TINY, TODAY, world } from './world'

/** Swolomon notices you (owner, 2026-10-03): the first session of a day, a hello like a real person's. */

const H = 3_600_000
const facts = (lastSeenOn: number | undefined, movedYesterday = 0, workedYesterdayMs = 0) => ({ lastSeenOn, today: TODAY, movedYesterday, workedYesterdayMs })

test('the hello: missed you after two days, the warm spot after a week, yesterday the day after', () => {
  expect(greetingOf(facts(undefined))).toBeNull()
  expect(greetingOf(facts(TODAY))).toBeNull()
  expect(greetingOf(facts(TODAY - 2))).toEqual({ id: 'greet-missed', ctx: { n: 2 } })
  expect(greetingOf(facts(TODAY - LONG_AWAY_DAYS))?.id).toBe('greet-long-away')
  expect(greetingOf(facts(TODAY - 1, 4, 3 * H))).toEqual({ id: 'greet-yesterday', ctx: { n: 4, worked: '3 h 0 m' } })
  expect(greetingOf(facts(TODAY - 1, 4, 0))?.id).toBe('greet-yesterday-moved')
  expect(greetingOf(facts(TODAY - 1, 0, 3 * H))?.id).toBe('greet-yesterday-agent')
  // A quiet yesterday, or a few minutes of agent work: nothing to say.
  expect(greetingOf(facts(TODAY - 1, 0, 5 * 60_000))).toBeNull()
})

test('back after three days: he missed you, in place of the day toast', OPTIONS, async ($, on) => {
  const store = ownStore(on, { lastSeenOn: TODAY - 3 })
  const { w } = world(on, TINY, 'own-store')
  await $.session.start(SESSION)
  expect(w.toasts).toEqual([line('greet-missed', { day: TODAY, n: 3 })])
  expect(store.get('lastSeenOn')).toBe(TODAY)
})

test('the day after: yesterday’s moves and the agent’s hours', OPTIONS, async ($, on) => {
  const history: HistoryEntry[] = [
    { kind: 'moved', t: NOON - 24 * H, d: TODAY - 1, what: 'upper' },
    { kind: 'stretch', t: NOON - 23 * H, d: TODAY - 1, exercise: 'Neck rolls', seconds: 30 },
    { kind: 'moved', t: NOON - 48 * H, d: TODAY - 2, what: 'upper' },
  ]
  const workIntervals = { [String(TODAY - 1)]: [[NOON - 24 * H, NOON - 22 * H]] }
  const { w } = world(on, null, { mode: 'remind', lastSeenOn: TODAY - 1, history, workIntervals })
  await $.session.start(SESSION)
  expect(w.toasts).toContain(line('greet-yesterday', { day: TODAY, n: 2, worked: '2 h 0 m' }))
})

test('a second session the same day: no hello again', OPTIONS, async ($, on) => {
  const { w } = world(on, TINY, { lastSeenOn: TODAY - 3 })
  await $.session.start(SESSION)
  const first = w.toasts.length
  await $.session.start(SESSION)
  expect(w.toasts.filter(t => t.startsWith('Missed you') || t.includes('bench missed') || t.includes('I counted'))).toHaveLength(1)
  expect(w.toasts.length).toBe(first)
})

test('not training yet (no plan, no reminders): no hello', OPTIONS, async ($, on) => {
  const { w } = world(on, null, { lastSeenOn: TODAY - 3 })
  await $.session.start(SESSION)
  expect(w.toasts.some(t => t === line('greet-missed', { day: TODAY, n: 3 }))).toBe(false)
})

const QUIET = { options: { ...OPTIONS.options, quietHours: '22-07' } }

test('Monday after the weekend: he missed you, and last week’s recap; no day toast', OPTIONS, async ($, on) => {
  const monday = new Date(2026, 9, 5, 12).getTime()
  const day = dayNumberOf(monday)
  const { w } = world(on, TINY, { lastSeenOn: day - 3 }, { now: monday })
  await $.session.start(SESSION)
  expect(w.toasts[0]).toBe(line('greet-missed', { day, n: 3 }))
  expect(w.toasts).toHaveLength(2)
})

test('a quiet yesterday: no hello, and the day toast as before', OPTIONS, async ($, on) => {
  const { w } = world(on, TINY, { lastSeenOn: TODAY - 1 })
  await $.session.start(SESSION)
  expect(w.toasts).toHaveLength(1)
  expect(w.toasts[0]?.startsWith('Missed') ?? false).toBe(false)
})

test('in quiet hours the hello waits for a later session that day', QUIET, async ($, on) => {
  const store = ownStore(on, { lastSeenOn: TODAY - 3 })
  const late = new Date(2026, 9, 2, 6, 0).getTime()
  const { w } = world(on, TINY, 'own-store', { now: late })
  await $.session.start(SESSION)
  expect(w.toasts).toEqual([])
  expect(store.get('lastSeenOn')).toBe(TODAY - 3)
})

test('the next day after a hello: yesterday, not missed you', OPTIONS, async ($, on) => {
  const store = ownStore(on, { lastSeenOn: TODAY - 1 })
  world(on, TINY, 'own-store')
  await $.session.start(SESSION)
  expect(store.get('lastSeenOn')).toBe(TODAY)
  expect(greetingOf(facts(store.get('lastSeenOn') as number, 1, 0))).toBeNull()
  expect(greetingOf({ lastSeenOn: TODAY, today: TODAY + 1, movedYesterday: 1, workedYesterdayMs: 0 })?.id).toBe('greet-yesterday-moved')
})

test('ten days away: your spot, kept warm', OPTIONS, async ($, on) => {
  const { w } = world(on, null, { mode: 'remind', lastSeenOn: TODAY - 10 })
  await $.session.start(SESSION)
  expect(w.toasts).toContain(line('greet-long-away', { day: TODAY }))
})
