/**
 * Copyright 2026 zrobok. All rights reserved: not covered by the Apache License (see NOTICE). Swolomon's
 * name, character, likeness and these moves are proprietary.
 *
 * The kit his moves are drawn with (moves.ts and the files beside it): his joints standing front-on and in
 * profile, the arms and legs most poses start from, and the shapes of a move and a gesture. Pure.
 */

import { shift } from './figure'
import type { Expr, Figure, Fx, Limb, P, Prop } from './figure'
import type { Move } from './moves'

// ---------------------------------------------------------------------------------------------------------
// Front-on: standing square to the camera, 6 wide in the tank, shorts, legs apart.

export const SHOULDER_L: P = [4.5, 7]
export const SHOULDER_R: P = [11.5, 7]
export const ARMS_DOWN: [Limb, Limb] = [
  [SHOULDER_L, [3.5, 9.5], [3.5, 11.5]],
  [SHOULDER_R, [12.5, 9.5], [12.5, 11.5]],
]
export const LEGS: [Limb, Limb] = [
  [[6, 12], [6, 14.5]],
  [[10, 12], [10, 14.5]],
]

export type FrontOpts = {
  arms?: [Limb, Limb]
  legs?: [Limb, Limb]
  expr?: Expr
  bare?: boolean
  bicep?: readonly P[]
  props?: readonly Prop[]
  fx?: readonly Fx[]
  x?: number
  y?: number
}

export function front(o: FrontOpts = {}): Figure {
  const [backArm, frontArm] = o.arms ?? ARMS_DOWN
  const [backLeg, frontLeg] = o.legs ?? LEGS
  return shift(
    {
      head: { at: [5, 0], facing: 'front', ...(o.expr === undefined ? {} : { expr: o.expr }), ...(o.bare === true ? { bare: true } : {}) },
      torso: { from: [8, 6], to: [8, 10] },
      shorts: { from: [8, 10], to: [8, 12] },
      backArm,
      frontArm,
      backLeg,
      frontLeg,
      ...(o.bicep === undefined ? {} : { bicep: o.bicep }),
      ...(o.props === undefined ? {} : { props: o.props }),
      ...(o.fx === undefined ? {} : { fx: o.fx }),
    },
    o.x ?? 0,
    o.y ?? 0,
  )
}

/** Both arms the same, mirrored: give the left arm's elbow and hand. */
export const arms = (elbow: P, hand: P): [Limb, Limb] => [
  [SHOULDER_L, elbow, hand],
  [SHOULDER_R, [15 - elbow[0], elbow[1]], [15 - hand[0], hand[1]]],
]

// ---------------------------------------------------------------------------------------------------------
// In profile, facing right: a 4-wide torso from the neck to the hip; the far limbs in shade.

export type SideOpts = {
  head: P
  neck: P
  hip: P
  arms: [Limb, Limb]
  legs: [Limb, Limb]
  expr?: Expr
  props?: readonly Prop[]
  fx?: readonly Fx[]
  /** The shorts' far end; by default a little down the front thigh. */
  seat?: P
}

export function side(o: SideOpts): Figure {
  const knee = o.legs[1][1] ?? o.hip
  const seat = o.seat ?? [o.hip[0] + (knee[0] - o.hip[0]) * 0.45, o.hip[1] + (knee[1] - o.hip[1]) * 0.45]
  return {
    head: { at: o.head, facing: 'right', ...(o.expr === undefined ? {} : { expr: o.expr }) },
    torso: { from: o.neck, to: o.hip, width: 4 },
    shorts: { from: o.hip, to: seat, width: 4 },
    backArm: o.arms[0],
    frontArm: o.arms[1],
    backLeg: o.legs[0],
    frontLeg: o.legs[1],
    ...(o.props === undefined ? {} : { props: o.props }),
    ...(o.fx === undefined ? {} : { fx: o.fx }),
  }
}

export const STAND_SIDE = (o: Partial<SideOpts> = {}): Figure =>
  side({
    head: [5, 0],
    neck: [8, 6],
    hip: [8, 10.5],
    arms: [
      [[7, 7], [6.5, 9.5], [6.5, 11.5]],
      [[9, 7], [9.5, 9.5], [9.5, 11.5]],
    ],
    legs: [
      [[7, 12], [7, 14.5]],
      [[9, 12], [9, 14.5]],
    ],
    seat: [8, 12],
    ...o,
  })

export const beat = (...pairs: [number, number][]) => pairs

/** His right arm (the viewer's right) through an elbow to a hand; the left hangs. */
export const right = (elbow: P, hand: P, left: Limb = ARMS_DOWN[0]): [Limb, Limb] => [left, [SHOULDER_R, elbow, hand]]

/** A gesture of `poses` shown for `ms` each, once. */
export const gesture = (id: string, title: string, poses: Figure[], ms: readonly number[], reps = 1): Move => ({
  id,
  title,
  family: 'gag',
  poses,
  beats: poses.map((_, i) => [i, ms[i] ?? ms.at(-1) ?? 300] as [number, number]),
  reps,
})

/** The hand held out, bobbing a little: waiting on you. */
export const offer = (id: string, title: string, held: [Limb, Limb], expr: Expr = 'grin', other: Partial<FrontOpts> = {}): Move =>
  gesture(`${id}-offer`, title, [front({ arms: held, expr, ...other }), front({ arms: held, expr: 'talk', y: -1, ...other })], [450, 450], 3)

