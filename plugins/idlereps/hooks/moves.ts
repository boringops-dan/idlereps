/**
 * Copyright 2026 zrobok. All rights reserved: not covered by the Apache License (see NOTICE). Swolomon's
 * name, character, likeness and these moves are proprietary.
 *
 * Swolomon's moves (§1.11 Moves): short animations of his whole body in the full portrait's 16 × 16: every
 * exercise in the library demonstrated, his flexes, and his gags. Each move is a few poses and the beats
 * between them, played `reps` times. Pure data, drawn by `figure.ts`.
 */

import { drawFigure, shift, turned } from './figure'
import type { Expr, Figure, Fx, Limb, P, Prop } from './figure'

export type MoveFamily = 'exercise' | 'flex' | 'gag'

export type Move = {
  id: string
  /** What it is, as the person would say it. */
  title: string
  family: MoveFamily
  poses: readonly Figure[]
  /** Which pose shows for how long (ms), in order; the whole list plays `reps` times. */
  beats: readonly (readonly [number, number])[]
  reps: number
}

// ---------------------------------------------------------------------------------------------------------
// Front-on: standing square to the camera, 6 wide in the tank, shorts, legs apart.

const SHOULDER_L: P = [4.5, 7]
const SHOULDER_R: P = [11.5, 7]
const ARMS_DOWN: [Limb, Limb] = [
  [SHOULDER_L, [3.5, 9.5], [3.5, 11.5]],
  [SHOULDER_R, [12.5, 9.5], [12.5, 11.5]],
]
const LEGS: [Limb, Limb] = [
  [[6, 12], [6, 14.5]],
  [[10, 12], [10, 14.5]],
]

