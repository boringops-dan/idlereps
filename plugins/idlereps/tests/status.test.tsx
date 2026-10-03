import { expect, test } from 'claude-code/testing'

import type { Plan } from '../types'
import { line } from '../hooks/copy'
import { decodeFrame, encodeCells } from '../hooks/portrait'
import { bar, bestText } from '../hooks/status'
import { SPRITE } from '../hooks/swolomon-sprite'
import { parsePlan, PLAN_PROMPT, START } from '../hooks/plan'
import { generateProgram, STARTER_ANSWERS } from '../hooks/programs'
import { BAND, drawnRows, NOON, OPTIONS, PLAN_PATH, SESSION, STATUS, tallyOf, TINY, TODAY, workout, world } from './world'

/** `/workout plan` (Task 7) and status (Task 8). */

const ACKED = { seen: { safety: { at: NOON - 1, n: 1 } } }

test('/workout plan writes what the model answered, and replies with a summary', OPTIONS, async ($, on) => {
  const asked: { model: string; system?: string; maxTokens?: number }[] = []
  on('model.complete', ($, e) => {
    asked.push({ model: e.model, ...(e.system === undefined ? {} : { system: e.system }), ...(e.maxTokens === undefined ? {} : { maxTokens: e.maxTokens }) })
    return { value: { isAnswered: true, text: '```json\n{"name": "Squats", "schedule": {"days": ["mon"]}, "workouts": [{"name": "A", "exercises": [{"name": "Squats", "reps": "5 reps", "sets": 5}]}]}\n```', usage: { input_tokens: 1, output_tokens: 1, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 } } }
  })
  const { w } = world(on, TINY, ACKED)
  await $.session.start(SESSION)
  const said = JSON.stringify(await $.command.run(workout('plan 5x5 squats on Mondays')))
  expect(said).toMatch(/Plan ready: Squats\. 1 workout, Mon\. Written to /)
  expect(asked).toEqual([{ model: 'claude-haiku-4-5-20251001', system: PLAN_PROMPT, maxTokens: 4000 }])
  const written = w.writes.filter(x => x.path === PLAN_PATH).at(-1)
  expect(parsePlan(written?.text ?? '').name).toBe('Squats')
  expect(JSON.stringify(await $.command.run(workout('status')))).toMatch(/Workout 1 of 1 \(A\)/)
})

test('/workout plan with an answer that is not a plan changes nothing', OPTIONS, async ($, on) => {
  on('model.complete', () => ({ value: { isAnswered: true, text: '{"workouts": []}', usage: { input_tokens: 1, output_tokens: 1, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 } } }))
  const { w } = world(on, TINY, ACKED)
  await $.session.start(SESSION)
  expect(JSON.stringify(await $.command.run(workout('plan something odd')))).toMatch(/didn't turn into a plan \(\\"workouts\\" must be a non-empty list\)/)
  expect(w.writes).toEqual([])
})

test('/workout plan when the model cannot be reached changes nothing', OPTIONS, async ($, on) => {
  on('model.complete', () => ({ value: { isAnswered: false, reason: 'aborted', usage: { input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 } } }))
  const { w } = world(on, TINY, ACKED)
  await $.session.start(SESSION)
  expect(JSON.stringify(await $.command.run(workout('plan squats')))).toMatch(/Couldn't reach the model/)
  expect(w.writes).toEqual([])
  expect(JSON.stringify(await $.command.run(workout('plan')))).toMatch(/Describe your plan/)
})

// ---------------------------------------------------------------------------------------------------------

test('the status pane on a training day: Swolomon, the workout as a table, the buttons, then the rest', OPTIONS, async ($, on) => {
  world(on, generateProgram(STARTER_ANSWERS), {
    progress: { ...START, done: 1 },
    totalDoneSets: 112,
    lastByExercise: { Squats: { best: { any: 14 } } },
  })
  await $.session.start(SESSION)
  await $.command.run(workout(''))
  const pane = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...STATUS })
  expect(drawnRows(await pane.drawn())).toEqual([
    'Full body A  Week 1: 0 of 3 workouts  ○○○',
    line('pane-mid', { day: TODAY, n: 5 }),
    '1 of 6 sets today',
    '',
    '› Desk push-ups  ●●  10 reps',
    '  Squats         ○○  12 reps   best 14 reps',
    '  Wall angels    ○○  8 reps',
    '',
    '1: Start a set now   4: Change plan   0: Close',
    '',
    // The plan started today (no earlier log): the days before it are not missed training days.
    'Mon ·  Tue ·  Wed ·  Thu ·  Fri ○  Sat ·  Sun ·',
    'Streak 0 · 0 sets this week · 112 total',
    'Rank: Rack Regular  ━━━━━━━━━━  112/250 to Iron Disciple',
    'Bests  Squats 14 reps',
    '',
    'Beginner general fitness · 3x/week · 4 weeks',
    'Built for: no gear, no floor, standing and desk moves. Want floor work or gear? Change plan.',
    'Feedback: /workout feedback · Ideas and plans: github.com/boringops-dan/idlereps/discussions',
  ])
  // Room for the portrait beside the head: Swolomon is there, not flexing mid-workout.
  expect(((await pane.find({ key: 'swolomon' })) as { props: { rows: number } } | undefined)?.props.rows).toBe(8)
  expect(await pane.find({ key: 'today' })).toBeUndefined()
  await pane.unmount()
})

