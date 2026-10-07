/**
 * Copyright 2026 zrobok. All rights reserved: not covered by the Apache License (see NOTICE). Swolomon's
 * name, character, likeness and these moves are proprietary.
 *
 * Exercise demos (owner, 2026-10-06: "add 50 more workouts"): moves of family 'exercise' that he plays on a
 * set band for the exercise named, never collected. Each with its name patterns (matched before the general
 * ones in moves.ts) and its form cue (`form-<move id>`). Pure data, drawn by `figure.ts`.
 *
 * These are the exercises IdleReps already prescribes that used to borrow a general move (an incline push-up
 * shown as a floor one, a goblet squat with empty hands): each now has its own.
 */

import { shift, turned } from './figure'
import type { Expr, Figure, Fx, Limb, P, Prop } from './figure'
import { ARMS_DOWN, arms, beat, front, LEGS, SHOULDER_L, SHOULDER_R, side, STAND_SIDE } from './move-kit'
import type { LineEntry } from './copy'
import type { Move, MoveId } from './moves'

const exercise = (id: string, title: string, poses: Figure[], beats: [number, number][], reps: number): Move => ({ id, title, family: 'exercise', poses, beats, reps })

const MAT: Prop = { kind: 'mat', y: 15 }
/** A desk's top edge, seen side-on. */
const DESK: Prop = { kind: 'bar', y: 9 }
const strain = (isStrain: boolean): { expr?: Expr } => (isStrain ? { expr: 'strain' } : {})

/** A pose drawn facing right, turned to face left, then given props that should not mirror (the chair). */
const facingLeft = (f: Figure, props: readonly Prop[]): Figure => ({ ...turned(f), props })

// ---------------------------------------------------------------------------------------------------------
// Push-ups: on a chair, feet up, hips high, at the wall, at the desk.

/** Hands on a chair's seat, feet on the floor: the body on a slope, head end high. */
const INCLINE = (isDown: boolean): Figure =>
  facingLeft(
    side({
      head: isDown ? [10, 4] : [9, 1.5],
      neck: isDown ? [10.5, 9] : [9.5, 7],
      hip: isDown ? [5.5, 11] : [5, 10],
      arms: isDown
        ? [
            [[10, 9.5], [9.5, 11], [12, 11.5]],
            [[11, 9.5], [10.5, 11], [13, 11.5]],
          ]
        : [
            [[9.5, 7.5], [11, 9.5], [12, 11.5]],
            [[10.5, 7.5], [12, 9.5], [13, 11.5]],
          ],
      legs: isDown
        ? [
            [[5.5, 11.5], [3, 13], [1, 14.5]],
            [[5.5, 11], [3, 12.5], [1.5, 14.5]],
          ]
        : [
            [[5, 10.5], [3, 12.5], [1, 14.5]],
            [[5, 10], [3, 12], [1.5, 14.5]],
          ],
      ...strain(isDown),
    }),
    [{ kind: 'chair', at: [0, 10] }],
  )

/** Feet up on a chair, hands on the floor: the body on a slope, head end low. */
const DECLINE = (isDown: boolean): Figure =>
  side({
    head: isDown ? [10.5, 8] : [10.5, 5],
    neck: isDown ? [11, 13] : [11, 10.5],
    hip: isDown ? [6, 10] : [6, 8.5],
    arms: isDown
      ? [
          [[10.5, 13], [9, 13.5], [11, 15]],
          [[11.5, 13], [10, 13.5], [12, 15]],
        ]
      : [
          [[10.5, 11], [11, 13], [11, 15]],
          [[11.5, 11], [12, 13], [12, 15]],
        ],
    legs: [
      [[6, 9], [4, 9.5], [2, 10]],
      [[6, 8.5], [4, 9], [2.5, 9.5]],
    ],
    props: [{ kind: 'chair', at: [0, 9] }, { kind: 'chair', at: [0, 11] }, MAT],
    ...strain(isDown),
  })

/** Hips high, an upside-down V; the head lowers between the hands. */
const PIKE = (isDown: boolean): Figure =>
  side({
    head: isDown ? [9, 8.5] : [9.5, 6],
    neck: isDown ? [10, 12] : [10, 10.5],
    hip: [6, 5.5],
    arms: isDown
      ? [
          [[9.5, 12], [8, 13], [11, 15]],
          [[10.5, 12], [9, 13], [12, 15]],
        ]
      : [
          [[9.5, 10.5], [10.5, 13], [11, 15]],
          [[10.5, 10.5], [11.5, 13], [12, 15]],
        ],
    legs: [
      [[6, 6], [4, 10], [2, 14.5]],
      [[6.5, 6], [4.5, 10], [3, 14.5]],
    ],
    seat: [5.5, 7],
    props: [MAT],
    ...strain(isDown),
  })

/** Standing, leaning on the wall: hands flat on it, chest to it and back. */
const WALL_PRESS = (isDown: boolean): Figure =>
  side({
    head: isDown ? [8, 1.5] : [6.5, 1],
    neck: isDown ? [10, 7] : [8.5, 6.5],
    hip: [6.5, 10.5],
    arms: isDown
      ? [
          [[9.5, 7.5], [11, 10], [13, 6.5]],
          [[10.5, 7.5], [12, 10], [13, 7.5]],
        ]
      : [
          [[8, 7], [10.5, 7], [13, 6.5]],
          [[9, 7], [11, 7.5], [13, 7.5]],
        ],
    legs: [
      [[6, 11], [4.5, 13], [3, 14.5]],
      [[7, 11], [5.5, 13], [4, 14.5]],
    ],
    props: [{ kind: 'wall', x: 14 }],
    ...strain(isDown),
  })

/** Hands on the desk's edge, feet back: steeper than a chair, gentler than the wall. */
const DESK_PRESS = (isDown: boolean): Figure =>
  side({
    head: isDown ? [9.5, 2.5] : [8, 1],
    neck: isDown ? [10.5, 7.5] : [9, 6],
    hip: [5.5, 10],
    arms: isDown
      ? [
          [[10, 8], [10, 10], [12.5, 9]],
          [[11, 8], [11, 10], [13.5, 9]],
        ]
      : [
          [[8.5, 6.5], [10.5, 7.5], [12.5, 9]],
          [[9.5, 6.5], [11.5, 7.5], [13.5, 9]],
        ],
    legs: [
      [[5.5, 10.5], [3.5, 12.5], [1.5, 14.5]],
      [[5.5, 10], [4, 12], [2.5, 14.5]],
    ],
    props: [DESK],
    ...strain(isDown),
  })

