import { expect, test } from 'claude-code/testing'

import type { Plan } from '../types'
import { START } from '../hooks/plan'
import { cueAllowed, cueDelayMs, inQuietHours, isTrainingDay, nextTrainingDay, weekdayName, weekdayOf } from '../hooks/schedule'
import { BAND, NOON, OPTIONS, SESSION, TINY, TODAY, workout, world } from './world'

/** Schedule and cadence (plan D5 to D7, Task 3). */

/** Day 0 was Thursday 1970-01-01. */
const THURSDAY = 0

test('weekdays for all seven days', () => {
  const names = ['thu', 'fri', 'sat', 'sun', 'mon', 'tue', 'wed']
  for (let i = 0; i < 7; i += 1) expect(weekdayName(THURSDAY + i)).toBe(names[i])
  expect(weekdayOf(THURSDAY)).toBe(4)
  expect(weekdayName(TODAY)).toBe('fri')
  expect(weekdayName(-1)).toBe('wed')
})

const MWF: Plan = { ...TINY, schedule: { days: ['mon', 'wed', 'fri'] } }

test('days mode: a training day iff its weekday is listed', () => {
  expect(isTrainingDay(MWF, START, TODAY)).toBe(true)
  expect(isTrainingDay(MWF, START, TODAY + 1)).toBe(false)
  expect(isTrainingDay(MWF, START, TODAY + 3)).toBe(true)
  expect(nextTrainingDay(MWF, START, TODAY)).toBe(TODAY + 3)
})

test('every N days: N − 1 days after a workout is a rest day, N days after a training day', () => {
  const plan: Plan = { ...TINY, schedule: { everyNDays: 3 } }
  const done = { ...START, lastCompletedOn: TODAY }
  expect(isTrainingDay(plan, START, TODAY)).toBe(true)
  expect(isTrainingDay(plan, done, TODAY)).toBe(false)
  expect(isTrainingDay(plan, done, TODAY + 2)).toBe(false)
  expect(isTrainingDay(plan, done, TODAY + 3)).toBe(true)
  expect(nextTrainingDay(plan, done, TODAY)).toBe(TODAY + 3)
})

test('an extra day makes today a training day, but never after a workout today', () => {
  expect(isTrainingDay(MWF, { ...START, extraDay: TODAY + 1 }, TODAY + 1)).toBe(true)
  expect(isTrainingDay(MWF, { ...START, extraDay: TODAY, lastCompletedOn: TODAY }, TODAY)).toBe(false)
})

test('quiet hours that cross midnight', () => {
  expect(inQuietHours('22-07', 23)).toBe(true)
  expect(inQuietHours('22-07', 6)).toBe(true)
  expect(inQuietHours('22-07', 7)).toBe(false)
  expect(inQuietHours('22-07', 12)).toBe(false)
  expect(inQuietHours('22-07', 22)).toBe(true)
  expect(inQuietHours('off', 23)).toBe(false)
})

test('the delay for a turn is the turn wait or the rest of the gap, whichever is longer', () => {
  expect(cueDelayMs(30_000, undefined, NOON)).toBe(30_000)
  expect(cueDelayMs(30_000, NOON + 10 * 60_000, NOON)).toBe(10 * 60_000)
  expect(cueDelayMs(30_000, NOON - 1, NOON)).toBe(30_000)
})

test('cueAllowed: training day, sets left, not declined or done today, outside the gap', () => {
  const base = { plan: TINY, progress: START, today: TODAY, declinedOn: undefined, nextCueAt: undefined, now: NOON }
  const strict = { ignoreTrainingDay: false, ignoreGap: false }
  expect(cueAllowed(base, strict)).toBe(true)
  expect(cueAllowed({ ...base, declinedOn: TODAY }, strict)).toBe(false)
  expect(cueAllowed({ ...base, nextCueAt: NOON + 1 }, strict)).toBe(false)
  expect(cueAllowed({ ...base, nextCueAt: NOON + 1 }, { ignoreTrainingDay: false, ignoreGap: true })).toBe(true)
  expect(cueAllowed({ ...base, progress: { ...START, workout: 2 } }, strict)).toBe(false)
  expect(cueAllowed({ ...base, progress: { ...START, workout: 1, lastCompletedOn: TODAY } }, { ignoreTrainingDay: true, ignoreGap: true })).toBe(false)
})

