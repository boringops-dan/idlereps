/**
 * Copyright 2026 zrobok. All rights reserved: not covered by the Apache License (see NOTICE). Swolomon's
 * name, character, likeness and these moves are proprietary.
 *
 * Exercise demos (owner, 2026-10-06: "add 50 more workouts"): moves of family 'exercise' that he plays on a
 * set band for the exercise named, never collected. Each with its name patterns (matched before the general
 * ones in moves.ts) and its form cue (`form-<move id>`). Pure data, drawn by `figure.ts`.
 */

import { shift, turned } from './figure'
import type { Expr, Figure, Fx, Limb, P, Prop } from './figure'
import type { LineEntry } from './copy'
import { arms, beat, front, side, STAND_SIDE } from './move-kit'
import type { Move, MoveId } from './moves'

const MAT: Prop = { kind: 'mat', y: 15 }

const demo = (id: string, title: string, poses: Figure[], beats: [number, number][], reps: number): Move => ({ id, title, family: 'exercise', poses, beats, reps })

/** Hands together at the chest, front-on. */
const CLASPED = arms([4.5, 9.5], [7, 8.5])

// ---------------------------------------------------------------------------------------------------------
// Squats: wide, low and pulsing, held, and on one leg.

/** Front-on, feet wide and toes out; down, the knees open over the toes. `isWeighted`: one bell hangs between. */
const SUMO = (isDown: boolean, isWeighted: boolean): Figure =>
  front({
    y: isDown ? 2 : 0,
    legs: isDown
      ? [
          [[6, 12], [2.5, 11.5], [2.5, 12.5]],
          [[10, 12], [13.5, 11.5], [13.5, 12.5]],
        ]
      : [
          [[6, 12], [3.5, 14.5]],
          [[10, 12], [12.5, 14.5]],
        ],
    arms: isWeighted ? arms([6, 10], [7.3, 12]) : CLASPED,
    props: isWeighted ? [{ kind: 'dumbbell', at: [7.5, 12.5], upright: true }] : [],
    ...(isDown ? { expr: 'strain' as const } : {}),
  })

const dumbbellSumoSquat = demo('dumbbell-sumo-squat', 'Dumbbell sumo squats', [SUMO(false, true), SUMO(true, true)], beat([0, 450], [1, 650]), 4)
const sumoSquat = demo('sumo-squat', 'Sumo squats', [SUMO(false, false), SUMO(true, false)], beat([0, 450], [1, 650]), 4)

/** In profile at the bottom of a squat, `lift` pixels up from it. */
const LOW = (lift: number, arms: [Limb, Limb], expr: Expr = 'strain', fx: readonly Fx[] = []): Figure =>
  side({
    head: [6, 3 - lift],
    neck: [8, 9 - lift],
    hip: [5, 12 - lift],
    arms,
    legs: [
      [[5, 12.5 - lift], [9, 12.5 - lift / 2], [8, 14.5]],
      [[6, 13 - lift], [10, 13 - lift / 2], [9, 14.5]],
    ],
    expr,
    fx,
  })

const pulseSquat = demo(
  'pulse-squat',
  'Pulse squats',
  [0, 1].map(lift =>
    LOW(lift, [
      [[8, 10 - lift], [10.5, 11 - lift], [10.5, 9 - lift]],
      [[9, 10 - lift], [11.5, 11 - lift], [11, 9 - lift]],
    ]),
  ),
  beat([0, 250], [1, 250]),
  7,
)

const REACH: [Limb, Limb] = [
  [[8, 10], [11, 9.5], [14, 9.5]],
  [[9, 10], [12, 10], [15, 10]],
]
const squatHold = demo(
  'squat-hold',
  'Squat hold',
  [LOW(0, REACH, 'grin'), LOW(0, REACH, 'strain', [{ kind: 'drop', at: [12, 2] }]), LOW(0, REACH, 'strain', [{ kind: 'sweat', at: [12, 3] }, { kind: 'drop', at: [4, 2] }])],
  beat([0, 500], [1, 150], [0, 150], [1, 150], [2, 800]),
  2,
)

/** Arms out front for balance; the free leg straight out ahead, the other folding slowly under him. */
const pistolSquatNegative = demo(
  'pistol-squat-negative',
  'Pistol squat negatives',
  [
    side({
      head: [5, 0],
      neck: [8, 6],
      hip: [8, 10.5],
      arms: [
        [[7.5, 7], [10, 7.5], [13, 7.5]],
        [[8.5, 7], [11, 7.5], [14, 7.5]],
      ],
      legs: [
        [[7.5, 12], [7.5, 14.5]],
        [[8.5, 11.5], [11.5, 11.5], [14.5, 11.5]],
      ],
      seat: [9.5, 11.5],
    }),
    side({
      head: [5.5, 2],
      neck: [8, 8],
      hip: [6.5, 11.5],
      arms: [
        [[7.5, 9], [10, 9], [13, 9]],
        [[8.5, 9], [11, 9], [14, 9]],
      ],
      legs: [
        [[6.5, 12], [9, 12.5], [8, 14.5]],
        [[7, 12], [11, 12], [15, 12]],
      ],
      expr: 'strain',
    }),
    side({
      head: [6, 4],
      neck: [8, 10],
      hip: [5, 13],
      arms: [
        [[7.5, 11], [10.5, 10.5], [13.5, 10.5]],
        [[8.5, 11], [11.5, 10.5], [14.5, 10.5]],
      ],
      legs: [
        [[5, 13.5], [9, 13], [7.5, 14.5]],
        [[5.5, 13.5], [10, 13.5], [14.5, 13]],
      ],
      expr: 'strain',
    }),
  ],
  beat([0, 400], [1, 800], [2, 800]),
  2,
)

