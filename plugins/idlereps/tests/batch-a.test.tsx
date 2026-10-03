import { expect, test } from 'claude-code/testing'

import type { HistoryEntry, Plan } from '../types'
import { line } from '../hooks/copy'
import { clockText } from '../hooks/bands'
import { movedSeconds, sparkline, trendOf } from '../hooks/history'
import { minutesWords, START } from '../hooks/plan'
import { moveWeekday, rescheduleOffer } from '../hooks/schedule'
import { BAND, drawnRows, NOON, OPTIONS, PLAN_PATH, SESSION, STATUS, TINY, TODAY, workout, world } from './world'

/** Time moved, trends, adapting instead of nagging, and the hold timer (§1.12 item 1). */

const DAY_MS = 86_400_000
const set = (exercise: string, d: number, count: number, target = '10 reps', weight?: number): HistoryEntry => ({
  kind: 'set', t: NOON, d, w: 0, exercise, set: 1, target, result: 'done', count, ...(weight === undefined ? {} : { weight }),
})

// ---------------------------------------------------------------------------------------------------------
// Time moved.

test('time moved: reps at 3 s, holds as held, each side twice, 10 s to set up; skips count nothing; stretches count', () => {
  const skip: HistoryEntry = { kind: 'set', t: NOON, d: TODAY, w: 0, exercise: 'Squats', set: 1, target: '10 reps', result: 'skip' }
  const stretch: HistoryEntry = { kind: 'stretch', t: NOON, d: TODAY, exercise: 'Hamstring stretch', seconds: 60 }
  expect(movedSeconds([set('Squats', TODAY, 10)])).toBe(40)
  expect(movedSeconds([set('Plank', TODAY, 30, '30 s')])).toBe(40)
  expect(movedSeconds([set('Lunges', TODAY, 8, '8 each leg')])).toBe(58)
  expect(movedSeconds([skip, stretch])).toBe(60)
  expect(movedSeconds([set('Squats', TODAY - 8, 10), set('Squats', TODAY, 10)], TODAY - 3, TODAY)).toBe(40)
})

test('minutes as people say them', () => {
  expect([minutesWords(40), minutesWords(600), minutesWords(3600), minutesWords(4320)]).toEqual(['1 min', '10 min', '1 h', '1 h 12 min'])
})

test('the pane leads its lower half with time moved: this week and since day 1', OPTIONS, async ($, on) => {
  // Friday: Monday this week and a set last week.
  world(on, TINY, { history: [set('Push-ups', TODAY - 4, 10), set('Push-ups', TODAY - 9, 10)] })
  await $.session.start(SESSION)
  await $.command.run(workout(''))
  const pane = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...STATUS })
  expect(drawnRows(await pane.drawn())).toContain('Moved 1 min this week while your agent worked · 1 min since day 1')
  await pane.unmount()
})

test('no time-moved row before the first set', OPTIONS, async ($, on) => {
  world(on, TINY)
  await $.session.start(SESSION)
  await $.command.run(workout(''))
  const pane = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...STATUS })
  expect(drawnRows(await pane.drawn()).some(row => row.startsWith('Moved'))).toBe(false)
  await pane.unmount()
})

// ---------------------------------------------------------------------------------------------------------
// Trends.

test('a trend: one point a day, the best that day, weight before reps, the last 8 days', () => {
  const history = [set('Squats', 1, 10), set('Squats', 1, 12), set('Squats', 3, 14), set('Plank', 3, 40, '40 s'), set('Goblet', 4, 10, '10 reps', 8), set('Goblet', 5, 8, '10 reps', 10)]
  expect(trendOf(history, 'Squats')).toEqual([12, 14])
  expect(trendOf(history, 'Goblet')).toEqual([8, 10])
  expect(trendOf(Array.from({ length: 12 }, (_, i) => set('Squats', i, 10 + i)), 'Squats')).toEqual([14, 15, 16, 17, 18, 19, 20, 21])
})

test('a sparkline, lowest to highest; a flat one sits in the middle', () => {
  expect(sparkline([10, 12, 14, 16])).toBe('▁▃▆█')
  expect(sparkline([5, 5, 5])).toBe('▄▄▄')
})

test('the pane draws an exercise’s sparkline once it has three days', OPTIONS, async ($, on) => {
  world(on, TINY, { history: [set('Push-ups', TODAY - 6, 10), set('Push-ups', TODAY - 4, 11), set('Push-ups', TODAY - 2, 13)] })
  await $.session.start(SESSION)
  await $.command.run(workout(''))
  const pane = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...STATUS })
  expect(drawnRows(await pane.drawn())).toContain('› Push-ups  ●○  10 reps  ▁▃█')
  await pane.unmount()
})

// ---------------------------------------------------------------------------------------------------------
// Adapting instead of nagging.