const inclinePushUp = exercise('incline-push-up', 'Incline push-ups', [INCLINE(false), INCLINE(true)], beat([0, 450], [1, 550]), 4)
const declinePushUp = exercise('decline-push-up', 'Decline push-ups', [DECLINE(false), DECLINE(true)], beat([0, 450], [1, 600]), 4)
const pikePushUp = exercise('pike-push-up', 'Pike push-ups', [PIKE(false), PIKE(true)], beat([0, 500], [1, 600]), 4)
const wallPushUp = exercise('wall-push-up', 'Wall push-ups', [WALL_PRESS(false), WALL_PRESS(true)], beat([0, 400], [1, 450]), 5)
const deskPushUp = exercise('desk-push-up', 'Desk push-ups', [DESK_PRESS(false), DESK_PRESS(true)], beat([0, 450], [1, 500]), 4)
/** The desk press with the elbows tucked: on the way down they go back along the ribs, not out. */
const closeGripDeskPushUp = exercise(
  'close-grip-desk-push-up',
  'Close-grip desk push-ups',
  [
    DESK_PRESS(false),
    {
      ...DESK_PRESS(true),
      backArm: [[10, 8], [8.5, 9], [12.5, 9]],
      frontArm: [[11, 8], [9.5, 9], [13.5, 9]],
    },
  ],
  beat([0, 450], [1, 550]),
  4,
)

// ---------------------------------------------------------------------------------------------------------
// Presses and arms: bands under the feet, one dumbbell overhead.

/** A band from under each foot up to each hand. */
const bandsTo = (left: P, right: P): Prop[] => [
  { kind: 'band', from: [6, 14.5], to: left },
  { kind: 'band', from: [10, 14.5], to: right },
]

const bandOverheadPress = exercise(
  'band-overhead-press',
  'Band overhead press',
  [
    front({ arms: arms([2, 8], [2.5, 5.5]), props: bandsTo([2.5, 5.5], [12.5, 5.5]) }),
    front({ arms: arms([2.5, 4], [3, 1]), props: bandsTo([3, 1], [12, 1]), expr: 'strain' }),
  ],
  beat([0, 450], [1, 550]),
  4,
)

const bandCurl = exercise(
  'band-curl',
  'Band curls',
  [
    front({ arms: [[SHOULDER_L, [4, 9.5], [4.5, 12]], [SHOULDER_R, [12, 9.5], [11.5, 12]]], props: bandsTo([4.5, 12], [11.5, 12]) }),
    front({
      arms: [
        [SHOULDER_L, [3.5, 9.5], [4.5, 6.5]],
        [SHOULDER_R, [12.5, 9.5], [11.5, 6.5]],
      ],
      bicep: [
        [3.2, 8],
        [12.8, 8],
      ],
      props: bandsTo([4.5, 6.5], [11.5, 6.5]),
      expr: 'strain',
    }),
  ],
  beat([0, 450], [1, 550]),
  4,
)

/** Seated, one dumbbell in both hands, elbows up by the ears: lowered behind the head, then pressed up. */
const OVERHEAD_EXTENSION = (isUp: boolean): Figure =>
  side({
    head: [2, 2],
    neck: [5, 8],
    hip: [5, 11.5],
    arms: isUp
      ? [
          [[5, 8.5], [8, 3.5], [9, 0]],
          [[6, 8.5], [9, 3.5], [10, 0]],
        ]
      : [
          [[5, 8.5], [8, 3.5], [5, 1]],
          [[6, 8.5], [9, 3.5], [6, 1]],
        ],
    legs: [
      [[5, 12], [9.5, 12], [9.5, 14.5]],
      [[5.5, 12], [10.5, 12], [10.5, 14.5]],
    ],
    seat: [8, 12],
    props: [{ kind: 'chair', at: [2, 10] }, isUp ? { kind: 'dumbbell', at: [10, 0], upright: true } : { kind: 'dumbbell', at: [5.5, 0.5] }],
    ...strain(isUp),
  })

const overheadTricepsExtension = exercise(
  'dumbbell-overhead-triceps-extension',
  'Dumbbell overhead triceps extension',
  [OVERHEAD_EXTENSION(false), OVERHEAD_EXTENSION(true)],
  beat([0, 550], [1, 500]),
  4,
)

// ---------------------------------------------------------------------------------------------------------
// The bar: hanging, lowering slowly, holding the top.

const DANGLE: [Limb, Limb] = [
  [[6, 12], [6.5, 14]],
  [[10, 12], [9.5, 14]],
]
/** Hanging from the bar, arms long, `dx` across. */
const HANG = (dx: number, fx: readonly Fx[] = []): Figure =>
  front({ x: dx, y: 2, arms: arms([4, 0.5], [5, -2]), legs: DANGLE, props: [{ kind: 'bar', y: 0 }], fx })
/** Chin over the bar, elbows tight, `dx` across. */
const TOP = (dx: number, fx: readonly Fx[] = []): Figure =>
  front({ x: dx, y: -1, arms: arms([3, 7], [5, 1]), legs: DANGLE, bicep: [[3.8, 8], [11.2, 8]], props: [{ kind: 'bar', y: 1 }], expr: 'strain', fx })

const deadHang = exercise('dead-hang', 'Dead hang', [HANG(-1), HANG(1, [{ kind: 'drop', at: [12, 3] }]), { ...HANG(0), head: { at: [5, 2], facing: 'front', expr: 'blink' } }], beat([0, 600], [1, 600], [2, 400]), 3)

const pullUpNegative = exercise(
  'pull-up-negative',
  'Pull-up negatives',
  [
    front({ y: 3, arms: arms([2.5, 5], [5, 1]), legs: [[[6, 12], [5, 13], [6.5, 14.5]], [[10, 12], [11, 13], [9.5, 14.5]]], props: [{ kind: 'bar', y: 1 }] }),
    TOP(0),
    front({ y: 1, arms: arms([2.5, 4], [5, 0]), legs: DANGLE, props: [{ kind: 'bar', y: 1 }], expr: 'strain', fx: [{ kind: 'sweat', at: [12, 1] }] }),
    front({ y: 3, arms: arms([4, 1.5], [5, -1]), legs: DANGLE, props: [{ kind: 'bar', y: 1 }] }),
  ],
  beat([0, 300], [1, 400], [2, 1100], [3, 600]),
  2,
)

const chinUpHold = exercise(
  'chin-up-hold',
  'Chin-up hold (top position)',
  [TOP(0), TOP(1, [{ kind: 'sweat', at: [12, 1] }]), TOP(0, [{ kind: 'drop', at: [2, 3] }])],
  beat([0, 500], [1, 200], [2, 200], [1, 200], [2, 600]),
  2,
)

// ---------------------------------------------------------------------------------------------------------
// Back: a band row on the floor, and the face-down raises.

/** Sitting on the floor, legs long, the band round the feet to the hands. */
const BAND_ROW = (isPulled: boolean): Figure =>
  side({
    head: [3, 2.5],
    neck: [6, 8.5],
    hip: [5.5, 13],
    arms: isPulled
      ? [
          [[5.5, 9.5], [3, 11], [6, 11.5]],
          [[6.5, 9.5], [3.5, 11.5], [7, 12]],
        ]
      : [
          [[5.5, 9.5], [8.5, 11], [11.5, 11.5]],
          [[6.5, 9.5], [9.5, 11], [12.5, 12]],
        ],
    legs: [
      [[5.5, 13.5], [10, 14], [14, 14]],
      [[6, 13.5], [10.5, 14], [14.5, 14]],
    ],
    seat: [8, 13.8],
    props: [MAT, { kind: 'band', from: isPulled ? [7, 12] : [12.5, 12], to: [15, 13.5] }],
    ...strain(isPulled),
  })