// ---------------------------------------------------------------------------------------------------------
// Steps and split squats: a chair for the step and the bench.

/**
 * Up onto a step, facing left: drawn facing right and turned, so the chair's back is on the far side. Its
 * seat is the step (the top row 13); `bell`: a dumbbell in the near hand.
 */
const STEP = (isUp: boolean, isWeighted: boolean): Figure =>
  turned(
    isUp
      ? side({
          head: [7, 0],
          neck: [10, 6],
          hip: [10, 9.5],
          arms: [
            [[9.5, 6.5], [9, 8.5], [9, 10.5]],
            [[10.5, 6.5], [11, 8.5], [11, 10.5]],
          ],
          legs: [
            [[9.5, 10.5], [9.5, 12]],
            [[10.5, 10.5], [11, 12]],
          ],
          seat: [10, 11],
          props: [{ kind: 'chair', at: [14, 11] }, ...(isWeighted ? [{ kind: 'dumbbell' as const, at: [11, 11] as P }] : [])],
        })
      : side({
          head: [2, 0],
          neck: [5, 6],
          hip: [5, 10.5],
          arms: isWeighted
            ? [
                [[4.5, 7], [4.5, 9.5], [4.5, 11.5]],
                [[5.5, 7], [5.5, 9.5], [5.5, 11.5]],
              ]
            : [
                [[4.5, 7], [6, 9], [7.5, 10]],
                [[5.5, 7], [4.5, 9.5], [3.5, 11]],
              ],
          legs: [
            [[4.5, 12], [4.5, 14.5]],
            [[5.5, 12], [9, 10.5], [11, 12]],
          ],
          expr: 'strain',
          props: [{ kind: 'chair', at: [14, 11] }, ...(isWeighted ? [{ kind: 'dumbbell' as const, at: [5.5, 12] as P }] : [])],
        }),
  )

const dumbbellStepUp = demo('dumbbell-step-up', 'Dumbbell step-ups', [STEP(false, true), STEP(true, true)], beat([0, 450], [1, 650]), 4)
const stepUp = demo('step-up', 'Step-ups', [STEP(false, false), STEP(true, false)], beat([0, 450], [1, 650]), 4)

/** The back foot up on the chair behind him, the front leg doing the work; `isWeighted`: bells in his hands. */
const SPLIT = (isDown: boolean, isWeighted: boolean): Figure => {
  const y = isDown ? 2 : 0
  const hang = (x: number): Limb => [[x, 7 + y], [x, 9.5 + y], [x, 11.5 + y]]
  return side({
    head: [7, 0 + y + (isDown ? 1 : 0)],
    neck: [9, 6 + y + (isDown ? 1 : 0)],
    hip: isDown ? [8, 12.5] : [8.5, 10.5],
    arms: isWeighted
      ? [hang(8.5), hang(9.5)]
      : [
          [[8.5, 7 + y], [10.5, 8.5 + y], [10.5, 7 + y]],
          [[9.5, 7 + y], [11.5, 8.5 + y], [11, 7 + y]],
        ],
    legs: isDown
      ? [
          [[7.5, 13], [6, 14.5], [3.5, 11]],
          [[8.5, 13], [12, 12.5], [12, 14.5]],
        ]
      : [
          [[8, 11.5], [6, 13], [3.5, 11]],
          [[9, 11.5], [11, 13], [11, 14.5]],
        ],
    props: [{ kind: 'chair', at: [0, 10] }, ...(isWeighted ? [{ kind: 'dumbbell' as const, at: [9.5, 12 + y] as P }] : [])],
    ...(isDown ? { expr: 'strain' as const } : {}),
  })
}

const dumbbellBulgarianSplitSquat = demo('dumbbell-bulgarian-split-squat', 'Dumbbell Bulgarian split squats', [SPLIT(false, true), SPLIT(true, true)], beat([0, 450], [1, 700]), 3)
const bulgarianSplitSquat = demo('bulgarian-split-squat', 'Bulgarian split squats', [SPLIT(false, false), SPLIT(true, false)], beat([0, 450], [1, 700]), 3)

// ---------------------------------------------------------------------------------------------------------
// Lunges: to the side, across behind, and jumping.

/** Front-on, sitting into his left hip with the right leg long; turned for the other side. */
const SIDE_LUNGE = front({
  x: -2,
  y: 2,
  legs: [
    [[6, 12], [3, 11.5], [3.5, 12.5]],
    [[10, 12], [15, 12.5]],
  ],
  arms: CLASPED,
  expr: 'strain',
})
const lateralLunge = demo('lateral-lunge', 'Lateral lunges', [front({ arms: CLASPED }), SIDE_LUNGE, turned(SIDE_LUNGE)], beat([0, 350], [1, 600], [0, 350], [2, 600]), 2)

