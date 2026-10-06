import { expect, test } from 'claude-code/testing'

import type { HistoryEntry, Plan } from '../types'
import { line } from '../hooks/copy'
import { setSeconds, timeWords } from '../hooks/plan'
import { decodeFrame, svgOf } from '../hooks/portrait'
import { raisedTargets } from '../hooks/record'
import { factsOf, toolSign, waitWords } from '../hooks/signals'
import { gainsOf } from '../hooks/status'
import { SPRITE } from '../hooks/swolomon-sprite'
import { BAND, drawnRows, NOON, OPTIONS, SESSION, STATUS, TINY, TODAY, WEIGHTED, workout, world } from './world'

/**
 * What tells the plugin a run will be long (the agent's own hints), what makes a set an easy yes (a small,
 * concrete first step), and what shows the person getting stronger (gains, level-ups, the turn's tally).
 */

// ---------------------------------------------------------------------------------------------------------
// The agent's hints about how long it will be (pure).

test('a scheduled wake-up is an exact wait, held to the engine’s 1 to 60 minutes', () => {
  expect(toolSign({ tool: 'ScheduleWakeup', delaySeconds: 300 }, 1)).toEqual({ reason: 'waiting', waitMs: 300_000 })
  expect(toolSign({ tool: 'ScheduleWakeup', delaySeconds: 10 }, 1)).toEqual({ reason: 'waiting', waitMs: 60_000 })
  expect(toolSign({ tool: 'ScheduleWakeup', delaySeconds: 99_999 }, 1)).toEqual({ reason: 'waiting', waitMs: 3_600_000 })
  // Stopping a loop (no delay) says nothing.
  expect(toolSign({ tool: 'ScheduleWakeup' }, 1)).toBeNull()
})

test('a monitor, a raised Bash timeout and a planned job are signs; below their marks they are not', () => {
  expect(toolSign({ tool: 'Monitor' }, 1)).toEqual({ reason: 'waiting' })
  expect(toolSign({ tool: 'Bash', command: 'ls', timeoutMs: 120_000 }, 1)).toEqual({ reason: 'long-run' })
  expect(toolSign({ tool: 'Bash', command: 'ls', timeoutMs: 119_999 }, 1)).toBeNull()
  expect(toolSign({ tool: 'TodoWrite', todos: 4 }, 1)).toEqual({ reason: 'planned' })
  expect(toolSign({ tool: 'TodoWrite', todos: 3 }, 1)).toBeNull()
  expect(toolSign({ tool: 'TaskCreate', tasksThisTurn: 3 }, 1)).toEqual({ reason: 'planned' })
  expect(toolSign({ tool: 'TaskCreate', tasksThisTurn: 2 }, 1)).toBeNull()
})

test('a tool call’s hints are read defensively: only numbers and lists count', () => {
  expect(factsOf('Bash', { command: 'make', timeout: '600000' }, 0)).toEqual({ tool: 'Bash', command: 'make' })
  expect(factsOf('Bash', { command: 'make', timeout: 600_000 }, 0)).toEqual({ tool: 'Bash', command: 'make', timeoutMs: 600_000 })
  expect(factsOf('TodoWrite', { todos: [{}, {}, {}, {}, {}] }, 0)).toEqual({ tool: 'TodoWrite', todos: 5 })
  expect(factsOf('ScheduleWakeup', { delaySeconds: Number.NaN }, 0)).toEqual({ tool: 'ScheduleWakeup' })
  expect(factsOf('TaskCreate', {}, 3)).toEqual({ tool: 'TaskCreate', tasksThisTurn: 3 })
})

test('a wait as people say it', () => {
  expect(waitWords(60_000)).toBe('about a minute')
  expect(waitWords(89_000)).toBe('about a minute')
  expect(waitWords(300_000)).toBe('about 5 min')
  expect(waitWords(3_300_000)).toBe('about an hour')
})

// ---------------------------------------------------------------------------------------------------------
// The hints, mounted.

test('a scheduled wake-up mid-turn: the question in 5 s, saying when the agent is back', OPTIONS, async ($, on) => {
  const { clock } = world(on, TINY)
  await $.session.start(SESSION)
  await $.turn.start({ text: 'babysit the deploy', turnId: 't1' })
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await $.tool.call({ tool: 'ScheduleWakeup', delaySeconds: 300, reason: 'x', prompt: 'y' } as never)
  await clock.advance(5_000)
  expect(await ui.find({ key: 'start' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: line('reason-napping', { day: TODAY, wait: 'about 5 min' }) })).toBeDefined()
  await ui.unmount()
})