test('the gap survives a reload', OPTIONS, async ($, on) => {
  const { clock } = world(on, TINY, { nextCueAt: NOON + 10 * 60_000 })
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await clock.advance(9 * 60_000)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await ui.find({ key: 'start' })).toBeUndefined()
  await clock.advance(60_000)
  expect(await ui.find({ key: 'start' })).toBeDefined()
  await ui.unmount()
})

test('the options change the wait and the gap', { options: { cueEvery: '30', cueAfter: '120' } }, async ($, on) => {
  const { clock } = world(on, TINY)
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await clock.advance(119_000)
  expect(await ui.find({ key: 'start' })).toBeUndefined()
  await clock.advance(1_000)
  expect(await ui.find({ key: 'start' })).toBeDefined()
  expect(JSON.stringify(await $.command.run(workout('later')))).toMatch(/30 minutes/)
  await clock.advance(29 * 60_000)
  expect(await ui.find({ key: 'start' })).toBeUndefined()
  await clock.advance(60_000)
  expect(await ui.find({ key: 'start' })).toBeDefined()
  await ui.unmount()
})

test('the defaults are a 15-minute gap and a 60 s wait', async ($, on) => {
  const { clock } = world(on, TINY)
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await clock.advance(59_000)
  expect(await ui.find({ key: 'start' })).toBeUndefined()
  await clock.advance(1_000)
  expect(await ui.find({ key: 'start' })).toBeDefined()
  expect(JSON.stringify(await $.command.run(workout('later')))).toMatch(/15 minutes/)
  await ui.unmount()
})

test('pause stops cues, survives a reload, and every reply says so', OPTIONS, async ($, on) => {
  const { clock } = world(on, TINY, { paused: true })
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await $.tool.call({ tool: 'Bash', command: 'npm test' })
  await clock.advance(60 * 60_000)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await ui.find({ key: 'start' })).toBeUndefined()
  expect(JSON.stringify(await $.command.run(workout('status')))).toMatch(/^\{"text":"Paused\. /)
  expect(JSON.stringify(await $.command.run(workout('pause')))).toMatch(/Already paused/)
  expect(JSON.stringify(await $.command.run(workout('resume')))).toMatch(/Resumed/)
  expect(JSON.stringify(await $.command.run(workout('status')))).not.toMatch(/Paused/)
  await $.turn.start({ text: 'go', turnId: 't2' })
  await clock.advance(30_000)
  expect(await ui.find({ key: 'start' })).toBeDefined()
  await ui.unmount()
})

test('a set the person asks for still shows while paused', OPTIONS, async ($, on) => {
  world(on, TINY)
  await $.session.start(SESSION)
  expect(JSON.stringify(await $.command.run(workout('pause')))).toMatch(/Paused\. No sets/)
  expect(JSON.stringify(await $.command.run(workout('now')))).toMatch(/Paused\. Up next: Push-ups/)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await ui.find({ key: 'done' })).toBeDefined()
  await ui.unmount()
})

test('quiet hours drop cues and toasts that come by themselves', { options: { cueEvery: '15', cueAfter: '30', quietHours: '22-07' } }, async ($, on) => {
  // 23:00 local time, a training day.
  const { clock, w } = world(on, TINY, {}, { now: new Date(2026, 9, 2, 23, 0).getTime() })
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await clock.advance(60_000)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await ui.find({ key: 'start' })).toBeUndefined()
  await ui.unmount()
  expect(w.toasts).toEqual([])
})

test('outside quiet hours the same turn cues', { options: { cueEvery: '15', cueAfter: '30', quietHours: '22-07' } }, async ($, on) => {
  const { clock } = world(on, TINY, {}, { now: new Date(2026, 9, 2, 12, 0).getTime() })
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await clock.advance(30_000)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await ui.find({ key: 'start' })).toBeDefined()
  await ui.unmount()
})
