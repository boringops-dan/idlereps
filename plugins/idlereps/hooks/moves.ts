/**
 * Copyright 2026 zrobok. All rights reserved: not covered by the Apache License (see NOTICE). Swolomon's
 * name, character, likeness and these moves are proprietary.
 *
 * Swolomon's moves (§1.11 Moves): short animations of his whole body in the full portrait's 16 × 16: every
 * exercise in the library demonstrated, his flexes, and his gags. Each move is a few poses and the beats
 * between them, played `reps` times. Pure data, drawn by `figure.ts`.
 */

import { drawFigure, shift, turned } from './figure'
import { ARMS_DOWN, arms, beat, front, gesture, offer, right, SHOULDER_L, SHOULDER_R, side, STAND_SIDE } from './move-kit'
import type { Outfit } from './season'
import { MORE_CELEBRATION_MOVES } from './celebrations-more'
import { EXISTING_DEMO_BY_NAME, EXISTING_DEMOS } from './demos-existing'
import { NEW_A_DEMO_BY_NAME, NEW_A_DEMOS } from './demos-new-a'
import { NEW_B_DEMO_BY_NAME, NEW_B_DEMOS } from './demos-new-b'
import { MORE_MOVES } from './moves-more'
import type { Expr, Figure, Fx, P } from './figure'

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
  ...MORE_MOVES,
]

/**
 * His gestures: moves that are not collected, played for a moment with you (owner, 2026-10-03: "after a
 * logged set, press h and he high-fives straight out of the screen").
 */
const highFive: Move = {
  id: 'high-five',
  title: 'High five',
  family: 'gag',
  poses: [
    front({ arms: [ARMS_DOWN[0], [SHOULDER_R, [13.5, 4.5], [13.5, 1.5]]], expr: 'grin' }),
    front({ y: -1, arms: [ARMS_DOWN[0], [SHOULDER_R, [13.5, 4.5], [13.5, 1.5]]], expr: 'talk', fx: [{ kind: 'star', at: [11, 1] }, { kind: 'star', at: [15, 3] }] }),
    front({ arms: [ARMS_DOWN[0], [SHOULDER_R, [13.5, 4.5], [13.5, 1.5]]], expr: 'wink', fx: [{ kind: 'sparkle', at: [0, 1] }] }),
  ],
  beats: beat([0, 400], [1, 300], [2, 900]),
  reps: 1,
}

/** A hug, the only kind he knows: arms wide, then wrapped around himself, eyes shut, for you. */
const hug: Move = {
  id: 'hug',
  title: 'Hug',
  family: 'gag',
  poses: [
    front({ arms: arms([2.5, 6], [0.5, 4.5]), expr: 'grin' }),
    front({
      arms: [
        [SHOULDER_L, [6, 9.5], [10.5, 8]],
        [SHOULDER_R, [10, 9.5], [5.5, 8]],
      ],
      expr: 'blink',
      fx: [{ kind: 'heart', at: [13, 1] }],
    }),
  ],
  beats: beat([0, 600], [1, 1400]),
  reps: 1,
}

/** Stuck on his last rep, shaking: the weights halfway up, straining, sweating. Spot him. */
const struggle: Move = {
  id: 'struggle',
  title: 'Last rep',
  family: 'gag',
  poses: [0, 1].map(x =>
    front({
      x,
      arms: arms([2, 6.5], [2.5, 3.5]),
      expr: 'strain',
      props: [
        { kind: 'dumbbell', at: [2.5, 3], upright: true },
        { kind: 'dumbbell', at: [12.5, 3], upright: true },
      ],
      fx: x === 0 ? [{ kind: 'sweat', at: [11, 2] }] : [{ kind: 'drop', at: [4, 4] }],
    }),
  ),
  beats: beat([0, 150], [1, 150]),
  reps: 6,
}

// ---------------------------------------------------------------------------------------------------------
// Celebrations (owner, 2026-10-06: "celebrations after every set, high fives, good jobs, head pats, confetti,
// every single stereotypical thing you can think of and then 10 more"). An offered one is two gestures: the
// hand held out (`-offer`), and the contact once you take it. The rest he just does, at you.

