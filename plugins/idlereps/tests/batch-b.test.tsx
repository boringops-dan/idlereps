import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import type { Plan } from '../types'
import { ratingBand } from '../hooks/bands'
import { line } from '../hooks/copy'
import { START, weekProgress } from '../hooks/plan'
import { DESK_STRETCHES, stretchFor } from '../hooks/programs'
import { outcomeOf, turnOutcome } from '../hooks/signals'
import { BAND, drawnRows, OPTIONS, SESSION, STATUS, TINY, TODAY, workout, world } from './world'

/** Swolomon notices the agent's results, the rest-day stretch, Quick start's question, the week's finish line. */

const DAY_MS = 86_400_000
const bash = (command: string) => ({ tool: 'Bash', command, description: 'run' }) as never
const done = { turnId: 't1', answer: '', reason: 'answer', durationMs: 183_000, isAborted: false } as never

// ---------------------------------------------------------------------------------------------------------
// What the agent got done.

test('outcomes: test commands pass or fail by the result; a commit or a PR by the engine’s git reading', () => {
  const facts = (command: string) => ({ tool: 'Bash', command })
  expect(outcomeOf(facts('npm test'), { isError: false })).toBe('tests-pass')
  expect(outcomeOf(facts('cd app && pytest -q'), { isError: true })).toBe('tests-fail')
  expect(outcomeOf(facts('claude plugin test plugins/x'), { isError: false })).toBe('tests-pass')
  expect(outcomeOf(facts('git commit -m x'), { isError: false, commit: true })).toBe('commit')
  expect(outcomeOf(facts('gh pr create'), { isError: false, pr: true })).toBe('pr')
  expect(outcomeOf(facts('ls -la'), { isError: true })).toBeNull()
  expect(outcomeOf({ tool: 'Read' }, { isError: false })).toBeNull()
})

test('the turn’s outcome: a PR outranks a commit outranks tests; the latest test run counts', () => {
  expect(turnOutcome(undefined, 'tests-fail')).toBe('tests-fail')
  expect(turnOutcome('tests-fail', 'tests-pass')).toBe('tests-pass')
  expect(turnOutcome('commit', 'tests-fail')).toBe('commit')
  expect(turnOutcome('commit', 'pr')).toBe('pr')
  expect(turnOutcome('pr', 'commit')).toBe('pr')
})

async function turnEnd($: Engine) {
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', component: 'TurnDuration', props: { word: 'Baked', durationMs: 183_000 } })
  const rows = drawnRows(await ui.drawn())
  await ui.unmount()
  return rows
}

test('trained through a green test run: the turn ends with Swolomon noticing both', OPTIONS, async ($, on) => {
  world(on, TINY)
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  await $.tool.call(bash('npm test'))
  await $.turn.complete(done)
  const rows = await turnEnd($)
  expect(rows[0]).toBe(`Baked for 183s · ${line('turn-sets', { day: TODAY, sets: '1 set' })} 💪`)
  expect(rows[1]).toBe(`Swolomon: ${line('react-tests-pass', { day: TODAY })}`)
})

test('a test run the person denied ran nothing: no reaction', OPTIONS, async ($, on) => {
  on('tool.call', { tool: 'Bash' }, () => ({ deny: 'not now' }))
  world(on, TINY)
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  await $.tool.call(bash('npm test'))
  await $.turn.complete(done)
  expect((await turnEnd($)).some(row => row.startsWith('Swolomon'))).toBe(false)
})

test('a commit outranks the tests run after it', OPTIONS, async ($, on) => {
  on('tool.call', { tool: 'Bash' }, ($, e) => {
    const command = String((e as unknown as { command: string }).command)
    const gitOperation = command.startsWith('git commit') ? { commit: { sha: 'abc', kind: 'committed' } } : undefined
    return { result: { stdout: '', stderr: '', interrupted: false, ...(gitOperation === undefined ? {} : { gitOperation }) } } as never
  })
  world(on, TINY)
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  await $.tool.call(bash('git commit -m "x"'))
  await $.tool.call(bash('npm test'))
  await $.turn.complete(done)
  expect((await turnEnd($))[1]).toBe(`Swolomon: ${line('react-commit', { day: TODAY })}`)
})