test('a to-do list of four: the question in 5 s, opening with the plan', OPTIONS, async ($, on) => {
  const { clock } = world(on, TINY)
  await $.session.start(SESSION)
  await $.turn.start({ text: 'do the thing', turnId: 't1' })
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await $.tool.call({ tool: 'TodoWrite', todos: [1, 2, 3, 4].map(n => ({ content: `${n}`, status: 'pending', activeForm: `${n}` })) } as never)
  await clock.advance(5_000)
  expect(await ui.find({ type: 'Text', text: line('reason-planned', { day: TODAY }) })).toBeDefined()
  await ui.unmount()
})

test('the third task created in a turn is a planned job; the first two are not', OPTIONS, async ($, on) => {
  const { clock } = world(on, TINY)
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  for (let i = 0; i < 2; i += 1) await $.tool.call({ tool: 'TaskCreate', subject: 's', description: 'd' } as never)
  await clock.advance(5_000)
  expect(await ui.find({ key: 'start' })).toBeUndefined()
  await $.tool.call({ tool: 'TaskCreate', subject: 's', description: 'd' } as never)
  await clock.advance(5_000)
  expect(await ui.find({ type: 'Text', text: line('reason-planned', { day: TODAY }) })).toBeDefined()
  await ui.unmount()
})

// ---------------------------------------------------------------------------------------------------------
// A small, concrete first step.

test('about how long a set takes: reps at 3 s, timed as said, each side twice, 10 s to get set, in 15 s steps', () => {
  expect(setSeconds({ name: 'Squats', reps: '10 reps', sets: 1 }, undefined)).toBe(45)
  expect(setSeconds({ name: 'Plank', reps: '20 s', sets: 1 }, undefined)).toBe(30)
  expect(setSeconds({ name: 'Lunges', reps: '8 each leg', sets: 1 }, undefined)).toBe(60)
  expect(setSeconds({ name: 'Side plank', reps: '30 s each side', sets: 1 }, 40)).toBe(90)
  expect(setSeconds({ name: 'Odd', reps: 'some', sets: 1 }, undefined)).toBe(30)
  expect([timeWords(45), timeWords(60), timeWords(90), timeWords(150)]).toEqual(['45 s', '1 min', '2 min', '3 min'])
})

test('the question names the first step and its time', OPTIONS, async ($, on) => {
  const { clock } = world(on, TINY)
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await clock.advance(30_000)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await ui.find({ type: 'Text', text: line('ask-detail', { day: TODAY, exercise: 'Push-ups', amount: '10 reps', time: '45 s' }) })).toBeDefined()
  await ui.unmount()
})

// ---------------------------------------------------------------------------------------------------------
// Getting stronger, shown.

const pushUps = (count: number, d = TODAY - 2): HistoryEntry => ({ kind: 'set', t: NOON, d, w: 0, exercise: 'Push-ups', set: 1, target: '10 reps', result: 'done', count })

