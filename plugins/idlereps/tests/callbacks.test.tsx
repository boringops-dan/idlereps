import { expect, test } from 'claude-code/testing'

import { anniversaryOf, callbackFor, weekdayOf } from '../hooks/callbacks'
import { line } from '../hooks/copy'
import type { HistoryEntry } from '../types'
import { BAND, NOON, OPTIONS, SESSION, TINY, TODAY, workout, world } from './world'

/** He remembers you (owner, 2026-10-06): your own history, said back on a set band. */

const H = 3_600_000
const set = (d: number, result: 'done' | 'skip' = 'done', count?: number, exercise = 'Push-ups'): HistoryEntry => ({
  kind: 'set',
  t: NOON - (TODAY - d) * 24 * H,
  d,
  w: 0,
  exercise,
  set: 1,
  target: '10 reps',
  result,
  ...(count === undefined ? {} : { count }),
})

test('the weekday of a day number', () => {
  expect(weekdayOf(TODAY)).toBe('Friday')
  expect(weekdayOf(TODAY + 3)).toBe('Monday')
  expect(weekdayOf(0)).toBe('Thursday')
})

test('a milestone set of this exercise: the 10th, the 25th; not the 11th', () => {
  const nine = Array.from({ length: 9 }, (_, i) => set(TODAY - 40 + i * 3))
  expect(callbackFor(nine, 'Push-ups', TODAY)).toMatchObject({ id: 'cb-milestone', ctx: { n: 10 } })
  expect(callbackFor([...nine, set(TODAY - 1)], 'Push-ups', TODAY)?.id).not.toBe('cb-milestone')
  expect(callbackFor(Array.from({ length: 24 }, (_, i) => set(TODAY - 50 + i * 2)), 'Push-ups', TODAY)).toMatchObject({ id: 'cb-milestone', ctx: { n: 25 } })
  // Other exercises do not count toward it.
  expect(callbackFor(nine, 'Squats', TODAY)).toBeNull()
})

test('how far it has come: up 2 or more from a month back; a small rise or too recent a start says nothing', () => {
  const grown = [set(TODAY - 30, 'done', 8), set(TODAY - 16, 'done', 9), set(TODAY - 2, 'done', 11)]
  expect(callbackFor(grown, 'Push-ups', TODAY)).toMatchObject({ id: 'cb-progress', ctx: { then: 8, now: 11 } })
  expect(callbackFor([set(TODAY - 30, 'done', 8), set(TODAY - 2, 'done', 9)], 'Push-ups', TODAY)?.id).not.toBe('cb-progress')
  expect(callbackFor([set(TODAY - 10, 'done', 8), set(TODAY - 2, 'done', 12)], 'Push-ups', TODAY)?.id).not.toBe('cb-progress')
})

test('the same weekday, three weeks running counting today', () => {
  const fridays = [set(TODAY - 14), set(TODAY - 7)]
  expect(callbackFor(fridays, 'Push-ups', TODAY)).toMatchObject({ id: 'cb-weekday', ctx: { n: 3, weekday: 'Friday' } })
  expect(callbackFor([set(TODAY - 7)], 'Push-ups', TODAY)?.id).not.toBe('cb-weekday')
  // A week missed breaks the run.
  expect(callbackFor([set(TODAY - 21), set(TODAY - 7)], 'Push-ups', TODAY)?.id).not.toBe('cb-weekday')
})

test('back after a while; last time’s skip, no grudge; a fresh exercise says nothing', () => {
  expect(callbackFor([set(TODAY - 20)], 'Push-ups', TODAY)).toMatchObject({ id: 'cb-back', ctx: { n: 20 } })
  expect(callbackFor([set(TODAY - 3), set(TODAY - 2, 'skip')], 'Push-ups', TODAY)?.id).toBe('cb-skipped')
  // A skip earlier today is not "last time".
  expect(callbackFor([set(TODAY - 3), set(TODAY, 'skip')], 'Push-ups', TODAY)).toBeNull()
  expect(callbackFor([], 'Push-ups', TODAY)).toBeNull()
})

test('anniversaries of the first set: on the day or a few days late, never before or long after', () => {
  expect(anniversaryOf([set(TODAY - 30)], TODAY)).toBe(30)
  expect(anniversaryOf([set(TODAY - 33)], TODAY)).toBe(30)
  expect(anniversaryOf([set(TODAY - 34)], TODAY)).toBeNull()
  expect(anniversaryOf([set(TODAY - 365), set(TODAY - 30)], TODAY)).toBe(365)
  expect(anniversaryOf([set(TODAY - 30, 'skip')], TODAY)).toBeNull()
  expect(anniversaryOf([], TODAY)).toBeNull()
})

test('on the band: the 10th set of it', OPTIONS, async ($, on) => {
  const history = Array.from({ length: 8 }, (_, i) => set(TODAY - 40 + i * 3))
  world(on, TINY, { history, lastSeenOn: TODAY })
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  await $.command.run(workout('now'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await ui.find({ type: 'Text', text: line('cb-milestone', { day: TODAY, n: 10 }) })).toBeDefined()
  await ui.unmount()
})

test('the anniversary is the day’s hello, once', OPTIONS, async ($, on) => {
  const { w, clock } = world(on, TINY, { history: [set(TODAY - 30)], lastSeenOn: TODAY - 1 })
  await $.session.start(SESSION)
  expect(w.toasts).toContain(line('anniversary', { day: TODAY, n: 30 }))
  w.toasts.length = 0
  await clock.advance(24 * H)
  await $.session.start(SESSION)
  expect(w.toasts).not.toContain(line('anniversary', { day: TODAY + 1, n: 30 }))
})