const bandRow = exercise('band-row', 'Band rows', [BAND_ROW(false), BAND_ROW(true)], beat([0, 450], [1, 550]), 4)

/** Face down on the mat, head to the right; `arms` from the shoulder, the legs staying down. */
const PRONE = (frontArm: Limb, backArm: Limb, lift: number, expr?: Expr): Figure =>
  side({
    head: [6.5, 9 - lift],
    neck: [7, 13.5],
    hip: [2.5, 14],
    arms: [backArm, frontArm],
    legs: [
      [[2.5, 14], [1, 14], [-1, 14]],
      [[2.5, 14.5], [1, 14.5], [-1, 14.5]],
    ],
    seat: [1, 14.2],
    props: [MAT],
    ...(expr === undefined ? {} : { expr }),
  })

const proneYRaise = exercise(
  'prone-y-raise',
  'Prone Y-raises',
  [
    PRONE([[7.5, 13.5], [11.5, 14], [15.5, 14]], [[7, 13.5], [11, 14], [15, 14]], 0),
    PRONE([[7.5, 13], [11.5, 10.5], [15.5, 8]], [[7, 13], [11, 11], [15, 8.5]], 1, 'strain'),
  ],
  beat([0, 450], [1, 700]),
  4,
)

const reverseSnowAngel = exercise(
  'reverse-snow-angel',
  'Reverse snow angels',
  [
    PRONE([[7.5, 13], [11.5, 11.5], [15.5, 10.5]], [[7, 13], [11, 12], [15, 11]], 1),
    PRONE([[7, 12.5], [5.5, 10.5], [4.5, 9]], [[6.5, 12.5], [5, 11], [4, 9.5]], 1, 'strain'),
    PRONE([[7, 13], [4.5, 12], [1.5, 11.5]], [[6.5, 13], [4, 12.5], [1, 12]], 1, 'strain'),
  ],
  beat([0, 450], [1, 350], [2, 600], [1, 350]),
  2,
)

// ---------------------------------------------------------------------------------------------------------
// Legs: a kettlebell at the chest, a jump, bridges with a band or one leg, a calf raise on one foot.

/** Squatting in profile, a kettlebell held at the chest. */
const GOBLET = (isDown: boolean): Figure =>
  isDown
    ? side({
        head: [5.5, 3],
        neck: [8, 9],
        hip: [5, 12],
        arms: [
          [[8, 9.5], [10, 10.5], [10.5, 8.5]],
          [[9, 9.5], [10.5, 11], [11, 9]],
        ],
        legs: [
          [[5, 12.5], [9, 12.5], [8, 14.5]],
          [[6, 13], [10, 13], [9, 14.5]],
        ],
        props: [{ kind: 'kettlebell', at: [10, 7] }],
        expr: 'strain',
      })
    : STAND_SIDE({
        arms: [
          [[7.5, 7], [9, 9.5], [10, 7.5]],
          [[8.5, 7], [9.5, 10], [10.5, 8]],
        ],
        props: [{ kind: 'kettlebell', at: [9.5, 5] }],
      })

const gobletSquat = exercise('goblet-squat', 'Goblet squats', [GOBLET(false), GOBLET(true)], beat([0, 450], [1, 650]), 4)

const jumpSquat = exercise(
  'jump-squat',
  'Jump squats',
  [
    side({
      head: [5.5, 3],
      neck: [8, 9],
      hip: [5, 12],
      arms: [
        [[7.5, 9.5], [6, 11.5], [4, 12.5]],
        [[8.5, 9.5], [7, 12], [5, 13]],
      ],
      legs: [
        [[5, 12.5], [9, 12.5], [8, 14.5]],
        [[6, 13], [10, 13], [9, 14.5]],
      ],
      expr: 'strain',
    }),
    {
      ...shift(
        STAND_SIDE({
          arms: [
            [[7, 7], [5, 9], [3.5, 10.5]],
            [[8, 7], [6, 9.5], [4.5, 11]],
          ],
          legs: [
            [[7, 12], [7.5, 14.5]],
            [[9, 12], [9.5, 14.5]],
          ],
          expr: 'talk',
        }),
        0,
        -1.5,
      ),
      fx: [{ kind: 'puff', at: [7, 14] }],
    },
  ],
  beat([0, 500], [1, 400]),
  4,
)

/** On the back, knees up, a band round the thighs; hips up or down. */
const BANDED_BRIDGE = (isUp: boolean): Figure =>
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
    props: [MAT, isUp ? { kind: 'band', from: [3.5, 9], to: [3.5, 11.5] } : { kind: 'band', from: [4, 9.5], to: [4.5, 12] }],
    ...(isUp ? { expr: 'strain' as const, fx: [{ kind: 'sparkle' as const, at: [0, 6] }] } : {}),
  })

const bandedGluteBridge = exercise('banded-glute-bridge', 'Banded glute bridges', [BANDED_BRIDGE(false), BANDED_BRIDGE(true)], beat([0, 450], [1, 650]), 4)

/** One foot planted, the other leg straight out in line; hips up or down. */
const ONE_LEG_BRIDGE = (isUp: boolean): Figure =>
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
          [[6, 10.5], [3, 9], [0.5, 7.5]],
        ]
      : [
          [[6, 14], [3.5, 10.5], [1.5, 14.5]],
          [[6, 13.5], [3, 11.5], [0.5, 9.5]],
        ],
    seat: isUp ? [4.5, 10] : [5, 12.5],
    props: [MAT],
    ...strain(isUp),
  })

const singleLegGluteBridge = exercise('single-leg-glute-bridge', 'Single-leg glute bridges', [ONE_LEG_BRIDGE(false), ONE_LEG_BRIDGE(true)], beat([0, 450], [1, 650]), 4)

/** On one foot, the other tucked up behind, a hand on the wall; flat or up on the toes. */
const ONE_FOOT_RAISE = (isUp: boolean): Figure =>
  STAND_SIDE({
    head: [5, isUp ? -1 : 0.5],
    neck: [8, isUp ? 5 : 6.5],
    hip: [8, isUp ? 9.5 : 11],
    arms: [
      [[7, isUp ? 6 : 7.5], [6.5, isUp ? 8.5 : 10], [6.5, isUp ? 10.5 : 12]],
      [[9, isUp ? 6 : 7.5], [11.5, isUp ? 6.5 : 8], [13, isUp ? 6 : 7.5]],
    ],
    legs: [
      [[7.5, isUp ? 10.5 : 12], [6, isUp ? 12 : 13.5], [4, isUp ? 11 : 12.5]],
      [[8.5, isUp ? 10.5 : 12], [8.5, isUp ? 13 : 14.5]],
    ],
    seat: [8, isUp ? 10.5 : 12],
    props: [{ kind: 'wall', x: 14 }],
    ...strain(isUp),
  })