test('three Laters in a row: a busy day, the gap doubles for the rest of it, and Swolomon says so once', OPTIONS, async ($, on) => {
  const { w } = world(on, TINY)
  await $.session.start(SESSION)
  for (let i = 0; i < 2; i += 1) expect((await $.command.run(workout('later'))).text).toBe(line('reply-hidden', { day: TODAY, n: 15 }))
  expect((await $.command.run(workout('later'))).text).toBe(line('reply-hidden', { day: TODAY, n: 30 }))
  expect(w.toasts).toContain(line('busy-day', { day: TODAY, n: 30 }))
  await $.command.run(workout('later'))
  await $.command.run(workout('later'))
  await $.command.run(workout('later'))
  expect(w.toasts.filter(t => t === line('busy-day', { day: TODAY, n: 30 })).length).toBe(1)
})

test('a Start breaks the run of Laters', OPTIONS, async ($, on) => {
  const { w } = world(on, TINY)
  await $.session.start(SESSION)
  await $.command.run(workout('later'))
  await $.command.run(workout('later'))
  await $.command.run(workout('start'))
  await $.command.run(workout('later'))
  expect(w.toasts.some(t => t.startsWith('Busy day'))).toBe(false)
  expect((await $.command.run(workout('later'))).text).toBe(line('reply-hidden', { day: TODAY, n: 15 }))
})

test('the busy day ends at midnight: the next day’s gap is the setting again', OPTIONS, async ($, on) => {
  const { clock } = world(on, TINY)
  await $.session.start(SESSION)
  for (let i = 0; i < 3; i += 1) await $.command.run(workout('later'))
  await clock.advance(DAY_MS)
  expect((await $.command.run(workout('later'))).text).toBe(line('reply-hidden', { day: TODAY + 1, n: 15 }))
})

const FRIDAYS: Plan = { ...TINY, schedule: { days: ['mon', 'wed', 'fri'] } }

test('reschedule: only a days plan, only the same weekday three weeks running, to the next free weekday', () => {
  expect(rescheduleOffer(FRIDAYS, [TODAY, TODAY - 7, TODAY - 14], TODAY)).toEqual({ from: 'fri', to: 'sat' })
  expect(rescheduleOffer(FRIDAYS, [TODAY, TODAY - 7], TODAY)).toBeNull()
  expect(rescheduleOffer(FRIDAYS, [TODAY, TODAY - 7, TODAY - 21], TODAY)).toBeNull()
  expect(rescheduleOffer(TINY, [TODAY, TODAY - 7, TODAY - 14], TODAY)).toBeNull()
  expect(rescheduleOffer({ ...TINY, schedule: { days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] } }, [TODAY, TODAY - 7, TODAY - 14], TODAY)).toBeNull()
  expect(moveWeekday(['mon', 'wed', 'fri'], 'mon', 'sun')).toEqual(['wed', 'fri', 'sun'])
})