test('no sets this turn: no reaction, however the tests went (Swolomon never comments on work alone)', OPTIONS, async ($, on) => {
  world(on, TINY)
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await $.tool.call(bash('npm test'))
  await $.turn.complete(done)
  expect(await turnEnd($)).toEqual(['Baked for 183s'])
})

test('the outcome is the turn’s own: the next turn starts with none', OPTIONS, async ($, on) => {
  world(on, TINY)
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't0' })
  await $.tool.call(bash('npm test'))
  await $.turn.complete({ ...(done as object), turnId: 't0', durationMs: 5_000 } as never)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  await $.turn.complete(done)
  expect((await turnEnd($)).some(row => row.startsWith('Swolomon'))).toBe(false)
})

// ---------------------------------------------------------------------------------------------------------
// The rest-day stretch.

/** Trains Mondays only: today (a Friday) is a rest day. */
const MONDAYS: Plan = { ...TINY, schedule: { days: ['mon'] } }

test('a rest day’s long turn offers one desk stretch, the day choosing which', OPTIONS, async ($, on) => {
  const { clock } = world(on, MONDAYS)
  await $.session.start(SESSION)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await $.turn.start({ text: 'go', turnId: 't1' })
  await clock.advance(30_000)
  const stretch = stretchFor(TODAY)
  expect(await ui.find({ type: 'Text', text: line('stretch-ask', { day: TODAY }) })).toBeDefined()
  expect(drawnRows(await ui.drawn())).toContain(`${stretch.name}: 30 s`)
  expect(drawnRows(await ui.drawn()).at(-1)).toBe('1: Done   2: Not now')
  await ui.unmount()
})

test('Done: the stretch counts as time moved, with a toast; once a day', OPTIONS, async ($, on) => {
  const { clock, w } = world(on, MONDAYS)
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await clock.advance(30_000)
  await $.command.run(workout('stretched'))
  expect(w.toasts).toContain(line('stretched', { day: TODAY, exercise: stretchFor(TODAY).name }))
  await $.command.run(workout(''))
  const pane = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...STATUS })
  expect(drawnRows(await pane.drawn()).some(row => row.startsWith('Moved 1 min this week'))).toBe(true)
  await pane.unmount()
  await $.turn.complete(done)
  await $.turn.start({ text: 'again', turnId: 't2' })
  await clock.advance(60_000)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await ui.find({ key: 'stretched' })).toBeUndefined()
  await ui.unmount()
})

test('Not now puts it away for the day; the next rest day offers the next stretch', OPTIONS, async ($, on) => {
  const { clock } = world(on, MONDAYS)
  await $.session.start(SESSION)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await $.turn.start({ text: 'go', turnId: 't1' })
  await clock.advance(30_000)
  await ui.press({ key: 'notnow' })
  expect(await ui.find({ key: 'stretched' })).toBeUndefined()
  await $.turn.complete(done)
  await clock.advance(DAY_MS)
  await $.turn.start({ text: 'go', turnId: 't2' })
  await clock.advance(30_000)
  expect(drawnRows(await ui.drawn())).toContain(`${stretchFor(TODAY + 1).name}: 30 s`)
  expect(stretchFor(TODAY + 1).name).not.toBe(stretchFor(TODAY).name)
  await ui.unmount()
})

test('no stretch on a training day, the day a workout was done, or after Not today', OPTIONS, async ($, on) => {
  const { clock } = world(on, TINY, { progress: { ...START, workout: 1, lastCompletedOn: TODAY } })
  await $.session.start(SESSION)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await $.turn.start({ text: 'go', turnId: 't1' })
  await clock.advance(60_000)
  expect(await ui.find({ key: 'stretched' })).toBeUndefined()
  await ui.unmount()
})