const singleLegCalfRaise = exercise('single-leg-calf-raise', 'Single-leg calf raises', [ONE_FOOT_RAISE(false), ONE_FOOT_RAISE(true)], beat([0, 400], [1, 500]), 5)

// ---------------------------------------------------------------------------------------------------------
// Core and cardio.

/** On one forearm, side-on to you, body a straight slope; the top arm on the hip or to the sky. */
const SIDE_PLANK = (isReach: boolean, fx: readonly Fx[] = []): Figure => ({
  head: { at: [8, isReach ? 4 : 4.5], facing: 'front', ...(isReach ? { expr: 'strain' as const } : {}) },
  torso: { from: [11, 10], to: [6.5, 12], width: 4 },
  shorts: { from: [6.5, 12], to: [4.5, 12.8], width: 4 },
  backArm: [[12, 10.5], [12, 14], [15, 14]],
  frontArm: isReach ? [[11, 10], [13, 6.5], [14.5, 3]] : [[10.5, 10], [9, 11.5], [7.5, 12]],
  backLeg: [[5, 12.5], [2.5, 13.5], [0.5, 14.5]],
  frontLeg: [[5, 12], [2.5, 13], [0.5, 13.5]],
  props: [MAT],
  fx,
})

const sidePlank = exercise('side-plank', 'Side plank', [SIDE_PLANK(false), SIDE_PLANK(true), SIDE_PLANK(true, [{ kind: 'sweat', at: [13, 3] }])], beat([0, 600], [1, 600], [2, 900]), 2)

/** Standing tall, hands ready in front. */
const STEP_STAND = STAND_SIDE({
  arms: [
    [[7, 7], [8, 9.5], [9.5, 9]],
    [[9, 7], [10, 9.5], [11.5, 9]],
  ],
})
/** Squatting down, hands flat on the floor in front. */
const STEP_CROUCH = side({
  head: [7, 4],
  neck: [9, 9.5],
  hip: [5, 11.5],
  arms: [
    [[9, 10], [10.5, 12.5], [11, 14.5]],
    [[10, 10], [11.5, 12.5], [12, 14.5]],
  ],
  legs: [
    [[5, 12], [8.5, 12], [7.5, 14.5]],
    [[5.5, 12.5], [9, 12.5], [8, 14.5]],
  ],
})
/** One foot stepped back, the other still under the hips. */
const STEP_HALF = side({
  head: [9, 5],
  neck: [10, 10.5],
  hip: [5, 11.5],
  arms: [
    [[9.5, 11], [10.5, 13], [11, 14.5]],
    [[10.5, 11], [11.5, 13], [12, 14.5]],
  ],
  legs: [
    [[5, 12], [2.5, 13], [0.5, 14.5]],
    [[5.5, 12], [8, 12.5], [7.5, 14.5]],
  ],
})
/** Both feet back: a straight line from the head to the heels. */
const STEP_PLANK = side({
  head: [9.5, 5],
  neck: [10, 10.5],
  hip: [5, 11.5],
  arms: [
    [[9.5, 11], [10.5, 13], [11, 14.5]],
    [[10.5, 11], [11.5, 13], [12, 14.5]],
  ],
  legs: [
    [[5, 12], [2.5, 13], [0.5, 14.5]],
    [[5, 11.5], [2.5, 12.5], [0.5, 14]],
  ],
  expr: 'strain',
})

const stepBackBurpee = exercise(
  'step-back-burpee',
  'Step-back burpees',
  [STEP_STAND, STEP_CROUCH, STEP_HALF, STEP_PLANK],
  beat([0, 350], [1, 350], [2, 350], [3, 450], [2, 350], [1, 350], [0, 400]),
  2,
)

/** Hands behind the head, elbows wide; one knee rising to the other side's elbow. */
const KNEE_TO_ELBOW = (toward: 'left' | 'right' | null): Figure => {
  if (toward === null) return front({ arms: arms([1.5, 4], [5, 2]) })
  const pose = front({
    arms: [
      [SHOULDER_L, [1.5, 4], [5, 2]],
      [SHOULDER_R, [9.5, 9.5], [10, 5.5]],
    ],
    legs: [
      [[6, 12], [9, 10.5], [8, 13]],
      [[10, 12], [10, 14.5]],
    ],
    expr: 'strain',
  })
  return toward === 'left' ? pose : turned(pose)
}

const standingKneeToElbow = exercise(
  'standing-knee-to-elbow',
  'Standing knee-to-elbow',
  [KNEE_TO_ELBOW(null), KNEE_TO_ELBOW('left'), KNEE_TO_ELBOW('right')],
  beat([0, 300], [1, 450], [0, 300], [2, 450]),
  3,
)

/** One hand sliding down the leg, the other behind the head, elbow to the sky. */
const SIDE_SLIDE = (toward: 'left' | 'right' | null): Figure => {
  if (toward === null) return front({ arms: [ARMS_DOWN[0], [SHOULDER_R, [13.5, 4], [10, 2.5]]] })
  const pose: Figure = {
    ...front({ arms: [[SHOULDER_L, [3, 10], [3.5, 13.5]], [SHOULDER_R, [13.5, 4], [10, 2.5]]] }),
    head: { at: [4, 1], facing: 'front', expr: 'blink' },
    torso: { from: [7.5, 6.5], to: [8, 10] },
  }
  return toward === 'left' ? pose : turned(pose)
}

const standingSideBend = exercise('standing-side-bend', 'Standing side bends', [SIDE_SLIDE(null), SIDE_SLIDE('left'), SIDE_SLIDE('right')], beat([0, 350], [1, 650], [0, 350], [2, 650]), 2)

/** In profile, knees driving to the hip, the other arm swinging forward. */
const MARCH_STEP = (isFrontUp: boolean): Figure =>
  STAND_SIDE({
    arms: isFrontUp
      ? [
          [[7, 7], [9, 8.5], [10, 6.5]],
          [[9, 7], [7.5, 9.5], [6, 11]],
        ]
      : [
          [[7, 7], [5.5, 9.5], [4.5, 11]],
          [[9, 7], [11, 8.5], [12, 6.5]],
        ],
    legs: isFrontUp
      ? [
          [[7, 12], [7, 14.5]],
          [[9, 11.5], [12, 10.5], [12, 13.5]],
        ]
      : [
          [[7, 11.5], [10.5, 10.5], [10.5, 13.5]],
          [[9, 12], [9, 14.5]],
        ],
  })

const marchInPlace = exercise('march-in-place', 'March in place', [MARCH_STEP(true), MARCH_STEP(false)], beat([0, 350], [1, 350]), 6)

/** On the forearms at the desk's edge, body in one line, holding. */
const DESK_PLANK = (fx: readonly Fx[]): Figure =>
  side({
    head: [9, 2],
    neck: [10, 7.5],
    hip: [5.5, 10.5],
    arms: [
      [[9.5, 8], [10.5, 9], [13.5, 9]],
      [[10.5, 8], [11.5, 9], [14.5, 9]],
    ],
    legs: [
      [[5.5, 11], [3.5, 13], [1.5, 14.5]],
      [[5.5, 10.5], [3.5, 12.5], [2, 14.5]],
    ],
    props: [DESK],
    expr: 'strain',
    fx,
  })