/** Hands out low as if holding a skirt: one leg steps back behind the other, across. */
const CURTSY_ARMS = arms([2.5, 10], [1.5, 12])
const CURTSY = front({
  y: 0.5,
  legs: [
    [[6, 12], [4, 12.5], [4.5, 14]],
    [[10, 12], [6.5, 14], [1.5, 14]],
  ],
  arms: CURTSY_ARMS,
  expr: 'smirk',
})
const curtsyLunge = demo('curtsy-lunge', 'Curtsy lunges', [front({ arms: CURTSY_ARMS }), CURTSY, turned(CURTSY)], beat([0, 350], [1, 600], [0, 350], [2, 600]), 2)

/** Low in a lunge; `isSwapped`: the other leg in front (the far one, in shade), the arms swapped too. */
const LUNGE = (isSwapped: boolean): Figure => {
  const forward: Limb = [[8.5, 12.5], [12, 12.5], [12, 14.5]]
  const back: Limb = [[7, 12.5], [4, 14.5], [1, 14.5]]
  const up: Limb = [[8.5, 10], [10.5, 11], [11.5, 9.5]]
  const down: Limb = [[7.5, 10], [5.5, 11.5], [4.5, 13]]
  return side({
    head: [5, 3],
    neck: [8, 9],
    hip: [7.5, 12],
    arms: isSwapped ? [up, down] : [down, up],
    legs: isSwapped ? [forward, back] : [back, forward],
    seat: [8, 13],
    expr: 'strain',
  })
}
const AIRBORNE = side({
  head: [5, 0],
  neck: [8, 6],
  hip: [8, 10.5],
  arms: [
    [[7.5, 7], [6, 5], [6.5, 2.5]],
    [[8.5, 7], [10, 5], [9.5, 2.5]],
  ],
  legs: [
    [[7.5, 11.5], [5.5, 12], [4.5, 13]],
    [[8.5, 11.5], [10.5, 11.5], [10.5, 13]],
  ],
  expr: 'talk',
  fx: [{ kind: 'puff', at: [6, 14] }],
})
const jumpingLunge = demo('jumping-lunge', 'Jumping lunges', [LUNGE(false), AIRBORNE, LUNGE(true)], beat([0, 400], [1, 250], [2, 400], [1, 250]), 3)

// ---------------------------------------------------------------------------------------------------------
// Glutes and shins: the band, all fours, the mat, the wall.

/** Half-squatting front-on with a loop round the ankles; `wide`: one foot stepped out (-1 left, 1 right). */
const WALK = (x: number, wide: -1 | 0 | 1): Figure => {
  const l: P = wide === -1 ? [2, 14.5] : [4, 14.5]
  const r: P = wide === 1 ? [14, 14.5] : [12, 14.5]
  return front({
    x,
    legs: [
      [[6, 12], l],
      [[10, 12], r],
    ],
    arms: CLASPED,
    expr: wide === 0 ? 'grin' : 'strain',
    props: [{ kind: 'band', from: [l[0] + 1.5, 13.5], to: [r[0] - 1.5, 13.5] }],
  })
}
const bandedLateralWalk = demo('banded-lateral-walk', 'Banded lateral walks', [WALK(-1, 0), WALK(-1, 1), WALK(1, 0), WALK(1, -1)], beat([0, 350], [1, 350], [2, 350], [3, 350]), 3)

/** On hands and knees in profile, facing right, on the mat. */
type FoursOpts = { neck?: P; head?: P; backArm?: Limb; frontArm?: Limb; backLeg?: Limb; frontLeg?: Limb; expr?: Expr; fx?: readonly Fx[] }
const FOURS = (o: FoursOpts = {}): Figure =>
  side({
    head: o.head ?? [10, 5],
    neck: o.neck ?? [10.5, 10],
    hip: [4.5, 10],
    arms: [o.backArm ?? [[10, 10.5], [10, 12.5], [10, 14.5]], o.frontArm ?? [[11, 10.5], [11, 12.5], [11, 14.5]]],
    legs: [o.backLeg ?? [[4.5, 10.5], [4.5, 14.5], [1, 14.5]], o.frontLeg ?? [[5, 10.5], [5, 14.5], [1.5, 14.5]]],
    seat: [4.5, 12],
    props: [MAT],
    ...(o.expr === undefined ? {} : { expr: o.expr }),
    ...(o.fx === undefined ? {} : { fx: o.fx }),
  })

const donkeyKick = demo('donkey-kick', 'Donkey kicks', [FOURS(), FOURS({ frontLeg: [[5, 10.5], [1, 10], [1, 6.5]], expr: 'strain' })], beat([0, 450], [1, 600]), 4)