const UP = right([13.5, 4.5], [13.5, 1.5])
const LOW = right([13.5, 9.5], [14.5, 12.5])
const SIDE = right([13.5, 7], [15, 6.5])
const TEN = arms([2.5, 4.5], [2.5, 1.5])
const SEVEN = right([13.5, 4.5], [13.5, 1.5], [SHOULDER_L, [2.5, 8.5], [2, 6.5]])
const FIST = right([13.5, 9], [11, 8.5])
const ELBOW = right([14.5, 6], [11, 3.5])
const CHEST_BACK = arms([2.5, 9], [1.5, 11.5])
const AIR = right([14, 4], [15, 1])
const PAT = right([14, 9], [14.5, 12])
const PINKY = right([13.5, 7.5], [12.5, 4.5])

const lowFive = gesture('low-five', 'Low five', [front({ arms: LOW, expr: 'grin', y: 1 }), front({ arms: LOW, expr: 'talk', y: 1, fx: [{ kind: 'star', at: [13, 14] }, { kind: 'star', at: [15, 12] }] }), front({ arms: LOW, expr: 'wink' })], [350, 350, 900])
const sideFive = gesture('side-five', 'Side five', [front({ arms: SIDE, expr: 'grin' }), front({ arms: SIDE, expr: 'talk', x: 1, fx: [{ kind: 'star', at: [15, 5] }, { kind: 'star', at: [15, 8] }] }), front({ arms: SIDE, expr: 'wink' })], [350, 350, 900])
const gimmeTen = gesture('gimme-ten', 'Gimme ten', [front({ arms: TEN, expr: 'grin' }), front({ arms: TEN, expr: 'talk', y: -1, fx: [{ kind: 'star', at: [1, 0] }, { kind: 'star', at: [14, 0] }, { kind: 'sparkle', at: [0, 3] }, { kind: 'sparkle', at: [13, 3] }] }), front({ arms: TEN, expr: 'wink' })], [350, 400, 900])
const gimmeSeven = gesture('gimme-seven', 'Gimme seven', [front({ arms: SEVEN, expr: 'o' }), front({ arms: SEVEN, expr: 'talk', fx: [{ kind: 'star', at: [14, 0] }] }), front({ arms: arms([2.5, 8.5], [1.5, 7]), expr: 'smirk' })], [400, 400, 1000])
const fistBump = gesture('fist-bump', 'Fist bump', [front({ arms: FIST, expr: 'grin' }), front({ arms: FIST, expr: 'talk', fx: [{ kind: 'puff', at: [9, 8] }] }), front({ arms: right([14, 5], [15, 3]), expr: 'o', fx: [{ kind: 'sparkle', at: [12, 0] }, { kind: 'star', at: [15, 6] }] })], [350, 300, 900])
const elbowBump = gesture('elbow-bump', 'Elbow bump', [front({ arms: ELBOW, expr: 'smirk' }), front({ arms: ELBOW, expr: 'talk', x: 1, fx: [{ kind: 'star', at: [15, 5] }] }), front({ arms: ELBOW, expr: 'wink' })], [400, 350, 900])
const chestBump = gesture('chest-bump', 'Chest bump', [front({ arms: CHEST_BACK, expr: 'grin', y: 1 }), front({ arms: CHEST_BACK, expr: 'talk', y: -2, fx: [{ kind: 'puff', at: [6, 13] }, { kind: 'star', at: [2, 6] }, { kind: 'star', at: [13, 6] }] }), front({ arms: CHEST_BACK, expr: 'strain', y: 1 }), front({ expr: 'grin' })], [300, 350, 300, 700])
const airFive = gesture('air-five', 'Air five', [front({ arms: AIR, expr: 'grin' }), front({ arms: right([12, 3.5], [10, 1]), expr: 'wink', fx: [{ kind: 'sparkle', at: [12, 0] }, { kind: 'puff', at: [13, 3] }] }), front({ arms: AIR, expr: 'smirk' })], [350, 450, 800])
const headPat = gesture('head-pat', 'Head pat', [front({ arms: PAT, expr: 'grin' }), front({ arms: right([14, 9.5], [14.5, 13]), expr: 'blink', fx: [{ kind: 'heart', at: [12, 1] }] })], [300, 300], 3)
const handshake = gesture('secret-handshake', 'Secret handshake', [front({ arms: UP, expr: 'grin' }), front({ arms: LOW, expr: 'talk', y: 1 }), front({ arms: SIDE, expr: 'grin' }), front({ arms: FIST, expr: 'talk', fx: [{ kind: 'puff', at: [9, 8] }] }), front({ arms: right([14, 5], [15, 3]), expr: 'wink', fx: [{ kind: 'note', at: [1, 1] }, { kind: 'sparkle', at: [12, 0] }] })], [300, 300, 300, 300, 900])
const pinkySwear = gesture('pinky-swear', 'Pinky swear', [front({ arms: PINKY, expr: 'smirk' }), front({ arms: PINKY, expr: 'blink', fx: [{ kind: 'heart', at: [12, 1] }] }), front({ arms: PINKY, expr: 'wink', fx: [{ kind: 'heart', at: [12, 0] }] })], [500, 500, 900])
const tooSlow = gesture('too-slow', 'Too slow', [front({ arms: UP, expr: 'grin' }), front({ arms: right([12.5, 9.5], [10, 11]), expr: 'smirk', fx: [{ kind: 'puff', at: [12, 1] }] }), front({ arms: right([12.5, 9.5], [10, 11]), expr: 'wink' }), front({ arms: right([12.5, 9.5], [10, 11]), expr: 'talk' })], [250, 450, 600, 600])