test('rest day, done day and the three Built for lines', OPTIONS, async ($, on) => {
  const sat: Plan = { ...TINY, schedule: { days: ['sat'] } }
  world(on, sat)
  await $.session.start(SESSION)
  await $.command.run(workout(''))
  const pane = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...STATUS })
  expect(await pane.find({ type: 'Text', text: 'Rest day · next workout Sat' })).toBeDefined()
  expect(await pane.find({ type: 'Text', text: 'Your own plan.' })).toBeDefined()
  expect(await pane.find({ key: 'today' })).toBeDefined()
  await pane.press({ key: 'today' })
  expect(JSON.stringify(await $.command.run(workout('status')))).toMatch(/training day/)
  await $.command.run(workout('done'))
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  await $.command.run(workout(''))
  expect(await pane.find({ type: 'Text', text: 'Today\'s workout is done · next Sat' })).toBeDefined()
  await pane.unmount()
})

test('Built for names what the plan was built for', OPTIONS, async ($, on) => {
  world(on, generateProgram({ ...STARTER_ANSWERS, equipment: { dumbbells: true, bar: false, bands: true } }))
  await $.session.start(SESSION)
  await $.command.run(workout(''))
  const pane = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...STATUS })
  expect(await pane.find({ type: 'Text', text: 'Built for: dumbbells, resistance bands.' })).toBeDefined()
  await pane.unmount()
})

test('the pane follows each record while it is open', OPTIONS, async ($, on) => {
  world(on, TINY)
  await $.session.start(SESSION)
  await $.command.run(workout(''))
  const pane = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...STATUS })
  expect(await pane.find({ type: 'Text', text: /0 of 2 sets today/ })).toBeDefined()
  await $.command.run(workout('start'))
  await $.command.run(workout('done 8'))
  expect(await pane.find({ type: 'Text', text: /1 of 2 sets today/ })).toBeDefined()
  expect(await pane.find({ type: 'Text', text: 'Last set: Push-ups 8/10' })).toBeDefined()
  await pane.unmount()
})

test('the footer tally: sets today, then done', OPTIONS, async ($, on) => {
  world(on, TINY)
  await $.session.start(SESSION)
  expect(await tallyOf($)).toBe('💪 0/2')
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  expect(await tallyOf($)).toBe('💪 1/2')
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  expect(await tallyOf($)).toBe('💪 done')
})

test('no footer tally when it is turned off, and no pinned status line ever (it carries a warning mark)', { options: { statusLine: false } }, async ($, on) => {
  const statuses: (string | undefined)[] = []
  on('ui.status', ($, e) => {
    statuses.push(e.text)
    return { value: undefined }
  })
  world(on, TINY)
  await $.session.start(SESSION)
  expect(await tallyOf($)).toBeUndefined()
  expect(statuses).toEqual([])
})