const deskPlank = exercise(
  'desk-plank',
  'Desk plank',
  [DESK_PLANK([]), DESK_PLANK([{ kind: 'sweat', at: [15, 2] }]), DESK_PLANK([{ kind: 'drop', at: [6, 4] }, { kind: 'sweat', at: [15, 3] }])],
  beat([0, 500], [1, 300], [0, 200], [2, 700]),
  2,
)

// ---------------------------------------------------------------------------------------------------------
// Standing raises and kickbacks.

/** Hinged forward in profile; the arms hanging, or raised long in line with the back. */
const HINGED_RAISE = (isUp: boolean): Figure =>
  side({
    head: [8, 1.5],
    neck: [9.5, 7],
    hip: [6, 10.5],
    arms: isUp
      ? [
          [[9, 7.5], [11.5, 5], [14, 3]],
          [[10, 7.5], [12.5, 5], [15, 3]],
        ]
      : [
          [[9, 7.5], [9.5, 10], [10, 12]],
          [[10, 7.5], [10.5, 10], [11, 12]],
        ],
    legs: [
      [[5.5, 11], [7, 13], [6, 14.5]],
      [[6.5, 11], [8, 13], [7, 14.5]],
    ],
    ...strain(isUp),
  })

const standingYRaise = exercise('standing-y-raise', 'Standing Y-raises', [HINGED_RAISE(false), HINGED_RAISE(true)], beat([0, 450], [1, 600]), 4)

/** Front-on, back flat to the wall: arms in a goalpost, sliding up overhead. */
const wallAngel = exercise(
  'wall-angel',
  'Wall angels',
  [front({ arms: arms([1.5, 7], [1.5, 3.5]) }), front({ arms: arms([2.5, 3.5], [4.5, 0.5]), expr: 'blink' })],
  beat([0, 550], [1, 650]),
  4,
)

/** A hand on the wall, the far leg pressing straight back. */
const KICKBACK = (isBack: boolean): Figure =>
  STAND_SIDE({
    neck: [8.5, 6],
    head: [5.5, 0],
    arms: [
      [[7.5, 7], [7, 9.5], [7, 11.5]],
      [[9.5, 7], [11.5, 7.5], [13, 7]],
    ],
    legs: isBack
      ? [
          [[7.5, 12], [5, 13], [2, 13]],
          [[8.5, 12], [8.5, 14.5]],
        ]
      : [
          [[7.5, 12], [7.5, 14.5]],
          [[8.5, 12], [8.5, 14.5]],
        ],
    props: [{ kind: 'wall', x: 14 }],
    ...strain(isBack),
  })

const standingGluteKickback = exercise('standing-glute-kickback', 'Standing glute kickbacks', [KICKBACK(false), KICKBACK(true)], beat([0, 400], [1, 550]), 4)

// ---------------------------------------------------------------------------------------------------------
// Mobility: the hip flexor and hamstrings standing, the upper back and cat-cow on the floor, cat-cow standing.

/** Standing in a split stance, back heel up; the hips easing forward, an arm reaching up. */
const HIP_FLEXOR = (isDeep: boolean): Figure =>
  side({
    head: isDeep ? [5, 0.5] : [4.5, 0.5],
    neck: isDeep ? [7.5, 6.5] : [7, 6.5],
    hip: isDeep ? [7.5, 11] : [7, 10.5],
    arms: isDeep
      ? [
          [[7, 7], [7.5, 9.5], [8.5, 11]],
          [[8.5, 6.5], [9, 3.5], [9, 0.5]],
        ]
      : [
          [[6.5, 7], [6.5, 9.5], [7.5, 11]],
          [[7.5, 7], [8, 9.5], [9, 11]],
        ],
    legs: isDeep
      ? [
          [[7, 11.5], [4.5, 13], [2, 14.5]],
          [[8, 11.5], [11, 12.5], [11.5, 14.5]],
        ]
      : [
          [[6.5, 11], [4.5, 12.8], [2.5, 14.5]],
          [[7.5, 11], [10, 12.5], [10.5, 14.5]],
        ],
    expr: 'blink',
  })

const hipFlexorStretch = exercise('hip-flexor-stretch', 'Hip-flexor stretch', [HIP_FLEXOR(false), HIP_FLEXOR(true)], beat([0, 700], [1, 1300]), 2)

/** On hands and knees in profile: the back flat, `dy` up (rounded) or down (dipped). */
const ALL_FOURS = (o: { head: P; dy: number; front?: Limb; expr?: Expr }): Figure =>
  side({
    head: o.head,
    neck: [10, 10 + o.dy],
    hip: [5, 10 + o.dy],
    arms: [
      [[10, 10.5 + o.dy], [10.5, 12.5], [11, 14.5]],
      o.front ?? [[11, 10.5 + o.dy], [11.5, 12.5], [12, 14.5]],
    ],
    legs: [
      [[5, 10.5 + o.dy], [4.5, 14.5], [1.5, 14.5]],
      [[5.5, 10.5 + o.dy], [5.5, 14.5], [2.5, 14.5]],
    ],
    seat: [4.5, 11.5 + o.dy],
    props: [MAT],
    ...(o.expr === undefined ? {} : { expr: o.expr }),
  })

const thoracicRotation = exercise(
  'thoracic-rotation',
  'Thoracic rotations',
  [
    ALL_FOURS({ head: [10, 6], dy: 0, front: [[11, 10.5], [9, 12.5], [6.5, 13]], expr: 'blink' }),
    ALL_FOURS({ head: [10, 4.5], dy: 0, front: [[11, 10], [11.5, 6], [12, 1.5]], expr: 'o' }),
  ],
  beat([0, 700], [1, 900]),
  3,
)

const catCow = exercise(
  'cat-cow',
  'Cat-cow',
  [ALL_FOURS({ head: [10.5, 6.5], dy: -1.5, expr: 'blink' }), ALL_FOURS({ head: [10, 3], dy: 0.5, expr: 'o' })],
  beat([0, 800], [1, 800]),
  3,
)

/** Knees soft, hinged forward, hands on the thighs: the back rounded up (`dy` < 0) or dipped, chest proud. */
const HANDS_ON_THIGHS = (o: { head: P; dy: number; expr: Expr }): Figure =>
  side({
    head: o.head,
    neck: [9.5, 7.5 + o.dy],
    hip: [5, 10],
    arms: [
      [[9, 8 + o.dy], [9.5, 10], [9.5, 11.5]],
      [[10, 8 + o.dy], [10.5, 10], [10.5, 11.5]],
    ],
    legs: [
      [[5, 10.5], [8, 12], [6.5, 14.5]],
      [[5.5, 10.5], [9, 12], [7.5, 14.5]],
    ],
    expr: o.expr,
  })

const standingCatCow = exercise(
  'standing-cat-cow',
  'Standing cat-cow',
  [HANDS_ON_THIGHS({ head: [9.5, 4], dy: -1, expr: 'blink' }), HANDS_ON_THIGHS({ head: [9, 1], dy: 0.5, expr: 'o' })],
  beat([0, 800], [1, 800]),
  3,
)