const CONFETTI_AT: readonly P[][] = [
  [[0, 0], [11, 1], [3, 9]],
  [[1, 3], [11, 0], [0, 10], [11, 9]],
  [[0, 6], [12, 4], [2, 12], [11, 12]],
]
const confetti = gesture('confetti', 'Confetti', CONFETTI_AT.map((spots, i) => front({ arms: TEN, expr: i === 1 ? 'talk' : 'grin', y: i === 1 ? -1 : 0, fx: spots.map(at => ({ kind: 'confetti' as const, at })) })), [350, 350, 350], 2)
const CLAP_IN = arms([5, 9.5], [7, 8])
const CLAP_OUT = arms([3, 9.5], [3.5, 8])
const slowClap = gesture('slow-clap', 'Slow clap', [front({ arms: CLAP_OUT, expr: 'smirk' }), front({ arms: CLAP_IN, expr: 'blink', fx: [{ kind: 'star', at: [7, 6] }] })], [700, 400], 3)
const golfClap = gesture('golf-clap', 'Golf clap', [front({ arms: arms([5, 9], [6.5, 8.5]), expr: 'smirk' }), front({ arms: arms([5.5, 9], [7.3, 8.5]), expr: 'smirk' })], [150, 150], 6)
const thumbsUp = gesture('thumbs-up', 'Thumbs up', [front({ arms: arms([2.5, 9], [3, 6.5]), expr: 'grin' }), front({ arms: arms([2.5, 9], [3, 6]), expr: 'wink', fx: [{ kind: 'star', at: [2, 4] }, { kind: 'star', at: [13, 4] }] })], [500, 1200])
const salute = gesture('salute', 'Salute', [front({ expr: 'grin' }), front({ arms: right([13.5, 4.5], [10.5, 2]), expr: 'grin', y: -1 }), front({ arms: right([13.5, 4.5], [10.5, 2]), expr: 'blink', y: -1 })], [300, 1100, 300])
const bow = gesture('bow', 'Bow', [front({ expr: 'grin' }), front({ expr: 'blink', y: 2, arms: arms([4, 9], [6, 10.5]) }), front({ expr: 'blink', y: 2, arms: arms([4, 9], [6, 10.5]), fx: [{ kind: 'sparkle', at: [0, 1] }] }), front({ expr: 'wink' })], [300, 600, 600, 700])
const pointAtYou = gesture('point', 'Point', [front({ arms: right([13.5, 7], [15.5, 8]), expr: 'grin' }), front({ arms: right([13.5, 7], [15.5, 8]), expr: 'wink', fx: [{ kind: 'star', at: [15, 6] }] }), front({ arms: right([13.5, 7], [15.5, 8]), expr: 'talk' })], [400, 600, 800])
const happyFeet = gesture('happy-feet', 'Happy feet', [front({ arms: arms([2, 6], [1.5, 3.5]), x: -1, expr: 'grin', fx: [{ kind: 'note', at: [13, 1] }] }), front({ arms: ARMS_DOWN, x: 1, y: -1, expr: 'talk' }), front({ arms: arms([2, 6], [1.5, 3.5]), x: 1, expr: 'grin', fx: [{ kind: 'note', at: [0, 2] }] }), front({ arms: ARMS_DOWN, x: -1, y: -1, expr: 'talk' })], [250, 250, 250, 250], 2)
const micDrop = gesture('mic-drop', 'Mic drop', [front({ arms: SIDE, expr: 'smirk', props: [{ kind: 'mic', at: [15, 5] }] }), front({ arms: SIDE, expr: 'blink', props: [{ kind: 'mic', at: [15, 9] }] }), front({ arms: SIDE, expr: 'smirk', fx: [{ kind: 'puff', at: [13, 14] }], props: [{ kind: 'mic', at: [14, 13] }] })], [700, 200, 1200])
const RAISE = arms([2, 4.5], [3, 1.5])
const raiseRoof = gesture('raise-roof', 'Raise the roof', [front({ arms: RAISE, expr: 'grin' }), front({ arms: arms([2, 3.5], [3, 0.5]), y: -1, expr: 'talk', fx: [{ kind: 'note', at: [13, 2] }] })], [300, 300], 3)
const chefsKiss = gesture('chefs-kiss', "Chef's kiss", [front({ arms: right([12.5, 8], [9.5, 5]), expr: 'o' }), front({ arms: right([14, 5], [15, 2]), expr: 'grin', fx: [{ kind: 'heart', at: [13, 0] }, { kind: 'sparkle', at: [0, 2] }] })], [700, 1100])
const fireworks = gesture('fireworks', 'Fireworks', [front({ expr: 'o', fx: [{ kind: 'sparkle', at: [0, 0] }] }), front({ expr: 'o', fx: [{ kind: 'sparkle', at: [13, 1] }, { kind: 'star', at: [1, 4] }] }), front({ arms: TEN, expr: 'grin', fx: [{ kind: 'sparkle', at: [0, 2] }, { kind: 'sparkle', at: [13, 0] }, { kind: 'confetti', at: [11, 9] }] })], [450, 450, 900], 2)

