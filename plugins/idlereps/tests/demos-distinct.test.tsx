import { expect, test } from 'claude-code/testing'

import { DEMOS, drawMove, GESTURES, moveById, moveForExercise, MOVES } from '../hooks/moves'
import type { Move } from '../hooks/moves'

/**
 * Every demo is its own picture (2026-10-06: a new gag's first pose matched the neck rolls' last), and the
 * office's standing swaps play standing demos of their own.
 */

const pictures = (move: Move): string[] => drawMove(move).map(rows => rows.join('\n'))
const demo = (id: string): Move => {
  const move = moveById(id)
  if (move === undefined) throw new Error(`no move ${id}`)
  return move
}

test('no demo pose matches any pose of a collectible move, gesture or celebration', () => {
  const others = new Set([...MOVES, ...GESTURES].flatMap(pictures))
  for (const move of DEMOS) for (const [i, picture] of pictures(move).entries()) expect([move.id, i, others.has(picture)]).toEqual([move.id, i, false])
})

test('no two demos play the same pictures', () => {
  const seen = new Map<string, string>()
  for (const move of DEMOS) {
    const key = pictures(move).join('\n\n')
    expect([move.id, seen.get(key)]).toEqual([move.id, undefined])
    seen.set(key, move.id)
  }
})

test('the hip-flexor and hamstring stretches are drawn standing: no mat, and unlike the floor demos', () => {
  for (const id of ['hip-flexor-stretch', 'hamstring-stretch']) {
    const move = demo(id)
    for (const pose of move.poses) expect([id, (pose.props ?? []).some(p => p.kind === 'mat')]).toEqual([id, false])
  }
  const floor = new Set([...pictures(demo('cat-cow')), ...pictures(demo('thoracic-rotation'))])
  for (const picture of [...pictures(demo('hip-flexor-stretch')), ...pictures(demo('hamstring-stretch'))]) expect(floor.has(picture)).toBe(false)
})

test('standing cat-cow is its own move: neither the floor one nor the seated one, and it rounds then arches', () => {
  const mine = pictures(demo('standing-cat-cow'))
  expect(new Set(mine).size).toBe(mine.length)
  const others = new Set([...pictures(demo('cat-cow')), ...pictures(demo('seated-cat-cow'))])
  for (const picture of mine) expect(others.has(picture)).toBe(false)
})

test('every office swap with a name of its own plays its own demo, never a general move', () => {
  const swaps = [
    'Desk push-ups',
    'Wall push-ups',
    'Wall angels',
    'Standing Y-raises',
    'Standing glute kickbacks',
    'Desk plank',
    'Standing knee-to-elbow',
    'Standing side bends',
    'March in place',
    'Standing cat-cow',
    'Close-grip desk push-ups',
    'Dead hang',
  ]
  const demos = new Set(DEMOS.map(m => m.id))
  for (const name of swaps) expect([name, demos.has(moveForExercise(name) ?? '')]).toEqual([name, true])
  expect(moveForExercise('Close-grip desk push-ups')).not.toBe(moveForExercise('Desk push-ups'))
})
