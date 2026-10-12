import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import type { Plan } from '../types'
import { doingFor, ENCOURAGEMENT, moveById, moveForExercise } from '../hooks/moves'
import { STARTER_MOVES } from '../hooks/collection'
import { IDLES } from '../hooks/idles'
import { idleBeat } from '../hooks/portrait'
import { ALT_NAMES, DESK_STRETCHES, LIBRARY } from '../hooks/programs'
import { ANIMATED, BAND, blitLog, cellsOf, SESSION, workout, world } from './world'

/**
 * He does the move he suggests (owner, 2026-10-12: "Swolomon should be doing the move he suggests which means
 * we need to have animations for them all, and if we dont bc the user chose something we dont know, give him
 * an encouragement cycle").
 */


test('every exercise a plan of ours can hold, and every rest-day stretch, has its own move', () => {
  const names = [...new Set([...Object.values(LIBRARY).flatMap(rows => rows.flatMap(row => row.levels.map(e => e.name))), ...ALT_NAMES, ...DESK_STRETCHES.map(s => s.name)])]
  expect(names.length).toBeGreaterThan(50)
  expect(names.filter(name => moveForExercise(name) === null)).toEqual([])
  for (const name of names) expect(doingFor(name)).toEqual([moveForExercise(name)!])
})

test('a move he has no animation for: he cheers you on, in turn, with moves he has', () => {
  expect(doingFor('Zercher carry')).toBe(ENCOURAGEMENT)
  expect(ENCOURAGEMENT.length).toBeGreaterThanOrEqual(5)
  for (const id of ENCOURAGEMENT) expect([id, moveById(id) !== undefined]).toEqual([id, true])
})

test('through a set, his beats are only its move, most of the time; never another move or an idle animation', () => {
  let withMove = 0
  for (let n = 0; n < 400; n++) {
    const moves = idleBeat(n, 'full', false, ['push-up'], 'set').steps.flatMap(step => ('move' in step ? [step.move] : []))
    expect(moves.every(id => id === 'push-up')).toBe(true)
    if (moves.length > 0) withMove += 1
  }
  expect(withMove).toBeGreaterThan(400 * 0.4)
})

const UNKNOWN: Plan = { version: 1, name: 'U', schedule: { everyNDays: 1 }, workouts: [{ name: 'A', exercises: [{ name: 'Zercher carry', reps: '30 s', sets: 3 }] }] }
const KNOWN: Plan = { ...UNKNOWN, workouts: [{ name: 'A', exercises: [{ name: 'Push-ups', reps: '10 reps', sets: 3 }, { name: 'Squats', reps: '12 reps', sets: 3 }] }] }

/** What he blitted to the set band over a few minutes. */
async function blitted($: Engine, on: Parameters<typeof world>[0], plan: Plan): Promise<string[]> {
  const { clock } = world(on, plan)
  const blits = blitLog(on)
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await $.command.run(workout('now'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await clock.advance(75_000)
  await ui.unmount()
  return blits.filter(b => b.key === 'swolomon').map(b => b.cells)
}

/** Every frame, up close, of what he does off a set (a new player's moves, his idle animations) but `allowed`. */
const othersThan = (allowed: readonly string[]): Set<string> => {
  const mine = new Set(allowed.flatMap(id => cellsOf(id)))
  return new Set([...STARTER_MOVES, ...IDLES.map(m => m.id)].filter(id => !allowed.includes(id)).flatMap(id => cellsOf(id)).filter(c => !mine.has(c)))
}

test('live: on a set of push-ups he does push-ups, and never another move', ANIMATED, async ($, on) => {
  const seen = await blitted($, on, KNOWN)
  const pushUps = new Set(cellsOf('push-up'))
  expect(seen.some(c => pushUps.has(c))).toBe(true)
  const others = othersThan(['push-up'])
  expect(seen.filter(c => others.has(c))).toEqual([])
})

test('live: on a set he has no move for, he cheers you on, and never does another move', ANIMATED, async ($, on) => {
  const seen = await blitted($, on, UNKNOWN)
  const cheering = new Set(ENCOURAGEMENT.flatMap(id => cellsOf(id)))
  expect(seen.some(c => cheering.has(c))).toBe(true)
  const others = othersThan(ENCOURAGEMENT)
  expect(seen.filter(c => others.has(c))).toEqual([])
})

test('the back of the gym: through a set, only its move back there; off a set, a move he has or an idle of his', () => {
  const backMoves = (moves: string[], mode: 'band' | 'set') =>
    Array.from({ length: 600 }, (_, n) => idleBeat(n, 'full', false, moves, mode).steps)
      .flat()
      .flatMap(step => ('far' in step && 'move' in step.far.src ? [step.far.src.move] : []))
  const onSet = backMoves(['push-up'], 'set')
  expect(onSet.length).toBeGreaterThan(0)
  expect(new Set(onSet)).toEqual(new Set(['push-up']))
  const idles = new Set(IDLES.map(m => m.id))
  expect(backMoves([], 'band').every(id => idles.has(id))).toBe(true)
})