/** Standing, one heel forward on the floor, toes up; tall, then hinging at the hips, hands on the thigh. */
const HEEL_FORWARD = (isHinged: boolean): Figure =>
  side({
    head: isHinged ? [8, 3.5] : [3.5, 0.5],
    neck: isHinged ? [9, 8.5] : [6, 6.5],
    hip: isHinged ? [5, 10.5] : [5.5, 10.5],
    arms: isHinged
      ? [
          [[8.5, 9.5], [9.5, 11], [10.5, 12]],
          [[9.5, 9.5], [10.5, 11], [11.5, 12.5]],
        ]
      : [
          [[5.5, 7], [5.5, 9.5], [6.5, 11]],
          [[6.5, 7], [7, 9.5], [8, 11]],
        ],
    legs: [
      [[5, 11], [5, 13], [4.5, 14.5]],
      [[6, 11], [9.5, 12.8], [13, 14.5], [13.5, 13]],
    ],
    expr: 'blink',
  })

const hamstringStretch = exercise('hamstring-stretch', 'Hamstring stretch', [HEEL_FORWARD(false), HEEL_FORWARD(true)], beat([0, 700], [1, 1300]), 2)

// ---------------------------------------------------------------------------------------------------------
// At the desk: on the chair, and standing beside it.

/** Sitting on a chair in profile, hands on the knees; the back rounded or the chest proud. */
const SEATED = (o: { head: P; neck: P; arms?: [Limb, Limb]; expr?: Expr }): Figure =>
  side({
    head: o.head,
    neck: o.neck,
    hip: [5, 11.5],
    arms: o.arms ?? [
      [[o.neck[0] - 0.5, o.neck[1] + 0.5], [o.neck[0] + 1, o.neck[1] + 3], [9.5, 11]],
      [[o.neck[0] + 0.5, o.neck[1] + 0.5], [o.neck[0] + 2, o.neck[1] + 3], [10.5, 11]],
    ],
    legs: [
      [[5, 12], [9.5, 12], [9.5, 14.5]],
      [[5.5, 12], [10.5, 12], [10.5, 14.5]],
    ],
    seat: [8, 12],
    props: [{ kind: 'chair', at: [2, 10] }],
    ...(o.expr === undefined ? {} : { expr: o.expr }),
  })

const seatedCatCow = exercise(
  'seated-cat-cow',
  'Seated cat-cow',
  [SEATED({ head: [5, 4.5], neck: [7, 9], expr: 'blink' }), SEATED({ head: [3, 1], neck: [5.5, 7], expr: 'o' })],
  beat([0, 800], [1, 800]),
  3,
)

/** Front-on, sitting: knees toward you, a hand on the far knee, the face turned the other way. */
const SEATED_FRONT = (o: { arms?: [Limb, Limb]; facing?: 'front' | 'left' | 'right'; expr?: Expr }): Figure => ({
  ...front({
    arms: o.arms ?? arms([3.5, 10], [5, 12]),
    legs: [
      [[6, 12], [5.5, 13], [5.5, 15]],
      [[10, 12], [10.5, 13], [10.5, 15]],
    ],
    ...(o.expr === undefined ? {} : { expr: o.expr }),
  }),
  head: { at: [5, 0], facing: o.facing ?? 'front', ...(o.expr === undefined ? {} : { expr: o.expr }) },
  shorts: { from: [8, 10], to: [8, 12.5], width: 8 },
})

const TWIST: [Limb, Limb] = [
  [SHOULDER_L, [5.5, 9.5], [9.5, 11.5]],
  [SHOULDER_R, [14, 9], [14.5, 11]],
]
const seatedTwist = exercise(
  'seated-twist',
  'Seated twist',
  [SEATED_FRONT({}), SEATED_FRONT({ arms: TWIST, facing: 'right', expr: 'blink' }), turned(SEATED_FRONT({ arms: TWIST, facing: 'right', expr: 'blink' }))],
  beat([0, 400], [1, 1000], [0, 400], [2, 1000]),
  2,
)

/** Hands clasped behind the back; the chest lifting, arms easing back and up. */
const chestOpener = exercise(
  'chest-opener',
  'Chest opener',
  [
    STAND_SIDE({
      arms: [
        [[7, 7], [6, 9.5], [5.5, 11.5]],
        [[8, 7], [7, 9.5], [6, 11.5]],
      ],
    }),
    STAND_SIDE({
      head: [5.5, -0.5],
      neck: [8.5, 5.5],
      arms: [
        [[7, 6.5], [4.5, 8.5], [2.5, 10]],
        [[8, 6.5], [5, 9], [3, 10.5]],
      ],
      expr: 'blink',
    }),
  ],
  beat([0, 600], [1, 1400]),
  2,
)

/** Arm out straight, palm up; the other hand easing the fingers back. */
const wristStretch = exercise(
  'wrist-stretch',
  'Wrist stretch',
  [
    STAND_SIDE({
      arms: [
        [[7, 7], [6.5, 9.5], [6.5, 11.5]],
        [[9, 7], [11.5, 7], [14, 7]],
      ],
    }),
    STAND_SIDE({
      arms: [
        [[7, 7], [10, 9], [14, 5.5]],
        [[9, 7], [11.5, 7], [14, 7]],
      ],
      expr: 'blink',
      fx: [{ kind: 'star', at: [15, 5] }],
    }),
  ],
  beat([0, 500], [1, 1300]),
  2,
)

/** A heel up on the chair, leg long; standing tall, then hinging forward over it. */
const HEEL_UP = (isHinged: boolean): Figure =>
  side({
    head: isHinged ? [7.5, 3] : [3, 0.5],
    neck: isHinged ? [8, 8.5] : [5.5, 6.5],
    hip: [4.5, 11],
    arms: isHinged
      ? [
          [[7.5, 9], [9, 10.5], [11, 11]],
          [[8.5, 9], [10, 10.5], [12, 11]],
        ]
      : [
          [[5, 7], [5, 9.5], [6, 11]],
          [[6, 7], [6.5, 9.5], [7.5, 11]],
        ],
    legs: [
      [[4.5, 11.5], [4.5, 13], [4.5, 14.5]],
      [[5, 11.5], [9.5, 11.5], [13.5, 11.5]],
    ],
    seat: [6.5, 11.5],
    props: [{ kind: 'chair', at: [11, 10] }],
    expr: 'blink',
  })

const standingHamstringStretch = exercise('standing-hamstring-stretch', 'Standing hamstring stretch', [HEEL_UP(false), HEEL_UP(true)], beat([0, 700], [1, 1300]), 2)

/** The head easing round: an ear to one shoulder, the chin down, the other ear, the eyes up. */
const neckRoll = exercise(
  'neck-roll',
  'Neck rolls',
  [
    { ...front({ expr: 'blink' }), head: { at: [4, 1], facing: 'left', expr: 'blink' } },
    { ...front({ expr: 'blink' }), head: { at: [5, 1.5], facing: 'front', expr: 'blink' } },
    { ...front({ expr: 'blink' }), head: { at: [6, 1], facing: 'right', expr: 'blink' } },
    { ...front(), head: { at: [5, 1], facing: 'front', expr: 'o' } },
  ],
  beat([0, 600], [1, 600], [2, 600], [3, 600]),
  2,
)

