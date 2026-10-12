import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import type { HistoryEntry, Plan } from '../types'
import { advance, cueFor, START, stepsOf, swapMove } from '../hooks/plan'
import { BAND, drawnRows, OPTIONS, ownStore, SESSION, STATUS, TODAY, workout, world } from './world'

/**
 * Variety through the day (owner, 2026-10-12: "I was asked to do pushups 7 times throughout the day, shouldnt
 * there have been more variety? Also what about a 'skip move' or 'replace move' that lets ppl cycle through
 * the ask?"): sets go in turn, and Swap move cycles to the next move with sets left.
 */

const PUSH: Plan = {
  version: 1,
  name: 'Push',
  schedule: { everyNDays: 1 },
  workouts: [
    {
      name: 'Push',
      exercises: [
        { name: 'Push-ups', reps: '12 reps', sets: 3 },
        { name: 'Pike push-ups', reps: '8 reps', sets: 3 },
        { name: 'Bench dips', reps: '10 reps', sets: 2 },
      ],
    },
    { name: 'Legs', exercises: [{ name: 'Squats', reps: '20 reps', sets: 1 }] },
  ],
}

const names = (plan: Plan, progress = START, n = 8): string[] => {
  const out: string[] = []
  let at = progress
  for (let i = 0; i < n; i++) {
    const cue = cueFor(plan, at, {})
    if (cue === null || cue.workout !== 0) break
    out.push(`${cue.exercise.name} ${cue.set}`)
    at = advance(plan, at, TODAY).progress
  }
  return out
}

async function bandOf($: Engine) {
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  const rows = drawnRows(await ui.drawn())
  const keys = (await ui.findAll({ type: 'Button' })).map(b => String(b.key))
  await ui.unmount()
  return { rows, keys }
}

test('sets go in turn: a set of each move, then round again; an exercise with fewer sets drops out', () => {
  expect(names(PUSH)).toEqual(['Push-ups 1', 'Pike push-ups 1', 'Bench dips 1', 'Push-ups 2', 'Pike push-ups 2', 'Bench dips 2', 'Push-ups 3', 'Pike push-ups 3'])
  expect(stepsOf(PUSH.workouts[0]!).map(s => s.exercise.name)).toEqual(names(PUSH).map(n => n.replace(/ \d$/, '')))
  // The last set finishes the workout.
  let at = START
  for (let i = 0; i < 8; i++) at = advance(PUSH, at, TODAY).progress
  expect(at).toEqual({ ...START, workout: 1, lastCompletedOn: TODAY })
})

test('Swap move cycles through the moves with sets left, records nothing, and each keeps its own set count', () => {
  const swapped = swapMove(PUSH, START)!
  expect(cueFor(PUSH, swapped, {})).toMatchObject({ step: 1, set: 1, slot: 1, exercise: { name: 'Pike push-ups' } })
  const again = swapMove(PUSH, swapped)!
  expect(cueFor(PUSH, again, {})?.exercise.name).toBe('Bench dips')
  expect(cueFor(PUSH, swapMove(PUSH, again)!, {})?.exercise.name).toBe('Push-ups')
  expect(again.done).toBe(0)
  // Done on the swapped-to move: its set 1; the turn goes on from there.
  expect(names(PUSH, again, 3)).toEqual(['Bench dips 1', 'Push-ups 1', 'Pike push-ups 1'])
})

test('Swap move only while another move has sets left', () => {
  // Push-ups and pike push-ups done; two sets of dips left.
  const dipsLeft = { ...START, done: 6, doneBy: [3, 3, 0], cursor: 2 }
  expect(cueFor(PUSH, dipsLeft, {})?.canSwap).toBeUndefined()
  expect(swapMove(PUSH, dipsLeft)).toBeNull()
  expect(cueFor(PUSH, START, {})?.canSwap).toBe(true)
})

test('a workout under way before sets went in turn carries on exercise by exercise', () => {
  expect(names(PUSH, { ...START, done: 4 }, 3)).toEqual(['Pike push-ups 2', 'Bench dips 1', 'Pike push-ups 3'])
})