/** The offered ones' outstretched hands: what he holds out before you take it. */
const OFFERS: readonly Move[] = [
  offer('high-five', 'High five', UP),
  offer('low-five', 'Low five', LOW, 'grin', { y: 1 }),
  offer('side-five', 'Side five', SIDE),
  offer('gimme-ten', 'Gimme ten', TEN),
  offer('gimme-seven', 'Gimme seven', SEVEN, 'o'),
  offer('fist-bump', 'Fist bump', FIST),
  offer('elbow-bump', 'Elbow bump', ELBOW, 'smirk'),
  offer('chest-bump', 'Chest bump', CHEST_BACK, 'grin', { y: 1 }),
  offer('air-five', 'Air five', AIR),
  offer('head-pat', 'Head pat', PAT),
  offer('secret-handshake', 'Secret handshake', UP, 'smirk'),
  offer('pinky-swear', 'Pinky swear', PINKY, 'smirk'),
]

/** Every celebration's gestures: the contacts, the offers, too slow, and the ones he just does. */
export const CELEBRATION_MOVES: readonly Move[] = [
  lowFive,
  sideFive,
  gimmeTen,
  gimmeSeven,
  fistBump,
  elbowBump,
  chestBump,
  airFive,
  headPat,
  handshake,
  pinkySwear,
  tooSlow,
  ...OFFERS,
  confetti,
  slowClap,
  golfClap,
  thumbsUp,
  salute,
  bow,
  pointAtYou,
  happyFeet,
  micDrop,
  raiseRoof,
  chefsKiss,
  fireworks,
  ...MORE_CELEBRATION_MOVES,
]

/** His routine on show day (prep.ts): the poses he practised, one after another, then the trophy held high. */
const posingRoutine: Move = {
  id: 'posing-routine',
  title: 'Posing routine',
  family: 'flex',
  poses: [doubleBiceps.poses[0]!, doubleBiceps.poses[1]!, latSpread.poses[1]!, mostMuscular.poses[1]!, trophy.poses[1]!],
  beats: beat([0, 500], [1, 900], [2, 1100], [3, 1100], [4, 1300]),
  reps: 1,
}

/** Exercise demos beyond the collection: dedicated to each exercise, played on its set, never collected. */
export const DEMOS: readonly Move[] = [...EXISTING_DEMOS, ...NEW_A_DEMOS, ...NEW_B_DEMOS]

export const GESTURES: readonly Move[] = [highFive, hug, struggle, posingRoutine, ...CELEBRATION_MOVES]

export type MoveId = string

export function moveById(id: MoveId): Move | undefined {
  return MOVES.find(move => move.id === id) ?? GESTURES.find(move => move.id === id) ?? DEMOS.find(move => move.id === id)
}

/** Each move's poses drawn once: 16 rows of palette characters each. */
export const drawMove = (move: Move, outfit?: Outfit): string[][] => move.poses.map(pose => drawFigure(pose, outfit))

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
  return [...EXISTING_DEMO_BY_NAME, ...NEW_A_DEMO_BY_NAME, ...NEW_B_DEMO_BY_NAME, ...BY_NAME].find(([pattern]) => pattern.test(name))?.[1] ?? null
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