/** Fingertips on the shoulders, the elbows drawing big circles. */
const shoulderRoll = exercise(
  'shoulder-roll',
  'Shoulder rolls',
  [front({ arms: arms([3, 10], [4.5, 7]) }), front({ arms: arms([1, 7.5], [4, 6.5]) }), front({ arms: arms([2.5, 4], [4, 6]), expr: 'blink' }), front({ arms: arms([5, 5.5], [4.5, 6.5]), expr: 'blink' })],
  beat([0, 350], [1, 350], [2, 350], [3, 350]),
  3,
)

/** Flat-footed, arms down; then up on the toes, arms reaching high. */
const calfRaiseAndReach = exercise(
  'calf-raise-and-reach',
  'Calf raises and reach',
  [
    front({ arms: arms([4, 9.5], [6, 11]) }),
    front({ y: -1.5, arms: arms([3.5, 3], [4.5, 0]), legs: [LEGS[0].map(([x, y]) => [x, y + 1] as P), LEGS[1].map(([x, y]) => [x, y + 1] as P)], expr: 'blink', fx: [{ kind: 'sparkle', at: [0, 0] }] }),
  ],
  beat([0, 500], [1, 900]),
  3,
)

export const EXISTING_DEMOS: readonly Move[] = [
  inclinePushUp,
  declinePushUp,
  pikePushUp,
  wallPushUp,
  deskPushUp,
  closeGripDeskPushUp,
  bandOverheadPress,
  overheadTricepsExtension,
  deadHang,
  pullUpNegative,
  chinUpHold,
  bandRow,
  proneYRaise,
  reverseSnowAngel,
  bandCurl,
  gobletSquat,
  jumpSquat,
  bandedGluteBridge,
  singleLegGluteBridge,
  singleLegCalfRaise,
  sidePlank,
  stepBackBurpee,
  hipFlexorStretch,
  thoracicRotation,
  catCow,
  standingCatCow,
  hamstringStretch,
  wallAngel,
  standingGluteKickback,
  marchInPlace,
  standingYRaise,
  deskPlank,
  standingKneeToElbow,
  standingSideBend,
  seatedCatCow,
  neckRoll,
  chestOpener,
  seatedTwist,
  wristStretch,
  standingHamstringStretch,
  shoulderRoll,
  calfRaiseAndReach,
]

/** Exercise names to these demos, most specific first. Each pattern is the whole name, so a longer one never matches. */
export const EXISTING_DEMO_BY_NAME: readonly (readonly [RegExp, MoveId])[] = [
  [/^incline push-?ups?$/i, 'incline-push-up'],
  [/^decline push-?ups?$/i, 'decline-push-up'],
  [/^pike push-?ups?$/i, 'pike-push-up'],
  [/^wall push-?ups?$/i, 'wall-push-up'],
  [/^desk push-?ups?$/i, 'desk-push-up'],
  [/^close-grip desk push-?ups?$/i, 'close-grip-desk-push-up'],
  [/^band overhead press(es)?$/i, 'band-overhead-press'],
  [/^dumbbell overhead triceps extensions?$/i, 'dumbbell-overhead-triceps-extension'],
  [/^dead hangs?$/i, 'dead-hang'],
  [/^pull-?up negatives?$/i, 'pull-up-negative'],
  [/^chin-?up hold( \(top position\))?$/i, 'chin-up-hold'],
  [/^band rows?$/i, 'band-row'],
  [/^prone y-raises?$/i, 'prone-y-raise'],
  [/^reverse snow angels?$/i, 'reverse-snow-angel'],
  [/^band curls?$/i, 'band-curl'],
  [/^goblet squats?$/i, 'goblet-squat'],
  [/^jump squats?$/i, 'jump-squat'],
  [/^banded glute bridges?$/i, 'banded-glute-bridge'],
  [/^single-leg glute bridges?$/i, 'single-leg-glute-bridge'],
  [/^single-leg calf raises?$/i, 'single-leg-calf-raise'],
  [/^side planks?$/i, 'side-plank'],
  [/^step-back burpees?$/i, 'step-back-burpee'],
  [/^hip-flexor stretch(es)?$/i, 'hip-flexor-stretch'],
  [/^thoracic rotations?$/i, 'thoracic-rotation'],
  [/^cat-cows?$/i, 'cat-cow'],
  [/^standing cat-cows?$/i, 'standing-cat-cow'],
  [/^hamstring stretch(es)?$/i, 'hamstring-stretch'],
  [/^wall angels?$/i, 'wall-angel'],
  [/^standing glute kickbacks?$/i, 'standing-glute-kickback'],
  [/^march in place$/i, 'march-in-place'],
  [/^standing y-raises?$/i, 'standing-y-raise'],
  [/^desk planks?$/i, 'desk-plank'],
  [/^standing knee-to-elbows?$/i, 'standing-knee-to-elbow'],
  [/^standing side bends?$/i, 'standing-side-bend'],
  [/^seated cat-cows?$/i, 'seated-cat-cow'],
  [/^neck rolls?$/i, 'neck-roll'],
  [/^chest openers?$/i, 'chest-opener'],
  [/^seated twists?$/i, 'seated-twist'],
  [/^wrist stretch(es)?$/i, 'wrist-stretch'],
  [/^standing hamstring stretch(es)?$/i, 'standing-hamstring-stretch'],
  [/^shoulder rolls?$/i, 'shoulder-roll'],
  [/^calf raises? and reach$/i, 'calf-raise-and-reach'],
]