/** Front-on on all fours, facing you: the knee swings out to the side at hip height. */
const HYDRANT = (isOut: boolean): Figure => ({
  head: { at: [5, 3], facing: 'front', ...(isOut ? { expr: 'strain' as const } : {}) },
  torso: { from: [8, 8.5], to: [8, 11] },
  shorts: { from: [8, 11], to: [8, 12.5] },
  backArm: [[4.5, 9], [4, 12], [4, 14.5]],
  frontArm: [[11.5, 9], [12, 12], [12, 14.5]],
  backLeg: [[6, 12.5], [6, 14.5]],
  frontLeg: isOut ? [[10, 12], [14, 11], [15, 13.5]] : [[10, 12.5], [10, 14.5]],
  props: [MAT],
})
const fireHydrant = demo('fire-hydrant', 'Fire hydrants', [HYDRANT(false), HYDRANT(true)], beat([0, 450], [1, 600]), 4)

/** On his back, soles together and knees open wide (low, in profile), the hips pumping up. */
const FROG = (isUp: boolean): Figure =>
  side({
    head: [10, 9],
    neck: [10.5, 14],
    hip: isUp ? [6, 11] : [6, 14],
    arms: [
      [[10, 14], [8, 14.5], [6, 14.5]],
      [[11, 14], [9, 14.5], [7, 14.5]],
    ],
    legs: isUp
      ? [
          [[6, 11.5], [2, 13], [4, 14.5]],
          [[6, 11], [1.5, 12.5], [4.5, 14.5]],
        ]
      : [
          [[6, 14], [2.5, 13], [3, 14.5]],
          [[6, 13.5], [2, 12.5], [3.5, 14.5]],
        ],
    seat: isUp ? [4.5, 11.5] : [4.5, 13.5],
    props: [MAT],
    ...(isUp ? { expr: 'strain' as const } : {}),
  })
const frogPump = demo('frog-pump', 'Frog pumps', [FROG(false), FROG(true)], beat([0, 300], [1, 300]), 6)

/** Leaning back on the wall, heels out in front: the toes come up off the floor. */
const TIBIALIS = (isUp: boolean): Figure =>
  side({
    head: [1, 0],
    neck: [3, 6],
    hip: [4, 10.5],
    arms: [
      [[2.5, 7], [2.5, 9.5], [3, 11.5]],
      [[3.5, 7], [3.5, 9.5], [4, 11.5]],
    ],
    legs: isUp
      ? [
          [[3.5, 11.5], [7, 14.5], [8.5, 13]],
          [[4.5, 11.5], [8, 14.5], [9.5, 13]],
        ]
      : [
          [[3.5, 11.5], [7, 14.5]],
          [[4.5, 11.5], [8, 14.5]],
        ],
    seat: [5, 12],
    props: [{ kind: 'wall', x: 0 }],
    expr: isUp ? 'strain' : 'grin',
  })
const tibialisRaise = demo('tibialis-raise', 'Tibialis raises', [TIBIALIS(false), TIBIALIS(true)], beat([0, 400], [1, 500]), 4)

// ---------------------------------------------------------------------------------------------------------
// Core: holds, crawls, crunches.

/** On his back, shoulders and legs off the mat, arms by the ears: a banana. `isSet`: all the way. */
const HOLLOW = (isSet: boolean, fx: readonly Fx[] = []): Figure =>
  side({
    head: [10, isSet ? 7.5 : 9],
    neck: [10.5, isSet ? 12.5 : 14],
    hip: [6, 14],
    arms: [
      [[10, isSet ? 12.5 : 14], [12.5, isSet ? 11 : 13], [15, isSet ? 10 : 12.5]],
      [[11, isSet ? 12.5 : 14], [13.5, isSet ? 11.5 : 13.5], [15.5, isSet ? 10.5 : 13.5]],
    ],
    legs: [
      [[6, 14], [3, isSet ? 13 : 14], [0.5, isSet ? 11.5 : 14]],
      [[6, 14.5], [3, isSet ? 13.5 : 14.5], [0.5, isSet ? 12 : 14.5]],
    ],
    seat: [4.5, 14],
    props: [MAT],
    expr: isSet ? 'strain' : 'grin',
    fx,
  })
const hollowHold = demo('hollow-hold', 'Hollow hold', [HOLLOW(false), HOLLOW(true), HOLLOW(true, [{ kind: 'drop', at: [8, 5] }]), HOLLOW(true, [{ kind: 'sweat', at: [8, 4] }, { kind: 'drop', at: [15, 5] }])], beat([0, 400], [1, 500], [2, 150], [1, 150], [3, 700]), 2)

/** All fours with the knees an inch off the mat, under the hips, on the toes. */
const HOVER: [Limb, Limb] = [
  [[4.5, 10.5], [6.5, 13], [3, 14.5]],
  [[5, 10.5], [7, 13], [3.5, 14.5]],
]
const bearCrawlHold = demo(
  'bear-crawl-hold',
  'Bear crawl hold',
  [FOURS(), FOURS({ backLeg: HOVER[0], frontLeg: HOVER[1], expr: 'strain' }), FOURS({ backLeg: HOVER[0], frontLeg: HOVER[1], expr: 'strain', fx: [{ kind: 'sweat', at: [9, 3] }, { kind: 'drop', at: [15, 4] }] })],
  beat([0, 400], [1, 700], [2, 900]),
  2,
)