test('the footer tally moves on at midnight, and says nothing on a rest day', OPTIONS, async ($, on) => {
  const { clock } = world(on, TINY, { progress: { ...START, workout: 1, lastCompletedOn: TODAY } })
  await $.session.start(SESSION)
  expect(await tallyOf($)).toBe('💪 done')
  await clock.advance(86_400_000)
  expect(await tallyOf($)).toBeUndefined()
  await clock.advance(86_400_000)
  expect(await tallyOf($)).toBe('💪 0/1')
})

test('/workout status is one line with the same facts', OPTIONS, async ($, on) => {
  world(on, TINY)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  await $.command.run(workout('done 9'))
  const said = (await $.command.run(workout('status'))).text ?? ''
  expect(said).toBe('IdleReps 1.0.0 · Workout 1 of 2 (A), set 2 of 2 · training day · Last set: Push-ups 9/10 · streak 0 · rank=New Face')
  expect(said.includes('\n')).toBe(false)
})

test('/workout with no plan says how to make one', OPTIONS, async ($, on) => {
  const { w } = world(on, null)
  await $.session.start(SESSION)
  expect(JSON.stringify(await $.command.run(workout('')))).toMatch(/No plan yet\. Run \/workout setup/)
  expect(w.opened).toEqual([])
})

test('the day toast: once a day, on a training day, in Swolomon’s voice', OPTIONS, async ($, on) => {
  const { w } = world(on, TINY, { schemaVersion: 1, seen: { 'whats-new:1.0.0': { at: 1, n: 1 } } })
  await $.session.start(SESSION)
  expect(w.toasts.length).toBe(1)
  expect(w.toasts[0]).toMatch(/A/)
  await $.session.start(SESSION)
  expect(w.toasts.length).toBe(1)
})

const SEEN_NEWS = { schemaVersion: 1, seen: { 'whats-new:1.0.0': { at: 1, n: 1 } } }

test('no day toast on a rest day', OPTIONS, async ($, on) => {
  const { w } = world(on, { ...TINY, schedule: { days: ['sat'] } }, SEEN_NEWS)
  await $.session.start(SESSION)
  expect(w.toasts).toEqual([])
})

test('no day toast after Not today', OPTIONS, async ($, on) => {
  const { w } = world(on, TINY, { ...SEEN_NEWS, declinedOn: TODAY })
  await $.session.start(SESSION)
  expect(w.toasts).toEqual([])
})

test('no day toast while paused', OPTIONS, async ($, on) => {
  const { w } = world(on, TINY, { ...SEEN_NEWS, paused: true })
  await $.session.start(SESSION)
  expect(w.toasts).toEqual([])
})

test('the idle reminder: once per interval while idle on a training day', OPTIONS, async ($, on) => {
  const { clock, w } = world(on, TINY, { schemaVersion: 1, seen: { 'whats-new:1.0.0': { at: 1, n: 1 }, 'day-toast': { at: NOON, n: 1 } } })
  await $.session.start(SESSION)
  await clock.advance(59 * 60_000)
  expect(w.toasts).toEqual([])
  await clock.advance(60_000)
  expect(w.toasts).toEqual([line('idle-reminder', { day: TODAY, workout: 'A', n: 2 })])
  await clock.advance(60 * 60_000)
  expect(w.toasts.length).toBe(2)
})

test('no idle reminder while a turn runs, when it is off, or on a rest day', { options: { idleReminder: 'off' } }, async ($, on) => {
  const { clock, w } = world(on, TINY, { schemaVersion: 1, seen: { 'whats-new:1.0.0': { at: 1, n: 1 }, 'day-toast': { at: NOON, n: 1 } } })
  await $.session.start(SESSION)
  await clock.advance(3 * 60 * 60_000)
  expect(w.toasts).toEqual([])
})

test('a running turn holds the idle reminder off', OPTIONS, async ($, on) => {
  const { clock, w } = world(on, TINY, { schemaVersion: 1, seen: { 'whats-new:1.0.0': { at: 1, n: 1 }, 'day-toast': { at: NOON, n: 1 } } })
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await $.command.run(workout('no'))
  w.toasts.length = 0
  await clock.advance(3 * 60 * 60_000)
  expect(w.toasts).toEqual([])
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await ui.find({ key: 'start' })).toBeUndefined()
  await ui.unmount()
})

