import { expect, test } from 'claude-code/testing'

import { STARTER_MOVES } from '../hooks/collection'
import { drawMove, moveById } from '../hooks/moves'
import { APPROACH_STEPS, backOfGym, BUST_SCALE, decodeRows, DOLLY_STEP, dollyStep, farGrid, framed, idleBeat, isOffFrame, scaleOf, upToYou } from '../hooks/portrait'
import type { IdleStep } from '../hooks/portrait'
import { SPRITE } from '../hooks/swolomon-sprite'

/**
 * He walks to his framing (owner, 2026-10-12: "when he flips scenes he should walk to the right framing
 * portrait or full body or small etc"): up close, whole body or at the back, he never jumps from one to another.
 */

/** Where he jumps in size, from one frame he shows in to the next, up close at both ends; off the frame, none. */
const jumps = (steps: readonly IdleStep[]): [number, number][] => {
  const out: [number, number][] = []
  let at: number | null = BUST_SCALE
  for (const step of [...steps, { pose: 'idle', ms: 0 } as const]) {
    if (isOffFrame(step)) at = null
    const scale = scaleOf(step)
    if (scale === null) continue
    if (at !== null && Math.abs(scale - at) > DOLLY_STEP + 1e-9) out.push([at, scale])
    at = scale
  }
  return out
}

test('no beat of his ever jumps in size: between lines, through a set, with moves or his idle animations', () => {
  for (const mode of ['band', 'set'] as const) {
    for (const moves of [[], [...STARTER_MOVES], ['push-up']]) {
      for (let n = 0; n < 400; n++) expect([mode, n, jumps(idleBeat(n, 'full', false, moves, mode).steps)]).toEqual([mode, n, []])
    }
  }
})

test('a move up close: he steps back till his whole body shows, does it, and walks back up to you', () => {
  const steps = framed([{ move: 'squat', reps: 2, ms: 0 }])
  const at = steps.findIndex(step => 'move' in step)
  const before = steps.slice(0, at).map(step => scaleOf(step)!)
  const after = steps.slice(at + 1).map(step => scaleOf(step)!)
  expect(before.length).toBeGreaterThan(2)
  expect(before).toEqual([...before].sort((a, b) => b - a))
  expect(after).toEqual([...after].sort((a, b) => a - b))
  expect([before.at(-1)! <= 1 + DOLLY_STEP, after[0]! <= 1 + DOLLY_STEP, after.at(-1)! >= BUST_SCALE - DOLLY_STEP]).toEqual([true, true, true])
  // Front on, mid-stride, the strides in turn.
  for (const step of [...steps.slice(0, at), ...steps.slice(at + 1)]) expect('far' in step && 'approach' in step.far.src).toBe(true)
})

test('what never jumps is left alone: a blink, a glance, a walk out of his square, the walk to the back of the gym', () => {
  const blink: IdleStep[] = [{ pose: 'blink', ms: 150 }, { pose: 'glanceL', ms: 900 }]
  expect(framed(blink)).toEqual(blink)
  const walkOff: IdleStep[] = [{ walk: { frame: 'walkA', facing: 'left', x: -8, y: 0 }, ms: 90 }, { walk: { frame: 'walkA', facing: 'left', x: -16, y: 0 }, ms: 90 }]
  expect(framed(walkOff)).toEqual(walkOff)
  // Off to the back of the gym and in again: he walks off up close and comes in small, so no walk to or from you.
  expect(framed(backOfGym('squat', 'left'))).toEqual(backOfGym('squat', 'left'))
})

test('walking up to you from the back of the gym: bigger every step, all the way to up close', () => {
  const steps = framed(upToYou('left'))
  // No walk to or from you before he is off: he walked out of his square up close.
  const off = steps.findIndex(isOffFrame)
  expect(steps.slice(0, off).every(step => !('far' in step))).toBe(true)
  const back = steps.findIndex(step => 'far' in step && 'approach' in step.far.src)
  const growing = steps.slice(back).flatMap(step => scaleOf(step) ?? [])
  expect(growing).toEqual([...growing].sort((a, b) => a - b))
  expect(growing.at(-1)).toBe(BUST_SCALE)
  expect(jumps(steps)).toEqual([])
})

test('walking to or from you, his head stays near the top and he stays in the middle, whatever his size', () => {
  const rows = drawMove(moveById(APPROACH_STEPS.move)!)[0]!
  const grid = decodeRows(SPRITE, rows, 'march', 16, 16)
  for (const scale of [1.2, 1.4, 1.6, 1.8]) {
    const step = dollyStep(scale, 0)
    if (!('far' in step)) throw new Error('not far')
    const drawn = farGrid(grid, step.far)
    const top = drawn.findIndex(row => row.some(c => c !== null))
    const columns = drawn.flatMap(row => row.flatMap((c, x) => (c === null ? [] : [x])))
    const middle = (Math.min(...columns) + Math.max(...columns)) / 2
    expect([scale, top <= 1, Math.abs(middle - 7.5) <= 2]).toEqual([scale, true, true])
  }
})