/** Each demo's form cue: Swolomon's voice, one {mate}, never the exercise's name. */
export const EXISTING_DEMO_LINES = [
  { id: 'form-incline-push-up', voice: 'swolomon', variants: ['Sturdy edge, straight body, {mate}. Chest to it.', 'Hands under the shoulders, {mate}. Lower slow.'] },
  { id: 'form-decline-push-up', voice: 'swolomon', variants: ['Feet up, hips level, {mate}. No sagging.', 'Chest down slow, {mate}. Head stays neutral.'] },
  { id: 'form-pike-push-up', voice: 'swolomon', variants: ['Hips high, {mate}. Crown of the head to the floor.', 'Elbows back, not out, {mate}. Press it away.'] },
  { id: 'form-wall-push-up', voice: 'swolomon', variants: ['Body straight as a board, {mate}. Lean in.', 'Heels down, chest to the wall, {mate}.'] },
  { id: 'form-desk-push-up', voice: 'swolomon', variants: ['Hands on the edge, body straight, {mate}.', 'Check the desk stays put, {mate}. Then lower slow.'] },
  { id: 'form-band-overhead-press', voice: 'swolomon', variants: ['Stand on it firm, {mate}. Press to the sky.', 'Ribs down, {mate}. Lock out overhead.'] },
  { id: 'form-dumbbell-overhead-triceps-extension', voice: 'swolomon', variants: ['Elbows by the ears, {mate}. Only the forearms move.', 'Slow behind the head, {mate}. Then reach up.'] },
  { id: 'form-dead-hang', voice: 'swolomon', variants: ['Shoulders engaged, {mate}. Long and calm.', 'Just hang out, {mate}. Breathe. Grip.'] },
  { id: 'form-pull-up-negative', voice: 'swolomon', variants: ['Jump up, then lower slow, {mate}. Three to five.', 'Fight the way down, {mate}. Slow is the point.'] },
  { id: 'form-chin-up-hold', voice: 'swolomon', variants: ['Chin over, elbows tight, {mate}. Hold.', 'Squeeze and stay up there, {mate}. Breathe.'] },
  { id: 'form-band-row', voice: 'swolomon', variants: ['Sit tall, elbows back, {mate}. Squeeze.', 'Pull to the ribs, {mate}. Slow on the way out.'] },
  { id: 'form-prone-y-raise', voice: 'swolomon', variants: ['Thumbs up, arms in a Y, {mate}. Lift.', 'Small lift, big squeeze, {mate}. Neck long.'] },
  { id: 'form-reverse-snow-angel', voice: 'swolomon', variants: ['Hover the arms, {mate}. Sweep them round.', 'Overhead to the hips and back, {mate}. Slow.'] },
  { id: 'form-band-curl', voice: 'swolomon', variants: ['Feet on the band, elbows pinned, {mate}.', 'Squeeze at the top, {mate}. Slow on the way down.'] },
  { id: 'form-goblet-squat', voice: 'swolomon', variants: ['Weight at the chest, elbows in, {mate}. Sit.', 'Chest proud, {mate}. Hug the weight down and up.'] },
  { id: 'form-jump-squat', voice: 'swolomon', variants: ['Quiet landing, {mate}. Like a cat on a cushion.', 'Sit, spring, land quiet, {mate}.'] },
  { id: 'form-banded-glute-bridge', voice: 'swolomon', variants: ['Knees push out on the band, {mate}. Hips up.', 'Squeeze at the top, {mate}. Knees stay wide.'] },
  { id: 'form-single-leg-glute-bridge', voice: 'swolomon', variants: ['One heel down, hips level, {mate}. Drive.', 'Keep the hips square, {mate}. No tipping.'] },
  { id: 'form-single-leg-calf-raise', voice: 'swolomon', variants: ['Hand on the wall, {mate}. All the way up.', 'Slow down on one foot, {mate}. Balance first.'] },
  { id: 'form-side-plank', voice: 'swolomon', variants: ['Elbow under the shoulder, hips high, {mate}.', 'Head to heels in one line, {mate}. Hold.'] },
  { id: 'form-step-back-burpee', voice: 'swolomon', variants: ['Hands down, step back, step in, {mate}. Up.', 'One foot at a time, {mate}. Smooth beats fast.'] },
  { id: 'form-hip-flexor-stretch', voice: 'swolomon', variants: ['Tuck the hips, ease forward, {mate}. Breathe.', 'One foot back, heel up, {mate}. Hips ease forward.'] },
  { id: 'form-thoracic-rotation', voice: 'swolomon', variants: ['Thread under, then open to the sky, {mate}.', 'Eyes follow the hand, {mate}. Slow turn.'] },
  { id: 'form-close-grip-desk-push-up', voice: 'swolomon', variants: ['Hands close on the edge, elbows in, {mate}.', 'Elbows brush the ribs on the way down, {mate}.'] },
  { id: 'form-standing-cat-cow', voice: 'swolomon', variants: ['Hands on the thighs, round up, then arch, {mate}.', 'Knees bent a little, slow waves down the back, {mate}.'] },
  { id: 'form-cat-cow', voice: 'swolomon', variants: ['Round up, then let it dip, {mate}. Breathe.', 'Slow waves down the back, {mate}. No rush.'] },
  { id: 'form-hamstring-stretch', voice: 'swolomon', variants: ['Heel forward, toes up, {mate}. Then hinge.', 'Hinge from the hips, {mate}. No bouncing.'] },
  { id: 'form-wall-angel', voice: 'swolomon', variants: ['Back and arms on the wall, {mate}. Slide up.', 'Slow up, slow down, {mate}. Ribs stay in.'] },
  { id: 'form-standing-glute-kickback', voice: 'swolomon', variants: ['Hand on the wall, {mate}. Leg straight back.', 'Squeeze at the back, {mate}. No arching.'] },
  { id: 'form-march-in-place', voice: 'swolomon', variants: ['Knees to the hips, {mate}. Arms swinging.', 'Tall and proud, {mate}. Left, right, left.'] },
  { id: 'form-standing-y-raise', voice: 'swolomon', variants: ['Hinge a little, thumbs up, {mate}. Make a Y.', 'Lift from the back, {mate}. Shoulders down.'] },
  { id: 'form-desk-plank', voice: 'swolomon', variants: ['Forearms on the desk, body straight, {mate}.', 'Squeeze everything, {mate}. Hold steady.'] },
  { id: 'form-standing-knee-to-elbow', voice: 'swolomon', variants: ['Knee up, elbow down, {mate}. Meet halfway.', 'Crunch to the side, {mate}. Then switch.'] },
  { id: 'form-standing-side-bend', voice: 'swolomon', variants: ['Slide the hand down the leg, {mate}. Slow.', 'Stay square, no leaning forward, {mate}.'] },
  { id: 'form-seated-cat-cow', voice: 'swolomon', variants: ['Hands on the knees, round then arch, {mate}.', 'Chest proud, then curl in, {mate}. Breathe.'] },
  { id: 'form-neck-roll', voice: 'swolomon', variants: ['Slow circles, {mate}. Then the other way.', 'Easy does it, {mate}. Small and gentle.'] },
  { id: 'form-chest-opener', voice: 'swolomon', variants: ['Hands clasped behind, lift the chest, {mate}.', 'Shoulders back and down, {mate}. Breathe in.'] },
  { id: 'form-seated-twist', voice: 'swolomon', variants: ['Hand on the far knee, look back, {mate}.', 'Sit tall, then turn, {mate}. Both sides.'] },
  { id: 'form-wrist-stretch', voice: 'swolomon', variants: ['Palm up, ease the fingers back, {mate}.', 'Gentle pull, {mate}. Both hands get a turn.'] },
  { id: 'form-standing-hamstring-stretch', voice: 'swolomon', variants: ['Heel on a low step, hinge forward, {mate}.', 'Flat back, easy on the knee, {mate}. Ease into it.'] },
  { id: 'form-shoulder-roll', voice: 'swolomon', variants: ['Big slow circles, backwards, {mate}.', 'Up, back, down, {mate}. Let the tension go.'] },
  { id: 'form-calf-raise-and-reach', voice: 'swolomon', variants: ['Up on the toes, arms high, {mate}. Slow down.', 'Reach for the ceiling, {mate}. Tall as a tree.'] },
] as const satisfies readonly LineEntry[]