/** All fours, one arm reaching out front and the other side's leg out behind: near arm and far leg, or the reverse. */
const LONG_ARM = (x: number): Limb => [[x, 10.5], [x + 2.5, 9.5], [x + 5, 9]]
const LONG_LEG = (x: number): Limb => [[x, 10.5], [x - 2.5, 10], [x - 5, 10]]
const birdDog = demo(
  'bird-dog',
  'Bird dogs',
  [FOURS(), FOURS({ backArm: LONG_ARM(10), frontLeg: LONG_LEG(5), expr: 'strain' }), FOURS({ frontArm: LONG_ARM(11), backLeg: LONG_LEG(4.5), expr: 'strain' })],
  beat([0, 350], [1, 650], [0, 350], [2, 650]),
  2,
)

/** On his back, shoulders up, hands at his head: one knee in to meet the opposite elbow, the other leg long. */
const BICYCLE = (isNear: boolean): Figure => {
  // The far knee and leg sit a little apart from the near ones, or the switch would not show when tiny.
  const tuck: Limb = isNear ? [[5, 13.5], [8, 9], [4.5, 9.5]] : [[5, 13.5], [6.5, 9.5], [3, 10]]
  const long: Limb = isNear ? [[5, 14], [2.5, 13], [0, 12.5]] : [[5, 14], [2.5, 14], [0, 14]]
  return side({
    head: [10, 7],
    neck: [10, 12],
    hip: [5, 14],
    arms: [
      [[10, 12], [isNear ? 12 : 9, 9.5], [12, 8.5]],
      [[10.5, 12], [isNear ? 9 : 12, 9.5], [13, 8.5]],
    ],
    legs: isNear ? [long, tuck] : [tuck, long],
    seat: [4.5, 13.5],
    props: [MAT],
    expr: 'strain',
  })
}
const bicycleCrunch = demo('bicycle-crunch', 'Bicycle crunches', [BICYCLE(true), BICYCLE(false)], beat([0, 450], [1, 450]), 5)

/** On his back, arms down on the mat: knees at a table, then the hips curl up and the knees come to the chest. */
const REVERSE = (isCurled: boolean): Figure =>
  side({
    head: [10, 9],
    neck: [10.5, 14],
    hip: isCurled ? [6.5, 12.5] : [5, 14],
    arms: [
      [[10, 14], [8, 14.5], [5.5, 14.5]],
      [[11, 14], [9, 14.5], [6.5, 14.5]],
    ],
    legs: isCurled
      ? [
          [[6.5, 12.5], [8, 8.5], [5, 7]],
          [[7, 12.5], [8.5, 8.5], [5.5, 7]],
        ]
      : [
          [[5, 14], [5, 10], [1.5, 10]],
          [[5.5, 14], [5.5, 10], [2, 10]],
        ],
    seat: isCurled ? [7, 11] : [5, 12.5],
    props: [MAT],
    ...(isCurled ? { expr: 'strain' as const } : {}),
  })
const reverseCrunch = demo('reverse-crunch', 'Reverse crunches', [REVERSE(false), REVERSE(true)], beat([0, 450], [1, 600]), 4)

/** Front-on, on his side up on one forearm, the free hand to the sky: the hip taps the mat, then lifts high. */
const SIDE_PLANK = (isDipped: boolean): Figure => {
  const y = isDipped ? 2.5 : 0
  return {
    head: { at: [10, 4], facing: 'front', ...(isDipped ? { expr: 'strain' as const } : {}) },
    torso: { from: [11.5, 10], to: [6.5, 11.5 + y], width: 4 },
    shorts: { from: [6.5, 11.5 + y], to: [4.5, 12 + y], width: 4 },
    backArm: [[12.5, 10.5], [12.5, 14.5], [15, 14.5]],
    frontArm: [[10, 10], [8.5, 7], [8, 3.5]],
    backLeg: [[4.5, 12.5 + y / 2], [0.5, 14.5]],
    frontLeg: [[4.5, 12 + y / 2], [0.5, 14]],
    props: [MAT],
  }
}
const sidePlankHipDip = demo('side-plank-hip-dip', 'Side plank hip dips', [SIDE_PLANK(false), SIDE_PLANK(true)], beat([0, 500], [1, 500]), 4)

// ---------------------------------------------------------------------------------------------------------
// Cardio.

/** Up on straight arms, one knee driving in under the chest and the other leg long: near or far. */
const CLIMB = (isNear: boolean): Figure => {
  // The near knee drives a little further, or the switch would not show when tiny.
  const driven: Limb = isNear ? [[5, 11.5], [9, 12], [7, 14]] : [[5, 11.5], [7.5, 13], [5.5, 14.5]]
  const long: Limb = isNear ? [[5, 12], [2.5, 13.5], [0, 14.5]] : [[5, 12], [2.5, 12.5], [0.5, 13.5]]
  return side({
    head: [10, 4],
    neck: [10, 9.5],
    hip: [5, 11],
    arms: [
      [[9.5, 10], [10, 12.5], [10, 15]],
      [[10.5, 10], [11, 12.5], [11, 15]],
    ],
    legs: isNear ? [long, driven] : [driven, long],
    seat: [4, 11.8],
    expr: 'strain',
    ...(isNear ? { fx: [{ kind: 'drop' as const, at: [15, 3] }] } : {}),
  })
}
const mountainClimber = demo('mountain-climber', 'Mountain climbers', [CLIMB(true), CLIMB(false)], beat([0, 220], [1, 220]), 8)