test('a third Friday of Not today: Swolomon offers to move Fridays; Move it rewrites only the schedule', OPTIONS, async ($, on) => {
  const { w } = world(on, FRIDAYS, { declines: [TODAY - 14, TODAY - 7], progress: { ...START, workout: 1 } })
  await $.session.start(SESSION)
  await $.command.run(workout('no'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await ui.find({ type: 'Text', text: line('reschedule-ask', { day: TODAY, from: 'Friday' }) })).toBeDefined()
  expect(await ui.find({ key: 'move' })).toBeDefined()
  expect(drawnRows(await ui.drawn()).at(-1)).toBe('1: Move to Sat   2: Keep Fri')
  await ui.press({ key: 'move' })
  const written = JSON.parse(w.writes.filter(x => x.path === PLAN_PATH).at(-1)?.text ?? '{}') as Plan
  expect(written.schedule).toEqual({ days: ['mon', 'wed', 'sat'] })
  expect(written.workouts).toEqual(FRIDAYS.workouts)
  expect(w.toasts).toContain(line('rescheduled', { day: TODAY, from: 'Friday', to: 'Saturday' }))
  expect(JSON.stringify(await $.command.run(workout('status')))).toMatch(/Workout 2 of 2/)
  await ui.unmount()
})

test('Keep it: asked about that weekday again only after four weeks', OPTIONS, async ($, on) => {
  const { clock, w } = world(on, FRIDAYS, { declines: [TODAY - 14, TODAY - 7] })
  await $.session.start(SESSION)
  await $.command.run(workout('no'))
  await $.command.run(workout('keep'))
  expect(w.writes.filter(x => x.path === PLAN_PATH)).toEqual([])
  await clock.advance(7 * DAY_MS)
  await $.command.run(workout('no'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await ui.find({ key: 'move' })).toBeUndefined()
  await ui.unmount()
})

// ---------------------------------------------------------------------------------------------------------
// The hold timer.

const HOLDS: Plan = {
  ...TINY,
  workouts: [
    {
      name: 'H',
      exercises: [
        { name: 'Plank', reps: '40 s', sets: 2 },
        { name: 'Side plank', reps: '20 s each side', sets: 1 },
      ],
    },
  ],
}

function audioLog(on: Parameters<typeof world>[0]) {
  const played: string[] = []
  on('audio.play', ($, e) => {
    if (e.clip.asset !== undefined) played.push(e.clip.asset)
    return { value: undefined }
  })
  return played
}

test('Timer shows on timed sets only', OPTIONS, async ($, on) => {
  world(on, TINY)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await ui.find({ key: 'timer' })).toBeUndefined()
  await ui.unmount()
})

test('the countdown at 40, 23 and 0 s; Swolomon counts the last three; one beep at zero', OPTIONS, async ($, on) => {
  const { clock } = world(on, HOLDS)
  const played = audioLog(on)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await ui.press({ key: 'timer' })
  const body = async () => drawnRows(await ui.drawn()).find(row => row.startsWith('Plank: ')) ?? ''
  expect(await body()).toMatch(/^Plank: 0:40 left {3}━{20}$/)
  await clock.advance(17_000)
  expect(await body()).toMatch(/^Plank: 0:23 left/)
  await clock.advance(21_000)
  expect(drawnRows(await ui.drawn())).toContain('2…')
  await clock.advance(2_000)
  expect(await body()).toBe('Plank: Time!')
  expect(await ui.find({ key: 'edit' })).toBeDefined()
  expect(played).toEqual(['assets/time.wav'])
  await clock.advance(10_000)
  expect(played.length).toBe(1)
  await ui.unmount()
})

test('Done after the hold logs its full time; Done mid-hold logs the seconds held', OPTIONS, async ($, on) => {
  const { clock } = world(on, HOLDS)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await ui.press({ key: 'timer' })
  await clock.advance(25_000)
  await ui.press({ key: 'done' })
  expect(await ui.find({ type: 'Text', text: /Logged Plank 25 s/ })).toBeDefined()
  await $.command.run(workout('now'))
  await ui.press({ key: 'timer' })
  await clock.advance(41_000)
  await ui.press({ key: 'done' })
  expect(drawnRows(await ui.drawn()).some(row => row.startsWith('✓ Logged Plank 40 s'))).toBe(true)
  await ui.unmount()
})

test('each side: side 1, Side 1 done, then side 2 and Time!', OPTIONS, async ($, on) => {
  const { clock } = world(on, HOLDS, { progress: { ...START, done: 2 } })
  const played = audioLog(on)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await ui.press({ key: 'timer' })
  expect(drawnRows(await ui.drawn()).some(row => row.startsWith('Side plank (side 1): 0:20 left'))).toBe(true)
  await clock.advance(20_000)
  expect(drawnRows(await ui.drawn())).toContain('Side plank (side 1): Side 1 done.')
  expect(played).toEqual(['assets/time.wav'])
  await ui.press({ key: 'side2' })
  await clock.advance(20_000)
  expect(drawnRows(await ui.drawn())).toContain('Side plank (side 2): Time!')
  expect(played.length).toBe(2)
  await ui.unmount()
})

test('Stop timer records nothing and brings the set back', OPTIONS, async ($, on) => {
  const { clock } = world(on, HOLDS)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await ui.press({ key: 'timer' })
  await clock.advance(5_000)
  await ui.press({ key: 'stop' })
  expect(await ui.find({ key: 'timer' })).toBeDefined()
  expect(JSON.stringify(await $.command.run(workout('status')))).toMatch(/set 1 of 3/)
  await ui.unmount()
})

test('Later during a countdown cancels it: no beep, nothing drawn after', OPTIONS, async ($, on) => {
  const { clock } = world(on, HOLDS)
  const played = audioLog(on)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await ui.press({ key: 'timer' })
  await $.command.run(workout('later'))
  await clock.advance(60_000)
  expect(played).toEqual([])
  expect(await ui.find({ key: 'stop' })).toBeUndefined()
  await ui.unmount()
})

test('the beep turned off: the hold still ends, silently', { options: { ...OPTIONS.options, timerBeep: false } }, async ($, on) => {
  const { clock } = world(on, HOLDS)
  const played = audioLog(on)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await ui.press({ key: 'timer' })
  await clock.advance(40_000)
  expect(await ui.find({ key: 'edit' })).toBeDefined()
  expect(played).toEqual([])
  await ui.unmount()
})

test('clock text', () => {
  expect([clockText(0), clockText(9), clockText(40), clockText(65)]).toEqual(['0:00', '0:09', '0:40', '1:05'])
})