test('the set band: Swap move shows the next move in place, nothing logged; Done logs the swapped-to move', OPTIONS, async ($, on) => {
  const store = ownStore(on, {})
  world(on, PUSH, 'own-store')
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  let band = await bandOf($)
  expect(band.rows.some(row => row.startsWith('Push-ups: 12 reps  (1/3)'))).toBe(true)
  expect(band.keys).toContain('swap')
  await $.command.run(workout('swap'))
  band = await bandOf($)
  expect(band.rows.some(row => row.startsWith('Pike push-ups: 8 reps  (1/3)'))).toBe(true)
  // Started stays started: how it went, for the new move.
  expect(band.keys).toContain('all')
  expect((store.get('history') as HistoryEntry[] | undefined) ?? []).toEqual([])
  await $.command.run(workout('done'))
  expect((store.get('history') as HistoryEntry[]).at(-1)).toMatchObject({ kind: 'set', exercise: 'Pike push-ups', set: 1 })
  expect(store.get('progress')).toMatchObject({ done: 1, doneBy: [0, 1, 0] })
})

test('/workout swap with no set showing moves the next set on and says which; with nothing to swap to, says so', OPTIONS, async ($, on) => {
  const store = ownStore(on, {})
  world(on, PUSH, 'own-store')
  await $.session.start(SESSION)
  expect(JSON.stringify(await $.command.run(workout('swap')))).toContain('Next up: Pike push-ups')
  store.set('progress', { ...START, done: 6, doneBy: [3, 3, 0], cursor: 2 })
  expect(JSON.stringify(await $.command.run(workout('swap')))).toContain('Nothing to swap to')
})

test('a set band shown before another session swapped records nothing when answered here', OPTIONS, async ($, on) => {
  const store = ownStore(on, {})
  world(on, PUSH, 'own-store')
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  // Swapped there: the next set is a pike push-up, at the same step.
  store.set('progress', swapMove(PUSH, START))
  await $.command.run(workout('done'))
  expect((store.get('history') as HistoryEntry[] | undefined) ?? []).toEqual([])
})

test('the pane: each move’s own sets done, and the next one marked, after a swap', OPTIONS, async ($, on) => {
  ownStore(on, { startedOn: TODAY, progress: { ...START, done: 2, doneBy: [1, 0, 1], cursor: 1 } })
  world(on, PUSH, 'own-store')
  await $.session.start(SESSION)
  await $.command.run(workout(''))
  const pane = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...STATUS })
  const rows = drawnRows(await pane.drawn())
  expect(rows.find(row => row.includes('Push-ups') && !row.includes('Pike'))).toMatch(/^ {2}Push-ups\s+●○○/)
  expect(rows.find(row => row.includes('Pike push-ups'))).toMatch(/^› Pike push-ups\s+●○○/)
  expect(rows.find(row => row.includes('Bench dips'))).toMatch(/^ {2}Bench dips\s+●○/)
  await pane.unmount()
})

test('the weight they say on a move’s first set is where its next sets start; a move not done yet still asks', OPTIONS, async ($, on) => {
  const LIFTS: Plan = {
    ...PUSH,
    workouts: [
      {
        name: 'Push',
        exercises: [
          { name: 'Dumbbell overhead press', reps: '10 reps', sets: 2, weight: { start: 10, step: 2, unit: 'kg' } },
          { name: 'Dumbbell overhead triceps extension', reps: '12 reps', sets: 2, weight: { start: 10, step: 2, unit: 'kg' } },
        ],
      },
    ],
  }
  const store = ownStore(on, {})
  world(on, LIFTS, 'own-store')
  await $.session.start(SESSION)
  await $.command.run(workout('now'))
  await $.command.run(workout('done 10 40'))
  const targets = store.get('targets') as Record<string, { weight?: number }>
  expect(targets['Dumbbell overhead press']?.weight).toBe(40)
  expect(cueFor(LIFTS, store.get('progress') as typeof START, targets as never)).toMatchObject({ exercise: { name: 'Dumbbell overhead triceps extension' }, isNewLoad: true })
  // The triceps' weight asked, Swap move is on the steppers too: back to the press, at 40.
  await $.command.run(workout('now'))
  expect((await bandOf($)).keys).toEqual(['save', 'fewer', 'more', 'lighter', 'heavier', 'swap'])
  await $.command.run(workout('swap'))
  // The press has its weight: how it went, at 40.
  expect((await bandOf($)).rows.some(row => row.startsWith('Dumbbell overhead press: 10 reps @ 40 kg'))).toBe(true)
  const press = cueFor(LIFTS, store.get('progress') as typeof START, targets as never)
  expect(press).toMatchObject({ exercise: { name: 'Dumbbell overhead press' }, weight: 40, set: 2 })
  expect(press?.isNewLoad).toBeUndefined()
})
