import { expect, test } from 'claude-code/testing'

import { drawMove, moveById } from '../hooks/moves'
import { APPROACH_STEPS, backOfGym, BACK_STRIDES, decodeRows, farGrid, idleBeat, shrunk, upToYou } from '../hooks/portrait'
import type { Far, Grid } from '../hooks/portrait'
import { SPRITE } from '../hooks/swolomon-sprite'

/** The back of the gym (owner, 2026-10-12: "let him get smaller too like he's walking into the back of the gym"). */

const pose = (id: string, i: number): Grid => decodeRows(SPRITE, drawMove(moveById(id)!)[i]!, id, 16, 16)
const filled = (g: Grid) => g.flatMap((row, y) => row.flatMap((c, x) => (c === null ? [] : [[x, y] as const])))

test('drawn smaller, a one-pixel line survives, and only a see-through block stays see-through', () => {
  const line: Grid = Array.from({ length: 16 }, () => Array.from({ length: 16 }, (_, x) => (x === 5 ? 7 : null)))
  const half = shrunk(line, 0.5)
  expect(half).toHaveLength(8)
  expect(half.every(row => row.filter(c => c === 7).length === 1)).toBe(true)
  expect(shrunk(Array.from({ length: 16 }, () => new Array<number | null>(16).fill(null)), 0.5).flat().every(c => c === null)).toBe(true)
})

test('at the back he is half size, his feet on the row given, where he is put', () => {
  const far: Far = { src: { move: 'squat', pose: 0 }, facing: 'right', scale: 0.5, x: 4, feet: 12 }
  const cells = filled(farGrid(pose('squat', 0), far))
  expect(Math.max(...cells.map(([, y]) => y))).toBeLessThanOrEqual(12)
  expect(Math.max(...cells.map(([x]) => x)) - Math.min(...cells.map(([x]) => x))).toBeLessThan(8)
  expect(Math.min(...cells.map(([x]) => x))).toBeGreaterThanOrEqual(4)
  // Facing left is the same picture mirrored.
  const left = filled(farGrid(pose('squat', 0), { ...far, facing: 'left' }))
  expect(left.length).toBe(cells.length)
})

test('a trip to the back: out of his square, in small, the move there, out, and back up close facing you', () => {
  const steps = backOfGym('squat', 'right')
  const kinds = steps.map(s => ('walk' in s ? 'walk' : 'far' in s ? ('stride' in s.far.src ? 'stride' : 'move') : 'pose' in s ? 'pose' : 'other'))
  const firstMove = kinds.indexOf('move')
  expect(kinds.slice(0, firstMove)).toContain('walk')
  expect(kinds.slice(0, firstMove)).toContain('stride')
  expect(kinds.slice(firstMove).filter(k => k === 'walk').length).toBeGreaterThan(0)
  expect(steps.at(-1)).toEqual({ pose: 'lookYou', ms: 700 })
  // He leaves his square and comes back to it: the close-up walk ends where it started.
  const walks = steps.flatMap(s => ('walk' in s ? [s.walk.x] : []))
  expect([walks[0], walks.at(-1)]).toEqual([0, 0])
  expect(steps.reduce((ms, s) => ms + s.ms, 0)).toBeLessThan(20_000)
  expect(backOfGym('no-such-move', 'left')).toEqual([])
  expect(moveById(BACK_STRIDES.move)?.poses.length).toBeGreaterThan(Math.max(...BACK_STRIDES.poses))
})

test('up to the camera: from the back, front on, bigger and lower every step, till he is up close looking at you', () => {
  const steps = upToYou('left')
  const toward = steps.flatMap(s => ('far' in s && 'approach' in s.far.src ? [s.far] : []))
  expect(toward.length).toBeGreaterThanOrEqual(6)
  for (const [i, far] of toward.entries()) {
    if (i === 0) continue
    expect(far.scale).toBeGreaterThan(toward[i - 1]!.scale)
    expect(far.feet).toBeGreaterThanOrEqual(toward[i - 1]!.feet)
  }
  expect(toward.at(-1)?.scale).toBe(1)
  expect(steps.at(-2)).toEqual({ pose: 'lookYou', ms: 900 })
  // He started up close and left his square first: the close-up walk starts where he stood.
  expect(steps.flatMap(s => ('walk' in s ? [s.walk.x] : []))[0]).toBe(0)
  expect(moveById(APPROACH_STEPS.move)?.poses.length).toBeGreaterThan(Math.max(...APPROACH_STEPS.poses))
  // It is one of his beats between lines.
  const seen = Array.from({ length: 400 }, (_, n) => idleBeat(n, 'full', false, [])).some(beat => beat.steps.some(s => 'far' in s && 'approach' in s.far.src))
  expect(seen).toBe(true)
})