test('the logged line: up on last time at the same load, unless it is a new best', OPTIONS, async ($, on) => {
  world(on, TINY, { lastByExercise: { 'Push-ups': { last: pushUps(10), best: { any: 15 } } } })
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  await $.command.run(workout('done 12'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  // Under his celebration (every set done has one): the logged row itself.
  expect(drawnRows(await ui.drawn()).find(row => row.startsWith('✓'))).toBe('✓ Logged Push-ups 12 reps · ↑2 on last time · 1 of 2 today   1: High five   0: Undo')
  await ui.unmount()
})

test('a new best says more than up on last time, so it wins', OPTIONS, async ($, on) => {
  world(on, TINY, { lastByExercise: { 'Push-ups': { last: pushUps(10), best: { any: 11 } } }, totalDoneSets: 5 })
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  await $.command.run(workout('done 12'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(drawnRows(await ui.drawn())).toContain('✓ Logged Push-ups 12 reps · new best · 1 of 2 today   1: High five   0: Undo')
  await ui.unmount()
})

test('the logged line: heavier than last time; the same again says nothing extra', OPTIONS, async ($, on) => {
  const last: HistoryEntry = { kind: 'set', t: NOON, d: TODAY - 2, w: 0, exercise: 'Goblet squats', set: 1, target: '10 reps', result: 'done', count: 10, weight: 8 }
  world(on, WEIGHTED, { lastByExercise: { 'Goblet squats': { last, best: { '8': 12, '10': 12 } } } })
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  await $.command.run(workout('done 10 10'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await ui.find({ type: 'Text', text: ' · heavier than last time' })).toBeDefined()
  await $.command.run(workout('now'))
  await $.command.run(workout('done 10 10'))
  expect(await ui.find({ type: 'Text', text: /last time/ })).toBeUndefined()
  await ui.unmount()
})

test('raised targets: more reps, more weight or a harder move count; a deload never does', () => {
  const plan: Plan = {
    ...TINY,
    workouts: [
      {
        name: 'A',
        exercises: [
          { name: 'Squats', reps: '12 reps', range: [12, 18], sets: 2 },
          { name: 'Goblet squats', reps: '10 reps', range: [10, 15], sets: 2, weight: { start: 8, step: 2, unit: 'kg' } },
        ],
      },
    ],
  }
  const workout = plan.workouts[0]!
  const base = { belowStreak: 0, toughStreak: 0 }
  expect(raisedTargets(workout, { Squats: { reps: 12, ...base } }, { Squats: { reps: 13, ...base } })).toEqual([{ name: 'Squats', amount: '13 reps' }])
  expect(raisedTargets(workout, { 'Goblet squats': { reps: 15, weight: 8, ...base } }, { 'Goblet squats': { reps: 10, weight: 10, ...base } })).toEqual([
    { name: 'Goblet squats', amount: '10 reps @ 10 kg' },
  ])
  // A deload: lighter, even with more reps, is not a level-up.
  expect(raisedTargets(workout, { 'Goblet squats': { reps: 10, weight: 10, ...base } }, { 'Goblet squats': { reps: 12, weight: 8, ...base } })).toEqual([])
  expect(raisedTargets(workout, { Squats: { reps: 12, ...base } }, { Squats: { reps: 12, ...base } })).toEqual([])
})

test('a finished workout says what hit its target, and the rating settles what goes up next time', OPTIONS, async ($, on) => {
  const { w } = world(on, { ...TINY, workouts: [{ name: 'A', exercises: [{ name: 'Push-ups', reps: '10 reps', range: [10, 15], sets: 1 }] }, ...TINY.workouts.slice(1)] })
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  await $.command.run(workout('done 10'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await ui.find({ type: 'Text', text: line('hit-targets', { day: TODAY, list: 'Push-ups' }) })).toBeDefined()
  await ui.press({ key: 'good' })
  expect(w.toasts).toContain(line('next-time', { day: TODAY, list: 'Push-ups 11 reps' }))
  await ui.unmount()
})

test('Tough holds the targets: no next-time toast', OPTIONS, async ($, on) => {
  const { w } = world(on, { ...TINY, workouts: [{ name: 'A', exercises: [{ name: 'Push-ups', reps: '10 reps', range: [10, 15], sets: 1 }] }, ...TINY.workouts.slice(1)] })
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  await $.command.run(workout('done 10'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await ui.press({ key: 'tough' })
  expect(w.toasts.some(t => t.startsWith('Stronger already.'))).toBe(false)
  await ui.unmount()
})

test('since day 1: a harder move first, then more weight, then more reps; nothing without a gain', () => {
  const plan: Plan = {
    ...TINY,
    workouts: [
      {
        name: 'A',
        exercises: [
          { name: 'Incline push-ups', reps: '10 reps', range: [10, 15], sets: 1 },
          { name: 'Squats', reps: '12 reps', range: [12, 18], sets: 1 },
          { name: 'Goblet squats', reps: '10 reps', range: [10, 15], sets: 1, weight: { start: 8, step: 2, unit: 'kg' } },
          { name: 'Plank', reps: '20 s', range: [20, 40], sets: 1 },
        ],
      },
    ],
  }
  const set = (exercise: string, count: number, weight?: number): HistoryEntry => ({
    kind: 'set', t: NOON, d: TODAY, w: 0, exercise, set: 1, target: '', result: 'done', count, ...(weight === undefined ? {} : { weight }),
  })
  const targets = { 'Incline push-ups': { reps: 12, belowStreak: 0, toughStreak: 0, variant: { name: 'Push-ups', reps: '12 reps', range: [12, 18] as [number, number] } } }
  const history = [set('Squats', 12), set('Squats', 15), set('Goblet squats', 10, 8), set('Goblet squats', 10, 12), set('Plank', 20), set('Plank', 20)]
  expect(gainsOf({ plan, targets, history })).toEqual(['Incline push-ups → Push-ups', 'Squats 12 → 15 reps', 'Goblet squats 8 → 12 kg'])
  expect(gainsOf({ plan, targets: {}, history: [] })).toEqual([])
})

test('the pane leads with the gains once there are any', OPTIONS, async ($, on) => {
  world(on, TINY, { history: [pushUps(10, TODAY - 4), pushUps(13, TODAY - 2)] })
  await $.session.start(SESSION)
  await $.command.run(workout(''))
  const pane = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...STATUS })
  expect(await pane.find({ type: 'Text', text: 'Push-ups 10 → 13 reps' })).toBeDefined()
  await pane.unmount()
})

// ---------------------------------------------------------------------------------------------------------
// The spinner and the turn's last line.

const SPINNER = { component: 'Spinner', props: { word: 'Sauteing', message: null, suffix: '…', mode: 'thinking' } } as const

test('mid-workout the spinner lifts: a gym word in place of the engine’s; before the first set and with a message, not', OPTIONS, async ($, on) => {
  world(on, TINY)
  await $.session.start(SESSION)
  const draw = async (props: Partial<(typeof SPINNER)['props']> | { message: string } = {}) => {
    const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...SPINNER, props: { ...SPINNER.props, ...props } })
    const text = (await ui.findAll({ type: 'Text' })).map(el => el.text).join('')
    await ui.unmount()
    return text
  }
  expect(await draw()).toBe('Sauteing…')
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  const lifted = await draw()
  expect(lifted).not.toBe('Sauteing…')
  expect(lifted?.endsWith('…')).toBe(true)
  // The same engine word keeps the same gym word.
  expect(await draw()).toBe(lifted)
  expect(await draw({ message: 'Compacting' })).toBe('Compacting…')
})

test('a turn the person trained through ends with what they did meanwhile; other turns as they were', OPTIONS, async ($, on) => {
  world(on, TINY)
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  await $.turn.complete({ turnId: 't1', answer: '', reason: 'answer', durationMs: 183_000, isAborted: false } as never)
  await $.turn.start({ text: 'again', turnId: 't2' })
  await $.turn.complete({ turnId: 't2', answer: '', reason: 'answer', durationMs: 9_000, isAborted: false } as never)
  const draw = async (durationMs: number) => {
    const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', component: 'TurnDuration', props: { word: 'Baked', durationMs } })
    const rows = (await ui.findAll({ type: 'Text' })).map(el => el.text).join('')
    await ui.unmount()
    return rows
  }
  expect(await draw(183_000)).toBe(`Baked for 183s · ${line('turn-sets', { day: TODAY, sets: '1 set' })} 💪`)
  expect(await draw(9_000)).toBe('Baked for 9s')
})

// ---------------------------------------------------------------------------------------------------------
// Every surface.

test('the SVG portrait: one rect per run of a colour, the sprite’s own size, crisp', () => {
  const svg = svgOf(SPRITE, 'idle')
  expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">')).toBe(true)
  // Row 1 of the idle frame: '.....hhhhhh.....': one hair run, 6 wide.
  expect(svg).toContain('<rect x="5" y="1" width="6" height="1" fill="#3e2618"/>')
  const filled = decodeFrame(SPRITE, 'idle').flat().filter(c => c !== null).length
  const covered = [...svg.matchAll(/width="(\d+)"/g)].reduce((n, m) => n + Number(m[1]), 0)
  expect(covered).toBe(filled)
  expect(svgOf(SPRITE, 'miniIdle')).toContain('viewBox="0 0 6 6"')
})

test('VS Code alone (no band above the prompt there): the band opens as its own pane, and closes with it', OPTIONS, async ($, on) => {
  const { w } = world(on, TINY, {}, { surfaces: ['vscode'] })
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  expect(w.opened).toContain('workout-band')
  const pane = await $.ui.mount({ plugin: 'idlereps', surface: 'vscode', component: 'Pane', requestId: 'workout-band', props: { ...STATUS.props } })
  // The set, its buttons, and Swolomon as an SVG.
  expect(await pane.find({ type: 'Svg' })).toBeDefined()
  expect(await pane.find({ type: 'Text', text: /Push-ups/ })).toBeDefined()
  await $.command.run(workout('later'))
  expect(w.closed).toContain('workout-band')
  await pane.unmount()
})

test('a terminal attached: no band pane, the band stays above the prompt', OPTIONS, async ($, on) => {
  const { w } = world(on, TINY, {}, { surfaces: ['terminal', 'vscode'] })
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  expect(w.opened).not.toContain('workout-band')
})