type FrontOpts = {
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

function front(o: FrontOpts = {}): Figure {
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
const arms = (elbow: P, hand: P): [Limb, Limb] => [
  [SHOULDER_L, elbow, hand],
  [SHOULDER_R, [15 - elbow[0], elbow[1]], [15 - hand[0], hand[1]]],
]

// ---------------------------------------------------------------------------------------------------------
// In profile, facing right: a 4-wide torso from the neck to the hip; the far limbs in shade.

type SideOpts = {
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

function side(o: SideOpts): Figure {
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

const STAND_SIDE = (o: Partial<SideOpts> = {}): Figure =>
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

const beat = (...pairs: [number, number][]) => pairs

// ---------------------------------------------------------------------------------------------------------
// Exercises.

const squat: Move = {
  id: 'squat',
  title: 'Squats',
  family: 'exercise',
  poses: [
    STAND_SIDE({
      arms: [
        [[7.5, 7], [10, 7.5], [13, 7.5]],
        [[8.5, 7], [11, 7.5], [14, 7.5]],
      ],
    }),
    side({
      head: [6, 3],
      neck: [8, 9],
      hip: [5, 12],
      arms: [
        [[8, 10], [11, 9.5], [14, 9.5]],
        [[9, 10], [12, 10], [15, 10]],
      ],
      legs: [
        [[5, 12.5], [9, 12.5], [8, 14.5]],
        [[6, 13], [10, 13], [9, 14.5]],
      ],
      expr: 'strain',
    }),
  ],
  beats: beat([0, 450], [1, 650]),
  reps: 4,
}

const pushUp: Move = {
  id: 'push-up',
  title: 'Push-ups',
  family: 'exercise',
  poses: [
    side({
      head: [10, 5],
      neck: [10, 10],
      hip: [5, 11.5],
      arms: [
        [[9.5, 10.5], [10, 13], [10, 15]],
        [[10.5, 10.5], [11, 13], [11, 15]],
      ],
      legs: [
        [[5, 12], [2.5, 13], [0.5, 14]],
        [[5, 11.5], [2.5, 12.5], [0.5, 13.5]],
      ],
      props: [{ kind: 'mat', y: 15 }],
    }),
    side({
      head: [10, 7],
      neck: [10, 12.5],
      hip: [5, 13],
      arms: [
        [[9.5, 13], [8, 14], [10, 15]],
        [[10.5, 13], [9, 14], [11, 15]],
      ],
      legs: [
        [[5, 13.5], [2.5, 14], [0.5, 14.5]],
        [[5, 13], [2.5, 13.5], [0.5, 14]],
      ],
      expr: 'strain',
      props: [{ kind: 'mat', y: 15 }],
    }),
  ],
  beats: beat([0, 450], [1, 550]),
  reps: 4,
}

const PLANK = (dy: number, fx: readonly Fx[] = []): Figure =>
  shift(
    side({
      head: [10, 6],
      neck: [10, 11],
      hip: [5, 12],
      arms: [
        [[9.5, 11.5], [9.5, 14], [12, 14]],
        [[10.5, 11.5], [10.5, 14], [13, 14]],
      ],
      legs: [
        [[5, 12.5], [2.5, 13.5], [0.5, 14.5]],
        [[5, 12], [2.5, 13], [0.5, 14]],
      ],
      expr: 'strain',
      fx,
    }),
    0,
    dy,
  )

const plank: Move = {
  id: 'plank',
  title: 'Plank',
  family: 'exercise',
  poses: [PLANK(0), PLANK(0, [{ kind: 'drop', at: [15, 5] }]), PLANK(0, [{ kind: 'sweat', at: [15, 6] }, { kind: 'drop', at: [9, 4] }]), { ...PLANK(0), props: [] }],
  beats: beat([0, 400], [1, 120], [0, 120], [1, 120], [2, 600]),
  reps: 3,
}

const lunge: Move = {
  id: 'lunge',
  title: 'Lunges',
  family: 'exercise',
  poses: [
    STAND_SIDE(),
    side({
      head: [5, 3],
      neck: [8, 9],
      hip: [7.5, 12],
      arms: [
        [[7.5, 10], [7, 12], [7, 13.5]],
        [[8.5, 10], [9, 12], [9, 13.5]],
      ],
      legs: [
        [[7, 12.5], [4, 14.5], [1, 14.5]],
        [[8.5, 12.5], [12, 12.5], [12, 14.5]],
      ],
      seat: [8.5, 13],
      expr: 'strain',
    }),
  ],
  beats: beat([0, 450], [1, 700]),
  reps: 3,
}

const jumpingJacks: Move = {
  id: 'jumping-jacks',
  title: 'Jumping jacks',
  family: 'exercise',
  poses: [
    front(),
    front({
      y: -1,
      arms: arms([2, 5], [1.5, 2]),
      legs: [
        [[6, 12], [4, 14.5]],
        [[10, 12], [12, 14.5]],
      ],
      expr: 'talk',
    }),
  ],
  beats: beat([0, 280], [1, 280]),
  reps: 6,
}

const DUMBBELL_HOLD = (hands: [P, P], expr?: Expr): Figure =>
  front({
    arms: [
      [SHOULDER_L, [3.5, 9.5], hands[0]],
      [SHOULDER_R, [12.5, 9.5], hands[1]],
    ],
    props: [
      { kind: 'dumbbell', at: hands[0] },
      { kind: 'dumbbell', at: hands[1] },
    ],
    ...(expr === undefined ? {} : { expr }),
  })

const curl: Move = {
  id: 'curl',
  title: 'Curls',
  family: 'exercise',
  poses: [
    DUMBBELL_HOLD([
      [3.5, 12],
      [12.5, 12],
    ]),
    front({
      arms: [
        [SHOULDER_L, [3.5, 9.5], [4, 6.5]],
        [SHOULDER_R, [12.5, 9.5], [12, 6.5]],
      ],
      bicep: [
        [3.2, 8],
        [12.8, 8],
      ],
      props: [
        { kind: 'dumbbell', at: [4, 6] },
        { kind: 'dumbbell', at: [12, 6] },
      ],
      expr: 'strain',
    }),
  ],
  beats: beat([0, 450], [1, 550]),
  reps: 4,
}

const press: Move = {
  id: 'press',
  title: 'Overhead press',
  family: 'exercise',
  poses: [
    front({
      arms: arms([2, 8], [2.5, 5.5]),
      props: [
        { kind: 'dumbbell', at: [2.5, 5], upright: true },
        { kind: 'dumbbell', at: [12.5, 5], upright: true },
      ],
    }),
    front({
      arms: arms([2.5, 4], [3, 1.5]),
      props: [
        { kind: 'dumbbell', at: [3, 1], upright: true },
        { kind: 'dumbbell', at: [12, 1], upright: true },
      ],
      expr: 'strain',
    }),
  ],
  beats: beat([0, 450], [1, 550]),
  reps: 4,
}

const pullUp: Move = {
  id: 'pull-up',
  title: 'Pull-ups',
  family: 'exercise',
  poses: [
    front({
      y: 3,
      arms: arms([4, 0], [5, -2]),
      legs: [
        [[6, 12], [7, 14]],
        [[10, 12], [9, 14]],
      ],
      props: [{ kind: 'bar', y: 0 }],
    }),
    front({
      y: 1,
      arms: arms([2.5, 4], [5, 0]),
      legs: [
        [[6, 12], [7, 14]],
        [[10, 12], [9, 14]],
      ],
      bicep: [
        [3.5, 5],
        [12.5, 5],
      ],
      expr: 'strain',
      props: [{ kind: 'bar', y: 0 }],
    }),
  ],
  beats: beat([0, 500], [1, 600]),
  reps: 3,
}

const row: Move = {
  id: 'row',
  title: 'Rows',
  family: 'exercise',
  poses: [
    side({
      head: [10, 3],
      neck: [10, 8.5],
      hip: [5, 10.5],
      arms: [
        [[9.5, 9], [10, 11.5], [10, 13]],
        [[10.5, 9], [11, 11.5], [11, 13.5]],
      ],
      legs: [
        [[5, 11], [6, 13], [5, 14.5]],
        [[6, 11], [8, 12.5], [7, 14.5]],
      ],
      props: [{ kind: 'dumbbell', at: [11, 14] }],
    }),
    side({
      head: [10, 3],
      neck: [10, 8.5],
      hip: [5, 10.5],
      arms: [
        [[9.5, 9], [10, 11.5], [10, 13]],
        [[10.5, 9], [8, 8.5], [9, 10.5]],
      ],
      legs: [
        [[5, 11], [6, 13], [5, 14.5]],
        [[6, 11], [8, 12.5], [7, 14.5]],
      ],
      expr: 'strain',
      props: [{ kind: 'dumbbell', at: [9, 11] }],
    }),
  ],
  beats: beat([0, 450], [1, 550]),
  reps: 4,
}

const deadlift: Move = {
  id: 'deadlift',
  title: 'Deadlifts',
  family: 'exercise',
  poses: [
    side({
      head: [10, 4],
      neck: [10, 9.5],
      hip: [5, 9.5],
      arms: [
        [[9.5, 10], [10, 12], [10, 14]],
        [[10.5, 10], [11, 12], [11, 14]],
      ],
      legs: [
        [[5, 10.5], [6.5, 12.5], [6, 14.5]],
        [[6, 10.5], [7.5, 12.5], [7, 14.5]],
      ],
      props: [{ kind: 'barbell', at: [10.5, 14], half: 5 }],
    }),
    STAND_SIDE({
      arms: [
        [[7.5, 7], [8, 9.5], [8.5, 11.5]],
        [[8.5, 7], [9, 9.5], [9.5, 11.5]],
      ],
      expr: 'strain',
      props: [{ kind: 'barbell', at: [9, 11.5], half: 5 }],
    }),
  ],
  beats: beat([0, 500], [1, 650]),
  reps: 3,
}

const BRIDGE = (isUp: boolean): Figure =>
  side({
    head: [10, 9],
    neck: [10.5, 14],
    hip: isUp ? [6, 10.5] : [6, 14],
    arms: [
      [[10, 14], [8, 14.5], [6, 14.5]],
      [[11, 14], [9, 14.5], [7, 14.5]],
    ],
    legs: isUp
      ? [
          [[6, 11], [3, 10.5], [2, 14.5]],
          [[6, 10.5], [3, 10], [2.5, 14.5]],
        ]
      : [
          [[6, 14], [3.5, 10.5], [1.5, 14.5]],
          [[6, 13.5], [4, 10], [2, 14.5]],
        ],
    seat: isUp ? [4.5, 10.5] : [5, 12.5],
    props: [{ kind: 'mat', y: 15 }],
    ...(isUp ? { expr: 'strain' as const } : {}),
  })

const bridge: Move = {
  id: 'bridge',
  title: 'Glute bridges',
  family: 'exercise',
  poses: [BRIDGE(false), BRIDGE(true)],
  beats: beat([0, 450], [1, 600]),
  reps: 4,
}

const calfRaise: Move = {
  id: 'calf-raise',
  title: 'Calf raises',
  family: 'exercise',
  poses: [
    front(),
    front({
      y: -1,
      legs: [
        [[6, 12], [6, 14.5]],
        [[10, 12], [10, 14.5]],
      ],
      expr: 'smirk',
    }),
  ],
  beats: beat([0, 350], [1, 350]),
  reps: 5,
}

const DIP = (y: number, elbow: number, expr?: Expr): Figure =>
  side({
    head: [7, y - 5],
    neck: [8, y],
    hip: [7.5, y + 4],
    arms: [
      [[7.5, y + 0.5], [5, elbow], [3, 9]],
      [[8.5, y + 0.5], [6, elbow], [4, 9]],
    ],
    legs: [
      [[7, y + 4.5], [11, y + 4.5], [12, 14.5]],
      [[8, y + 4.5], [12, y + 4.5], [13, 14.5]],
    ],
    props: [{ kind: 'chair', at: [0, 9] }],
    ...(expr === undefined ? {} : { expr }),
  })

const dip: Move = {
  id: 'dip',
  title: 'Chair dips',
  family: 'exercise',
  poses: [DIP(6, 8, undefined), DIP(8.5, 8.5, 'strain')],
  beats: beat([0, 450], [1, 600]),
  reps: 4,
}

const burpee: Move = {
  id: 'burpee',
  title: 'Burpees',
  family: 'exercise',
  poses: [
    STAND_SIDE(),
    squat.poses[1] ?? STAND_SIDE(),
    PLANK(0),
    front({ y: -2, arms: arms([2, 5], [2, 2]), expr: 'talk', fx: [{ kind: 'star', at: [1, 0] }, { kind: 'star', at: [14, 1] }] }),
  ],
  beats: beat([0, 300], [1, 300], [2, 350], [1, 300], [3, 450]),
  reps: 2,
}

const WALL_SIT = (fx: readonly Fx[], dx: number): Figure =>
  shift(
    side({
      head: [2, 4],
      neck: [3, 9],
      hip: [3, 12.5],
      arms: [
        [[3, 9.5], [5, 11], [6.5, 12]],
        [[4, 9.5], [6, 11], [7.5, 12]],
      ],
      legs: [
        [[3, 13], [8, 13], [8, 14.5]],
        [[3.5, 12.5], [9, 12.5], [9, 14.5]],
      ],
      seat: [6, 12.8],
      expr: 'strain',
      fx,
      props: [{ kind: 'wall', x: 0 }],
    }),
    dx,
    0,
  )

const wallSit: Move = {
  id: 'wall-sit',
  title: 'Wall sit',
  family: 'exercise',
  poses: [WALL_SIT([], 0), WALL_SIT([{ kind: 'drop', at: [9, 3] }], 0), WALL_SIT([{ kind: 'sweat', at: [9, 4] }, { kind: 'drop', at: [1, 2] }], 0)],
  beats: beat([0, 500], [1, 150], [0, 150], [1, 150], [2, 700]),
  reps: 2,
}

const sideBend: Move = {
  id: 'side-bend',
  title: 'Side bends',
  family: 'exercise',
  poses: [
    front({ arms: arms([2.5, 4], [5, 1]) }),
    {
      ...front({ arms: [[SHOULDER_L, [3, 9.5], [3, 12]], [SHOULDER_R, [13, 4], [10, 1]]] }),
      head: { at: [4, 1], facing: 'front', expr: 'blink' },
      torso: { from: [7.5, 6.5], to: [8, 10] },
    },
    {
      ...front({ arms: [[SHOULDER_L, [3, 4], [6, 1]], [SHOULDER_R, [13, 9.5], [13, 12]]] }),
      head: { at: [6, 1], facing: 'front', expr: 'blink' },
      torso: { from: [8.5, 6.5], to: [8, 10] },
    },
  ],
  beats: beat([0, 400], [1, 600], [0, 300], [2, 600]),
  reps: 2,
}

const pullApart: Move = {
  id: 'band-pull-apart',
  title: 'Band pull-aparts',
  family: 'exercise',
  poses: [
    front({
      arms: [
        [SHOULDER_L, [5, 8.5], [6.5, 8]],
        [SHOULDER_R, [11, 8.5], [9.5, 8]],
      ],
      props: [{ kind: 'band', from: [6.5, 8], to: [9.5, 8] }],
    }),
    front({
      arms: arms([1.5, 7.5], [0.5, 8]),
      props: [{ kind: 'band', from: [0.5, 8], to: [15.5, 8] }],
      expr: 'strain',
    }),
  ],
  beats: beat([0, 450], [1, 550]),
  reps: 4,
}

const SUPERMAN = (lift: number, expr?: Expr): Figure =>
  side({
    head: [10, 9 - lift],
    neck: [10, 13.5],
    hip: [5, 14],
    arms: [
      [[10.5, 13.5], [13, 13.5 - lift], [15, 13 - lift]],
      [[10.5, 13.5], [13, 14 - lift], [15, 13.5 - lift]],
    ],
    legs: [
      [[5, 14], [2.5, 14], [0.5, 13.5 - lift]],
      [[5, 14.5], [2.5, 14.5], [0.5, 14 - lift]],
    ],
    seat: [3.5, 14.2],
    props: [{ kind: 'mat', y: 15 }],
    ...(expr === undefined ? {} : { expr }),
  })

const superman: Move = {
  id: 'superman',
  title: 'Superman hold',
  family: 'exercise',
  poses: [SUPERMAN(0), SUPERMAN(2, 'strain')],
  beats: beat([0, 500], [1, 900]),
  reps: 3,
}

const march: Move = {
  id: 'march',
  title: 'March in place',
  family: 'exercise',
  poses: [
    front({
      legs: [
        [[6, 12], [5, 10.5], [5.5, 13]],
        [[10, 12], [10, 14.5]],
      ],
      arms: [
        [SHOULDER_L, [3.5, 9.5], [3.5, 11.5]],
        [SHOULDER_R, [13, 8.5], [12, 6]],
      ],
    }),
    front({
      legs: [
        [[6, 12], [6, 14.5]],
        [[10, 12], [11, 10.5], [10.5, 13]],
      ],
      arms: [
        [SHOULDER_L, [3, 8.5], [4, 6]],
        [SHOULDER_R, [12.5, 9.5], [12.5, 11.5]],
      ],
    }),
  ],
  beats: beat([0, 300], [1, 300]),
  reps: 6,
}

const stretch: Move = {
  id: 'stretch',
  title: 'Hamstring stretch',
  family: 'exercise',
  poses: [
    STAND_SIDE({
      arms: [
        [[7.5, 7], [7.5, 4], [7.5, 1.5]],
        [[8.5, 7], [8.5, 4], [8.5, 1.5]],
      ],
      expr: 'blink',
    }),
    side({
      head: [10, 8],
      neck: [9.5, 11],
      hip: [6, 10],
      arms: [
        [[9.5, 11.5], [10, 13], [10, 14.5]],
        [[10, 11.5], [10.5, 13], [10.5, 14.5]],
      ],
      legs: [
        [[6, 10.5], [6.5, 12.5], [7, 14.5]],
        [[6.5, 10.5], [7.5, 12.5], [8, 14.5]],
      ],
      seat: [5.5, 10.8],
      expr: 'blink',
    }),
  ],
  beats: beat([0, 700], [1, 1200]),
  reps: 2,
}

/** On his back, arms up and knees up; `reach`: one arm overhead and the other side's leg out long. */
const DEAD_BUG = (reach: boolean): Figure =>
  side({
    head: [10, 9],
    neck: [11, 14],
    hip: [5, 14],
    arms: [
      [[10.5, 14], [10.5, 10], [10.5, 6]],
      reach ? [[11.5, 14], [13.5, 13], [15.5, 12.5]] : [[11.5, 14], [11.5, 10], [11.5, 6]],
    ],
    legs: [
      [[5, 14], [5, 10], [3, 7]],
      reach ? [[5.5, 14], [3, 13.5], [0.5, 13]] : [[5.5, 14], [5.5, 10], [3.5, 7]],
    ],
    seat: [5, 12.5],
    props: [{ kind: 'mat', y: 15 }],
    expr: 'strain',
  })

const deadBug: Move = {
  id: 'dead-bug',
  title: 'Dead bugs',
  family: 'exercise',
  poses: [DEAD_BUG(false), DEAD_BUG(true)],
  beats: beat([0, 500], [1, 500]),
  reps: 4,
}

// ---------------------------------------------------------------------------------------------------------
// Flexes and wins.

const DOUBLE_BICEPS = arms([1.5, 6.5], [1.5, 3])
const doubleBiceps: Move = {
  id: 'double-biceps',
  title: 'Double biceps',
  family: 'flex',
  poses: [
    front({ arms: DOUBLE_BICEPS, bicep: [[2.5, 5.8], [12.5, 5.8]] }),
    front({ arms: DOUBLE_BICEPS, bicep: [[2.5, 5.5], [12.5, 5.5]], expr: 'wink', fx: [{ kind: 'sparkle', at: [0, 0] }, { kind: 'sparkle', at: [13, 9] }] }),
  ],
  beats: beat([0, 500], [1, 700]),
  reps: 3,
}

const mostMuscular: Move = {
  id: 'most-muscular',
  title: 'Most muscular',
  family: 'flex',
  poses: [
    front(),
    front({
      y: 1,
      arms: [
        [SHOULDER_L, [3, 10], [6.5, 11]],
        [SHOULDER_R, [13, 10], [9.5, 11]],
      ],
      bicep: [[3.5, 8.5], [12.5, 8.5]],
      expr: 'strain',
      fx: [{ kind: 'puff', at: [0, 1] }, { kind: 'puff', at: [13, 1] }],
    }),
  ],
  beats: beat([0, 400], [1, 900]),
  reps: 3,
}

const kissBicep: Move = {
  id: 'kiss-bicep',
  title: 'Kiss the gun',
  family: 'flex',
  poses: [
    front({ arms: [ARMS_DOWN[0], [SHOULDER_R, [14.5, 6.5], [14.5, 3]]], bicep: [[13.5, 5.8]] }),
    {
      ...front({ arms: [ARMS_DOWN[0], [SHOULDER_R, [14.5, 6.5], [14.5, 3]]], bicep: [[13.5, 5.8]] }),
      head: { at: [6, 0], facing: 'right', expr: 'o' },
      fx: [{ kind: 'heart', at: [12, 0] }],
    },
  ],
  beats: beat([0, 500], [1, 800]),
  reps: 2,
}

const latSpread: Move = {
  id: 'lat-spread',
  title: 'Lat spread',
  family: 'flex',
  poses: [
    front(),
    {
      ...front({ arms: arms([2, 9.5], [5, 10.5]), expr: 'smirk' }),
      torso: { from: [8, 6], to: [8, 10], width: 9 },
      fx: [{ kind: 'sparkle', at: [0, 1] }],
    },
  ],
  beats: beat([0, 400], [1, 900]),
  reps: 3,
}

const trophy: Move = {
  id: 'trophy',
  title: 'Trophy lift',
  family: 'flex',
  poses: [
    front({ arms: arms([3, 9], [6, 10]), props: [{ kind: 'trophy', at: [5.5, 7] }] }),
    front({
      arms: [
        [SHOULDER_L, [2, 5], [1.5, 2]],
        [SHOULDER_R, [13.5, 5], [13, 3]],
      ],
      props: [{ kind: 'trophy', at: [11, 0] }],
      expr: 'talk',
      fx: [{ kind: 'sparkle', at: [0, 0] }],
    }),
  ],
  beats: beat([0, 500], [1, 900]),
  reps: 3,
}

const laurelToss: Move = {
  id: 'laurel-toss',
  title: 'Laurel toss',
  family: 'flex',
  poses: [
    front({ arms: [ARMS_DOWN[0], [SHOULDER_R, [12, 4], [8, 0.5]]], bare: true, props: [{ kind: 'laurel', at: [5, 0] }] }),
    front({ y: 2, arms: [ARMS_DOWN[0], [SHOULDER_R, [13, 4], [12, 1]]], bare: true, expr: 'o', props: [{ kind: 'laurel', at: [5, -2] }] }),
    front({ y: 2, arms: arms([2, 9], [1, 7]), bare: true, expr: 'o', props: [{ kind: 'laurel', at: [5, -1] }] }),
    front({ arms: arms([1.5, 6.5], [1.5, 3]), bicep: [[2.5, 5.8], [12.5, 5.8]], expr: 'wink', fx: [{ kind: 'star', at: [3, 0] }, { kind: 'star', at: [12, 0] }] }),
  ],
  beats: beat([0, 350], [1, 450], [2, 350], [3, 900]),
  reps: 2,
}

const victoryJump: Move = {
  id: 'victory-jump',
  title: 'Victory jump',
  family: 'flex',
  poses: [
    front({ y: 1, legs: [[[6, 12], [5, 13], [6, 14.5]], [[10, 12], [11, 13], [10, 14.5]]], arms: arms([3, 10], [4, 12]) }),
    front({
      y: -2,
      arms: arms([2, 4], [1.5, 1]),
      legs: [
        [[6, 12], [4.5, 14.5]],
        [[10, 12], [11.5, 14.5]],
      ],
      expr: 'talk',
      fx: [{ kind: 'star', at: [0, 3] }, { kind: 'star', at: [15, 2] }, { kind: 'star', at: [2, 12] }],
    }),
  ],
  beats: beat([0, 300], [1, 500]),
  reps: 3,
}

// ---------------------------------------------------------------------------------------------------------
// Gags.

const proteinShake: Move = {
  id: 'protein-shake',
  title: 'Protein shake',
  family: 'gag',
  poses: [
    front({ arms: [ARMS_DOWN[0], [SHOULDER_R, [13.5, 8], [13, 5]]], props: [{ kind: 'shake', at: [13, 2] }] }),
    front({ arms: [ARMS_DOWN[0], [SHOULDER_R, [13.5, 7], [14, 4]]], props: [{ kind: 'shake', at: [14, 1] }], fx: [{ kind: 'puff', at: [12, 0] }] }),
    {
      ...front({ arms: [ARMS_DOWN[0], [SHOULDER_R, [12.5, 5], [10, 3]]], props: [{ kind: 'shake', at: [10, 1] }] }),
      head: { at: [5, 1], facing: 'front', expr: 'blink' },
    },
    front({ arms: ARMS_DOWN, expr: 'grin', fx: [{ kind: 'sparkle', at: [0, 2] }] }),
  ],
  beats: beat([0, 200], [1, 200], [0, 200], [1, 200], [2, 900], [3, 600]),
  reps: 1,
}

const NAP = (fx: readonly Fx[]): Figure =>
  side({
    head: [10, 9],
    neck: [11, 14],
    hip: [5, 14],
    arms: [
      [[10.5, 14], [8, 13.5], [6, 13]],
      [[11.5, 14], [9, 13.5], [7, 13]],
    ],
    legs: [
      [[5, 14], [2.5, 14], [0.5, 14]],
      [[5, 14.5], [2.5, 14.5], [0.5, 14.5]],
    ],
    seat: [3.5, 14.2],
    expr: 'sleep',
    fx,
    props: [{ kind: 'mat', y: 15 }],
  })

const nap: Move = {
  id: 'nap',
  title: 'Rest day nap',
  family: 'gag',
  poses: [NAP([]), NAP([{ kind: 'zzz', at: [12, 4] }]), NAP([{ kind: 'zzz', at: [13, 1] }, { kind: 'drop', at: [11, 6] }])],
  beats: beat([0, 600], [1, 600], [2, 600]),
  reps: 2,
}

const dance: Move = {
  id: 'dance',
  title: 'Gym floor dance',
  family: 'gag',
  poses: [
    front({ x: -2, arms: [[SHOULDER_L, [2, 5], [3, 2]], [SHOULDER_R, [13, 9], [11, 11]]], legs: [[[6, 12], [5, 14.5]], [[10, 12], [10, 14.5]]], fx: [{ kind: 'note', at: [13, 1] }] }),
    front({ x: 2, arms: [[SHOULDER_L, [3, 9], [5, 11]], [SHOULDER_R, [14, 5], [13, 2]]], legs: [[[6, 12], [6, 14.5]], [[10, 12], [11, 14.5]]], expr: 'wink', fx: [{ kind: 'note', at: [0, 2] }] }),
  ],
  beats: beat([0, 350], [1, 350]),
  reps: 4,
}

const PR = (y: number, expr: Expr, fx: readonly Fx[] = []): Figure =>
  front({
    arms: arms([3, y + 2.5], [1.5, y]),
    props: [{ kind: 'barbell', at: [7.5, y], half: 7.5 }],
    expr,
    fx,
  })

const personalBest: Move = {
  id: 'personal-best',
  title: 'New personal best',
  family: 'gag',
  poses: [
    front({ y: 1, arms: arms([3, 10], [2, 12]), props: [{ kind: 'barbell', at: [7.5, 12.5], half: 7.5 }], expr: 'strain' }),
    front({ y: 1, arms: arms([3, 10], [2, 12]), props: [{ kind: 'barbell', at: [7.5, 12.5], half: 7.5 }], expr: 'strain', fx: [{ kind: 'sweat', at: [11, 1] }] }),
    PR(6, 'strain', [{ kind: 'sweat', at: [11, 1] }]),
    PR(1.5, 'talk', [{ kind: 'sparkle', at: [0, 3] }, { kind: 'sparkle', at: [13, 3] }]),
  ],
  beats: beat([0, 300], [1, 300], [0, 300], [2, 400], [3, 900]),
  reps: 1,
}

const moonwalk: Move = {
  id: 'moonwalk',
  title: 'Moonwalk',
  family: 'gag',
  poses: [0, 1, 2, 3].map(i =>
    turned(
      shift(
        STAND_SIDE({
          legs:
            i % 2 === 0
              ? [
                  [[7, 12], [6, 14.5]],
                  [[9, 12], [10, 14]],
                ]
              : [
                  [[7, 12], [8, 14]],
                  [[9, 12], [8, 14.5]],
                ],
          expr: 'smirk',
          fx: i === 3 ? [{ kind: 'sparkle', at: [12, 0] }] : [],
        }),
        i - 2,
        0,
      ),
    ),
  ),
  beats: beat([0, 300], [1, 300], [2, 300], [3, 600]),
  reps: 2,
}

/** Every move, exercises first. */
export const MOVES: readonly Move[] = [
  squat,
  pushUp,
  plank,
  lunge,
  jumpingJacks,
  curl,
  press,
  pullUp,
  row,
  deadlift,
  bridge,
  calfRaise,
  dip,
  burpee,
  wallSit,
  sideBend,
  pullApart,
  superman,
  march,
  stretch,
  deadBug,
  doubleBiceps,
  mostMuscular,
  kissBicep,
  latSpread,
  trophy,
  laurelToss,
  victoryJump,
  proteinShake,
  nap,
  dance,
  personalBest,
  moonwalk,
]

export type MoveId = string

export function moveById(id: MoveId): Move | undefined {
  return MOVES.find(move => move.id === id)
}

/** Each move's poses drawn once: 16 rows of palette characters each. */
export const drawMove = (move: Move): string[][] => move.poses.map(drawFigure)

/**
 * The exercise a set names, demonstrated: matched on the words in its name, most specific first, so every
 * exercise in the library (and most written by hand) has its move. Null for a name nothing matches.
 */
const BY_NAME: readonly [RegExp, MoveId][] = [
  [/wall sit/i, 'wall-sit'],
  [/burpee/i, 'burpee'],
  [/dead ?bug/i, 'dead-bug'],
  [/plank/i, 'plank'],
  [/push-?ups?|press-?ups?/i, 'push-up'],
  [/pull-?ups?|chin-?ups?|dead hang|hang/i, 'pull-up'],
  [/deadlift|good morning|hinge/i, 'deadlift'],
  [/squat/i, 'squat'],
  [/lunge|split squat|step-?up/i, 'lunge'],
  [/jumping jack|jack/i, 'jumping-jacks'],
  [/curl/i, 'curl'],
  [/triceps|extension|press/i, 'press'],
  [/pull-?apart|y-raise|wall angel|face pull/i, 'band-pull-apart'],
  [/row/i, 'row'],
  [/bridge|hip thrust|kickback/i, 'bridge'],
  [/calf/i, 'calf-raise'],
  [/dip/i, 'dip'],
  [/superman|snow angel/i, 'superman'],
  [/march|high knee|knee-to-elbow|jog/i, 'march'],
  [/side bend|twist|rotation|oblique/i, 'side-bend'],
  [/stretch|cat-cow|roll|opener|mobility|yoga|reach/i, 'stretch'],
]

export function moveForExercise(name: string): MoveId | null {
  return BY_NAME.find(([pattern]) => pattern.test(name))?.[1] ?? null
}

/** How long one play of a move takes, every rep. */
export const moveMs = (move: Move): number => move.reps * move.beats.reduce((ms, [, length]) => ms + length, 0)

/** The pose showing `t` ms into a move, or null once it has played out. */
export function poseAt(move: Move, t: number): number | null {
  const once = move.beats.reduce((ms, [, length]) => ms + length, 0)
  if (t < 0 || t >= once * move.reps) return null
  let rest = t % once
  for (const [pose, length] of move.beats) {
    if (rest < length) return pose
    rest -= length
  }
  return null
}
