/**
 * His stage (portrait.ts idle beats, scenes.ts): the steps a beat is made of, and the walks he takes in and
 * out of his square, across the back of the gym and up to you. Pure.
 */

import type { LineId } from './copy'
import { moveById, movePlay } from './moves'
import type { Pose } from './portrait'

/** Where he is in his square while walking: the profile frame, which way, and its left edge and bob. */
export type Walk = { frame: 'walkA' | 'walkB'; facing: 'left' | 'right'; x: number; y: number }

/** A regular walking past behind him (regulars.ts): who, where on their walk, and where his eyes are. */
export type Cameo = { who: string; walk: Walk; pose: Pose }

/**
 * One step of an idle beat: a pose of the bust, a place on a walk, one of his moves played through, a
 * regular passing behind him, or his word (an aside) on it.
 */
export type IdleStep =
  | { pose: Pose; ms: number }
  | { walk: Walk; ms: number }
  | { move: string; reps: number; ms: number }
  | { cameo: Cameo; ms: number }
  | { aside: LineId; ms: number }
  | { far: Far; ms: number }

/**
 * Him further back in the gym (owner, 2026-10-12: "let him get smaller too like he's walking into the back of
 * the gym to do his workouts"): a walk frame or a move's pose, drawn at `scale`, its left edge at `x` and its
 * feet on row `feet` (further back, higher up).
 */
export type Far = { src: { stride: 0 | 1 } | { approach: 0 | 1 } | { move: string; pose: number }; facing: 'left' | 'right'; scale: number; x: number; feet: number }

export const turned = (facing: Walk['facing'], ms: number): IdleStep => ({ walk: { frame: 'walkA', facing, x: 0, y: 0 }, ms })

/** Walking `from` to `to` (left edges), two pixels a step, the stride and the bob changing every other step. */
export function walking(facing: Walk['facing'], from: number, to: number): IdleStep[] {
  const steps: IdleStep[] = []
  const dir = to > from ? 2 : -2
  for (let x = from, i = 0; dir > 0 ? x <= to : x >= to; x += dir, i += 1) {
    const isB = Math.floor(i / 2) % 2 === 1
    steps.push({ walk: { frame: isB ? 'walkB' : 'walkA', facing, x, y: isB ? -1 : 0 }, ms: WALK_IDLE_STEP_MS })
  }
  return steps
}

/** A walk's pace in his square: slower than the entrance's, a stroll. */
export const WALK_IDLE_STEP_MS = 90

/** Off for a bit, then back: out one side, a moment away, in again facing the way he went. */
export function stroll(side: Walk['facing']): IdleStep[] {
  const far = side === 'left' ? -16 : 16
  const back = side === 'left' ? 'right' : 'left'
  return [turned(side, 300), ...walking(side, 0, far), { walk: { frame: 'walkA', facing: side, x: far, y: 0 }, ms: 700 }, ...walking(back, far, 0), turned(back, 250)]
}

/** At the back of the gym: his size there, where his feet are, where he works out, how fast he walks there. */
export const BACK = { scale: 0.5, feet: 12, x: 4, stepMs: 170 } as const

/** The full-body walk he crosses the back in: his strut's two strides nearest the middle (idles-b.ts), by stride. */
export const BACK_STRIDES = { move: 'strut', poses: [2, 3] } as const

/** Where his feet are at `scale`: further back, higher up (at the back of the gym, row 12; his whole body, 15). */
export const feetAt = (scale: number): number => Math.round(BACK.feet + (scale - BACK.scale) * 6)

/** His left edge at `scale`, in the middle of his square. */
export const centredAt = (scale: number): number => Math.floor((16 - Math.round(16 * scale)) / 2)

/** Where he is just off his square at `scale`, on `side`. */
export const offAt = (scale: number, side: Walk['facing']): number => (side === 'left' ? -Math.round(16 * scale) : 16)

/** Walking across the gym at `scale` from `from` to `to` (left edges), a pixel a step, the strides in turn. */
export function walkAcross(scale: number, from: number, to: number, stepMs: number = BACK.stepMs): IdleStep[] {
  const dir = to > from ? 1 : -1
  const facing: Far['facing'] = dir > 0 ? 'right' : 'left'
  const steps: IdleStep[] = []
  for (let x = from, i = 0; dir > 0 ? x <= to : x >= to; x += dir, i += 1) {
    steps.push({ far: { src: { stride: Math.floor(i / 2) % 2 === 0 ? 0 : 1 }, facing, scale, x, feet: feetAt(scale) }, ms: stepMs })
  }
  return steps
}

/** Walking across the back from `from` to `to` (left edges). */
export const backWalk = (from: number, to: number): IdleStep[] => walkAcross(BACK.scale, from, to)

/** Walking straight at you, front on: his march's two steps (moves.ts), by step. */
export const APPROACH_STEPS = { move: 'march', poses: [0, 1] } as const

/** The most he grows or shrinks a step walking to or from you, in the gym. */
const APPROACH_STEP = 0.08

/**
 * Walking straight at you (or back into the gym, still facing you) from `from` to `to` (scales), in the
 * middle of his square, both ends included, `ms` a step.
 */
export function approach(from: number, to: number, ms = 260): IdleStep[] {
  const n = Math.max(1, Math.ceil(Math.abs(to - from) / APPROACH_STEP))
  return Array.from({ length: n + 1 }, (_, i) => {
    const scale = Math.round((from + ((to - from) * i) / n) * 100) / 100
    return { far: { src: { approach: i % 2 === 0 ? 0 : 1 }, facing: 'right', scale, x: centredAt(scale), feet: feetAt(scale) }, ms }
  })
}

/**
 * Up to the camera (owner, 2026-10-12: "he can also be small and walk up to the camera"): he walks out of his
 * square, comes in small at the back, turns to you and walks straight up, bigger every step, till he is up
 * close again, looking at you.
 */
export function upToYou(side: 'left' | 'right'): IdleStep[] {
  const out = side === 'left' ? -16 : 16
  const edge = side === 'left' ? -8 : 16
  return [turned(side, 300), ...walking(side, 0, out), ...backWalk(edge, BACK.x), ...approach(BACK.scale, 1), { pose: 'lookYou', ms: 900 }, { pose: 'wink', ms: 400 }]
}

/** At the back, how many reps of an exercise he does: a few, not the full set he does up close. */
const BACK_REPS = 6

/**
 * Off to the back of the gym (owner, 2026-10-12: "let swolomon like walk in and out of the set, and let him
 * get smaller too like he's walking into the back of the gym to do his workouts"): he walks out of his square,
 * comes in small at the back, does a few reps of `id` there, walks off, and comes back in up close.
 */
export function backOfGym(id: string, side: 'left' | 'right'): IdleStep[] {
  const move = moveById(id)
  if (move === undefined) return []
  const out = side === 'left' ? -16 : 16
  const back = side === 'left' ? 'right' : 'left'
  // Small, he is 8 wide: off the frame on his side, and in the middle of it.
  const edge = side === 'left' ? -8 : 16
  const reps = move.family === 'exercise' ? BACK_REPS : move.reps
  const working: IdleStep[] = movePlay(move, reps).map(([pose, ms]) => ({ far: { src: { move: id, pose }, facing: 'right', scale: BACK.scale, x: BACK.x, feet: BACK.feet }, ms }))
  return [
    turned(side, 300),
    ...walking(side, 0, out),
    ...backWalk(edge, BACK.x),
    ...working,
    ...backWalk(BACK.x, edge),
    ...walking(back, out, 0),
    turned(back, 250),
    { pose: 'lookYou', ms: 700 },
  ]
}