/** Front-on, one knee up to the hip and the opposite arm pumping, off the ground; turned for the other knee. */
const KNEE = front({
  y: -1,
  legs: [
    [[6, 12], [4.5, 9.5], [5, 12]],
    [[10, 12], [10, 14.5]],
  ],
  arms: [
    [[4.5, 7], [3.5, 9.5], [3.5, 11.5]],
    [[11.5, 7], [13.5, 8.5], [12.5, 5.5]],
  ],
  expr: 'talk',
  fx: [{ kind: 'sweat', at: [15, 1] }],
})
const highKnee = demo('high-knee', 'High knees', [KNEE, turned(KNEE)], beat([0, 220], [1, 220]), 7)

/** Bounding sideways: landed on the left leg, the right swept behind it, arms swung across; turned for the right. */
const SKATE = front({
  x: -3,
  y: 1,
  legs: [
    [[6, 12], [5, 13], [5.5, 13.5]],
    [[10, 12], [7, 13], [3, 13.5]],
  ],
  arms: [
    [[4.5, 7], [2.5, 8.5], [1, 7.5]],
    [[11.5, 7], [9.5, 9.5], [6.5, 10]],
  ],
  expr: 'strain',
})
const SKATE_AIR = front({ y: -1, arms: arms([2.5, 6], [1, 4.5]), legs: [[[6, 12], [5, 13.5]], [[10, 12], [11, 13.5]]], expr: 'talk' })
const skater = demo('skater', 'Skaters', [SKATE, SKATE_AIR, turned(SKATE)], beat([0, 400], [1, 200], [2, 400], [1, 200]), 3)

// ---------------------------------------------------------------------------------------------------------
// Mobility.

/** A deep lunge, both hands down inside the front foot; `isOpen`: the near arm turned up to the sky. */
const GREATEST = (isOpen: boolean): Figure =>
  side({
    head: [10, 3],
    neck: [10, 9],
    hip: [6.5, 12],
    arms: [
      [[9.5, 9.5], [10, 12], [10.5, 14.5]],
      isOpen ? [[10.5, 9.5], [9.5, 6], [8.5, 2.5]] :[[10.5, 9.5], [11, 12], [11.5, 14.5]],
    ],
    legs: [
      [[6.5, 12.5], [3.5, 13.5], [0.5, 14.5]],
      [[7, 12.5], [12, 12], [13, 14.5]],
    ],
    seat: [8, 12.5],
    expr: 'blink',
  })
const worldsGreatestStretch = demo('worlds-greatest-stretch', "World's greatest stretch", [GREATEST(false), GREATEST(true)], beat([0, 800], [1, 1200]), 2)

/** All fours: the near arm slides under him along the mat, shoulder down, then opens up to the sky. */
const threadTheNeedle = demo(
  'thread-the-needle',
  'Thread the needle',
  [
    FOURS({ expr: 'blink' }),
    FOURS({ head: [9, 8], neck: [10, 12], frontArm: [[10, 12.5], [7.5, 14], [4, 14.5]], expr: 'blink' }),
    FOURS({ frontArm: [[11, 10], [11, 6.5], [11, 3]], expr: 'blink' }),
  ],
  beat([0, 500], [1, 1000], [0, 400], [2, 1000]),
  2,
)

/** Kneeling: up tall with the arms overhead, then folded down over the knees, arms long on the mat. */
const CHILD_FOLD = (breath: number): Figure =>
  side({
    head: [9.5, 9 - breath],
    neck: [9.5, 12 - breath],
    hip: [4, 12],
    arms: [
      [[9, 12.5 - breath], [12, 14], [15, 14]],
      [[10, 12.5 - breath], [13, 14.5], [15.5, 14.5]],
    ],
    legs: [
      [[4, 12.5], [8, 14], [2.5, 14.5]],
      [[4.5, 12.5], [8.5, 14.5], [3, 14.5]],
    ],
    seat: [6, 13],
    props: [MAT],
    expr: 'sleep',
  })
const childsPose = demo(
  'childs-pose',
  "Child's pose",
  [
    side({
      head: [3, 2],
      neck: [5, 8],
      hip: [4, 12],
      arms: [
        [[4.5, 8.5], [5.5, 5.5], [6.5, 2.5]],
        [[5.5, 8.5], [6.5, 5.5], [7.5, 2.5]],
      ],
      legs: [
        [[4, 12.5], [8, 14], [2.5, 14.5]],
        [[4.5, 12.5], [8.5, 14.5], [3, 14.5]],
      ],
      seat: [6, 13],
      props: [MAT],
      expr: 'blink',
    }),
    CHILD_FOLD(0),
    CHILD_FOLD(0.5),
  ],
  beat([0, 600], [1, 900], [2, 900]),
  2,
)