// ---------------------------------------------------------------------------------------------------------
// The Workout pane's pieces.

test('a bar: the full part bright, the rest dim, never past its width', () => {
  expect(bar(0, 4)).toEqual([{ text: '━━━━', tone: 'muted' }])
  expect(bar(1, 4)).toEqual([{ text: '━', tone: 'accent' }, { text: '━━━', tone: 'muted' }])
  expect(bar(4, 4)).toEqual([{ text: '━━━━', tone: 'accent' }])
  expect(bar(9, 4)).toEqual([{ text: '━━━━', tone: 'accent' }])
  expect(bar(-2, 4)).toEqual([{ text: '━━━━', tone: 'muted' }])
})

test('a best: the count in the exercise’s own unit; weighted, at the heaviest load; none on record, none shown', () => {
  const plank = { name: 'Plank', reps: '20 s', sets: 2 }
  const goblet = { name: 'Goblet squats', reps: '10 reps', sets: 2, weight: { start: 8, step: 2, unit: 'kg' as const } }
  expect(bestText(plank, {})).toBeNull()
  expect(bestText(plank, { Plank: { best: { any: 45 } } })).toBe('45 s')
  expect(bestText(goblet, { 'Goblet squats': { best: { '8': 15, '12': 9 } } })).toBe('9 reps @ 12 kg')
  expect(bestText(goblet, { 'Goblet squats': { best: {} } })).toBeNull()
})

test('the pane on a done day: Swolomon flexes, and the next workout shows with nothing marked', OPTIONS, async ($, on) => {
  world(on, TINY, { progress: { ...START, workout: 1, lastCompletedOn: TODAY } })
  await $.session.start(SESSION)
  await $.command.run(workout(''))
  const pane = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...STATUS })
  const rows = drawnRows(await pane.drawn())
  expect(rows).toContain(line('pane-done', { day: TODAY, nextDay: 'Sun', workout: 'B' }))
  expect(rows).toContain('  Squats  ○  20 reps')
  expect(rows.some(row => row.startsWith('›'))).toBe(false)
  const portrait = (await pane.find({ key: 'swolomon' })) as { props: { cells: string } } | undefined
  expect(portrait?.props.cells).toBe(encodeCells(decodeFrame(SPRITE, 'flex')))
  await pane.unmount()
})

test('the pane on a rest day and while paused: Swolomon says so, and the portrait rests', OPTIONS, async ($, on) => {
  const sat: Plan = { ...TINY, schedule: { days: ['sat'] } }
  world(on, sat, { paused: true })
  await $.session.start(SESSION)
  await $.command.run(workout(''))
  const pane = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...STATUS })
  const rows = drawnRows(await pane.drawn())
  expect(rows[0]).toBe('Paused. /workout resume to start again.')
  expect(rows).toContain(line('pane-paused', { day: TODAY }))
  const portrait = (await pane.find({ key: 'swolomon' })) as { props: { cells: string } } | undefined
  expect(portrait?.props.cells).toBe(encodeCells(decodeFrame(SPRITE, 'idle')))
  await $.command.run(workout('resume'))
  expect(await pane.find({ type: 'Text', text: line('pane-rest', { day: TODAY }) })).toBeDefined()
  await pane.unmount()
})

test('a narrow pane: no portrait, Swolomon by name', OPTIONS, async ($, on) => {
  world(on, generateProgram(STARTER_ANSWERS))
  await $.session.start(SESSION)
  await $.command.run(workout(''))
  const pane = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...STATUS, props: { ...STATUS.props, bodyColumns: 50 } })
  expect(await pane.find({ key: 'swolomon' })).toBeUndefined()
  expect(drawnRows(await pane.drawn())[1]).toBe(`Swolomon: ${line('pane-fresh', { day: TODAY, n: 6, workout: 'Full body A' })}`)
  await pane.unmount()
})