test('a stretch for every day of the week, each with its note, all desk-safe in name', () => {
  expect(new Set(Array.from({ length: 7 }, (_, i) => stretchFor(TODAY + i).name)).size).toBe(DESK_STRETCHES.length)
  for (const s of DESK_STRETCHES) expect([s.name, s.note.length > 0, s.seconds]).toEqual([s.name, true, 30])
  expect(stretchFor(-3)).toBeDefined()
})

// ---------------------------------------------------------------------------------------------------------
// Quick start's one question.

test('/workout desk or home with nothing asking says nothing is showing', OPTIONS, async ($, on) => {
  world(on, TINY)
  await $.session.start(SESSION)
  expect((await $.command.run(workout('desk'))).text).toBe(line('reply-nothing-showing', { day: TODAY, id: 'desk' }))
})

// ---------------------------------------------------------------------------------------------------------
// The week's finish line.

const WEEKS: Plan = {
  ...TINY,
  schedule: { everyNDays: 1 },
  workouts: [
    { name: 'Week 1 · A', exercises: [{ name: 'Push-ups', reps: '10 reps', sets: 1 }] },
    { name: 'Week 1 · B', exercises: [{ name: 'Squats', reps: '10 reps', sets: 1 }] },
    { name: 'Week 2 · A', exercises: [{ name: 'Push-ups', reps: '11 reps', sets: 1 }] },
  ],
}

test('where the week stands; a plan without weeks has none', () => {
  expect(weekProgress(WEEKS, 0, 0)).toEqual({ week: 1, done: 0, total: 2 })
  expect(weekProgress(WEEKS, 1, 0)).toEqual({ week: 1, done: 1, total: 2 })
  expect(weekProgress(WEEKS, 2, 1)).toEqual({ week: 1, done: 2, total: 2 })
  expect(weekProgress(WEEKS, 2, 2)).toEqual({ week: 2, done: 0, total: 1 })
  expect(weekProgress(TINY, 0, 0)).toBeNull()
})

test('mid-week, the rating band carries the finish line: 3 rows', OPTIONS, async ($, on) => {
  world(on, WEEKS)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  const rows = drawnRows(await ui.drawn())
  expect(rows).toContain('Week 1: 1 of 2 workouts  ●○')
  expect(rows.length).toBe(3)
  expect(await ui.find({ type: 'Text', text: line('workout-done', { day: TODAY, workout: 'A' }) })).toBeDefined()
  await ui.unmount()
})

test('the week’s last workout: the finish line crossed, week one loudest, Swolomon flexing', OPTIONS, async ($, on) => {
  world(on, WEEKS, { progress: { ...START, workout: 1 } })
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await ui.find({ type: 'Text', text: line('week-one-done', { day: TODAY }) })).toBeDefined()
  expect(drawnRows(await ui.drawn())).toContain('Week 1: 2 of 2 workouts  ●●')
  expect(await ui.find({ key: 'good' })).toBeDefined()
  await ui.unmount()
  const later = ratingBand('Week 2 · A', TODAY, { workout: 2, targetsBefore: {}, results: {} }, 1, [], { week: 2, done: 1, total: 1 })
  expect([later.coach, later.isWin, later.tall]).toEqual([[line('week-done', { day: TODAY, n: 2 })], true, true])
})

test('the pane shows the week’s finish line in place of the program bar', OPTIONS, async ($, on) => {
  world(on, WEEKS, { progress: { ...START, workout: 1 } })
  await $.session.start(SESSION)
  await $.command.run(workout(''))
  const pane = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...STATUS })
  expect(drawnRows(await pane.drawn())[0]).toBe('B  Week 1: 1 of 2 workouts  ●○')
  await pane.unmount()
})