/** From a high plank the hips go up and back: an upside-down V, heels to the mat. */
const downwardDog = demo(
  'downward-dog',
  'Downward dog',
  [
    side({
      head: [10, 4],
      neck: [10, 9.5],
      hip: [5, 11],
      arms: [
        [[9.5, 10], [10, 12.5], [10, 15]],
        [[10.5, 10], [11, 12.5], [11, 15]],
      ],
      legs: [
        [[5, 11.5], [2.5, 13], [0.5, 14.5]],
        [[5, 11], [2.5, 12.5], [0.5, 14]],
      ],
      seat: [4, 11.8],
      props: [MAT],
    }),
    side({
      head: [7.5, 7.5],
      neck: [9.5, 8.5],
      hip: [6, 4],
      arms: [
        [[9.5, 9], [11, 12], [12.5, 14.5]],
        [[10.5, 9], [12, 12], [13.5, 14.5]],
      ],
      legs: [
        [[5.5, 4.5], [3.5, 9.5], [1.5, 14.5]],
        [[6.5, 4.5], [4.5, 9.5], [2.5, 14.5]],
      ],
      seat: [5, 6],
      props: [MAT],
      expr: 'blink',
    }),
  ],
  beat([0, 600], [1, 1400]),
  2,
)

export const NEW_B_DEMOS: readonly Move[] = [
  dumbbellSumoSquat,
  sumoSquat,
  pulseSquat,
  pistolSquatNegative,
  dumbbellStepUp,
  dumbbellBulgarianSplitSquat,
  lateralLunge,
  curtsyLunge,
  jumpingLunge,
  stepUp,
  bulgarianSplitSquat,
  bandedLateralWalk,
  donkeyKick,
  fireHydrant,
  frogPump,
  tibialisRaise,
  squatHold,
  hollowHold,
  bearCrawlHold,
  birdDog,
  bicycleCrunch,
  reverseCrunch,
  sidePlankHipDip,
  mountainClimber,
  highKnee,
  skater,
  worldsGreatestStretch,
  threadTheNeedle,
  childsPose,
  downwardDog,
]

/** Exercise names to these demos, most specific first: each the whole name, so a general one never lands here. */
export const NEW_B_DEMO_BY_NAME: readonly (readonly [RegExp, MoveId])[] = [
  [/^dumbbell sumo squats?$/i, 'dumbbell-sumo-squat'],
  [/^sumo squats?$/i, 'sumo-squat'],
  [/^pulse squats?$/i, 'pulse-squat'],
  [/^pistol squat negatives?$/i, 'pistol-squat-negative'],
  [/^dumbbell step-?ups?$/i, 'dumbbell-step-up'],
  [/^dumbbell bulgarian split squats?$/i, 'dumbbell-bulgarian-split-squat'],
  [/^lateral lunges?$/i, 'lateral-lunge'],
  [/^curtsy lunges?$/i, 'curtsy-lunge'],
  [/^jumping lunges?$/i, 'jumping-lunge'],
  [/^step-?ups?$/i, 'step-up'],
  [/^bulgarian split squats?$/i, 'bulgarian-split-squat'],
  [/^banded lateral walks?$/i, 'banded-lateral-walk'],
  [/^donkey kicks?$/i, 'donkey-kick'],
  [/^fire hydrants?$/i, 'fire-hydrant'],
  [/^frog pumps?$/i, 'frog-pump'],
  [/^tibialis raises?$/i, 'tibialis-raise'],
  [/^squat hold$/i, 'squat-hold'],
  [/^hollow (body )?hold$/i, 'hollow-hold'],
  [/^bear crawl hold$/i, 'bear-crawl-hold'],
  [/^bird[- ]?dogs?$/i, 'bird-dog'],
  [/^bicycle crunch(es)?$/i, 'bicycle-crunch'],
  [/^reverse crunch(es)?$/i, 'reverse-crunch'],
  [/^side plank hip dips?$/i, 'side-plank-hip-dip'],
  [/^mountain climbers?$/i, 'mountain-climber'],
  [/^high knees?$/i, 'high-knee'],
  [/^skaters?$/i, 'skater'],
  [/^world['’]?s greatest stretch$/i, 'worlds-greatest-stretch'],
  [/^thread the needle$/i, 'thread-the-needle'],
  [/^child['’]?s pose$/i, 'childs-pose'],
  [/^downward(-facing)? dog$/i, 'downward-dog'],
]

/** Each demo's form cue: Swolomon's voice, one {mate}, never the exercise's name. */
export const NEW_B_DEMO_LINES = [
  { id: 'form-dumbbell-sumo-squat', voice: 'swolomon', variants: ['Toes out, knees out, {mate}. The weight hangs straight down.', 'Wide feet, tall chest, {mate}. Sit between the heels.'] },
  { id: 'form-sumo-squat', voice: 'swolomon', variants: ['Wide stance, toes out, {mate}. Knees follow the toes.', 'Sit straight down, {mate}. Chest proud.'] },
  { id: 'form-pulse-squat', voice: 'swolomon', variants: ['Stay low, {mate}. Little bounces, never stand up.', 'Tiny pulses at the bottom, {mate}. Heels down.'] },
  { id: 'form-pistol-squat-negative', voice: 'swolomon', variants: ['Slow on the way down, {mate}. Count to four.', 'Arms out for balance, {mate}. Sit back slow.'] },
  { id: 'form-dumbbell-step-up', voice: 'swolomon', variants: ['Drive through the top heel, {mate}. No push off the back foot.', 'Weights hang still, {mate}. Stand all the way up.'] },
  { id: 'form-dumbbell-bulgarian-split-squat', voice: 'swolomon', variants: ['Front knee over the toes, {mate}. Drop straight down.', 'Back foot just rests, {mate}. Weights hang quiet.'] },
  { id: 'form-lateral-lunge', voice: 'swolomon', variants: ['Sit into one hip, {mate}. The other leg stays long.', 'Push back to the middle, {mate}. Chest up.'] },
  { id: 'form-curtsy-lunge', voice: 'swolomon', variants: ['Step back and across, {mate}. Very polite.', 'Hips square to the front, {mate}. Like royalty.'] },
  { id: 'form-jumping-lunge', voice: 'swolomon', variants: ['Land quiet, {mate}. Switch legs in the air.', 'Knees track the toes, {mate}. Spring right back up.'] },
  { id: 'form-step-up', voice: 'swolomon', variants: ['Whole foot on the step, {mate}. Stand tall on top.', 'Step down slow, {mate}. Every inch of it.'] },
  { id: 'form-bulgarian-split-squat', voice: 'swolomon', variants: ['Back foot on the chair, {mate}. The front leg works.', 'Torso tall, {mate}. Drop until the back knee nearly kisses.'] },
  { id: 'form-banded-lateral-walk', voice: 'swolomon', variants: ['Small steps, knees out, {mate}. Do not let the band win.', 'Stay low, {mate}. Sideways like a crab with goals.'] },
  { id: 'form-donkey-kick', voice: 'swolomon', variants: ['Knee bent, heel to the ceiling, {mate}.', 'Flat back, {mate}. Squeeze at the top.'] },
  { id: 'form-fire-hydrant', voice: 'swolomon', variants: ['Knee out to the side, {mate}. Hips stay level.', 'Slow lift, slow lower, {mate}. No tipping over.'] },
  { id: 'form-frog-pump', voice: 'swolomon', variants: ['Soles together, knees wide, {mate}. Squeeze up.', 'Quick little lifts, {mate}. Squeeze every one.'] },
  { id: 'form-tibialis-raise', voice: 'swolomon', variants: ['Back on the wall, {mate}. Toes to the ceiling.', 'Heels stay down, {mate}. Lift the toes slow.'] },
  { id: 'form-squat-hold', voice: 'swolomon', variants: ['Stay down, {mate}. Thighs low, chest up, breathe.', 'Heels heavy, {mate}. You live down here now.'] },
  { id: 'form-hollow-hold', voice: 'swolomon', variants: ['Low back glued down, {mate}. Be a banana.', 'Arms by the ears, {mate}. Legs long and low.'] },
  { id: 'form-bear-crawl-hold', voice: 'swolomon', variants: ['Knees an inch up, {mate}. Back flat as a table.', 'Hover, {mate}. The knees never touch down.'] },
  { id: 'form-bird-dog', voice: 'swolomon', variants: ['Reach long both ways, {mate}. Hips stay level.', 'Slow and steady, {mate}. Balance a cup on your back.'] },
  { id: 'form-bicycle-crunch', voice: 'swolomon', variants: ['Elbow to the other knee, {mate}. Slow pedals.', 'Twist from the ribs, {mate}. Not the neck.'] },
  { id: 'form-reverse-crunch', voice: 'swolomon', variants: ['Curl the hips up, {mate}. No swinging.', 'Knees to the chest, {mate}. Lower them slow.'] },
  { id: 'form-side-plank-hip-dip', voice: 'swolomon', variants: ['Elbow under the shoulder, {mate}. Dip and lift.', 'Tap the hip down, {mate}. Then lift it high.'] },
  { id: 'form-mountain-climber', voice: 'swolomon', variants: ['Hips low, {mate}. Drive the knees.', 'Hands under the shoulders, {mate}. Quick feet.'] },
  { id: 'form-high-knee', voice: 'swolomon', variants: ['Knees to the hips, {mate}. Light on the toes.', 'Drive the arms, {mate}. Quick and light!'] },
  { id: 'form-skater', voice: 'swolomon', variants: ['Leap side to side, {mate}. Land on one foot.', 'Stick each landing, {mate}. Swing the arms across.'] },
  { id: 'form-worlds-greatest-stretch', voice: 'swolomon', variants: ['Hand down, other arm to the sky, {mate}.', 'Follow the hand with your eyes, {mate}. Breathe.'] },
  { id: 'form-thread-the-needle', voice: 'swolomon', variants: ['Slide the arm under, {mate}. Shoulder to the mat.', 'Open up to the sky, {mate}. Slow and easy.'] },
  { id: 'form-childs-pose', voice: 'swolomon', variants: ['Hips to the heels, {mate}. Arms long, breathe.', 'Rest here, {mate}. Forehead down, let it all go.'] },
  { id: 'form-downward-dog', voice: 'swolomon', variants: ['Hips high, heels down, {mate}. An upside-down V.', 'Press through the palms, {mate}. Long spine.'] },
] as const satisfies readonly LineEntry[]
