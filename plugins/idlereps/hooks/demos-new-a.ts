/**
 * Copyright 2026 Orange Specs Mobile Labs. All rights reserved: not covered by the Apache License (see NOTICE). Swolomon's
 * name, character, likeness and these moves are proprietary.
 *
 * Exercise demos (owner, 2026-10-06: "add 50 more workouts"): moves of family 'exercise' that he plays on a
 * set band for the exercise named, never collected. Each with its name patterns (matched before the general
 * ones in moves.ts) and its form cue (`form-<move id>`). Pure data, drawn by `figure.ts`.
 */

import { shift } from './figure'
import type { Expr, Figure, Fx, Limb, P, Prop } from './figure'
import { beat, front, SHOULDER_L, side, STAND_SIDE } from './move-kit'
import type { LineEntry } from './copy'
import type { Move, MoveId } from './moves'

const MAT: Prop = { kind: 'mat', y: 15 }

/** An exercise demo: its poses, played in `beats` order `reps` times. */
const demo = (id: string, title: string, poses: Figure[], beats: [number, number][], reps: number): Move => ({ id, title, family: 'exercise', poses, beats, reps })

/** A point mirrored across the frame's middle (pixel 7 to pixel 8): his left side to his right. */
const mx = ([x, y]: P): P => [16 - x, y]
/** The left limb and its mirror on the right. */
const pair = (left: Limb): [Limb, Limb] => [left, left.map(mx)]
/** Both arms standing front-on, from the shoulders through the left `elbow` to the left `hand`. */
const both = (elbow: P, hand: P): [Limb, Limb] => pair([SHOULDER_L, elbow, hand])

const DB = (at: P, upright = false): Prop => ({ kind: 'dumbbell', at, ...(upright ? { upright: true } : {}) })
/** A dumbbell in each hand: at `left` and its mirror. */
const DBS = (left: P, upright = false): Prop[] => [DB(left, upright), DB(mx(left), upright)]
/** A band from under each foot up to each hand: the left at `hand` and its mirror. */
const FOOT_BANDS = (hand: P): Prop[] => [
  { kind: 'band', from: [6, 14.5], to: hand },
  { kind: 'band', from: [10, 14.5], to: mx(hand) },
]

// ---------------------------------------------------------------------------------------------------------
// Push-ups seen head-on, so the hands show where they go: the head up front, the back behind it, the arms
// down to the mat. `low`: at the bottom, chest near the floor.

const HEAD_ON = (low: boolean, armsOf: [Limb, Limb], o: { x?: number; expr?: Expr; fx?: readonly Fx[] } = {}): Figure =>
  shift(
    {
      head: { at: [5, low ? 6.5 : 3], facing: 'front', expr: o.expr ?? (low ? 'strain' : 'grin') },
      torso: { from: [8, low ? 12 : 8.5], to: [8, low ? 12.5 : 9.5], width: 7 },
      backArm: armsOf[0],
      frontArm: armsOf[1],
      ...(o.fx === undefined ? {} : { fx: o.fx }),
      props: [MAT],
    },
    o.x ?? 0,
    0,
  )

/** Both arms from the shoulders (up at 9.5, low at 12.5) through the left `elbow` to the left `hand`. */
const pushArms = (low: boolean, elbow: P, hand: P, shoulderX = 4.5): [Limb, Limb] => pair([[shoulderX, low ? 12.5 : 9.5], elbow, hand])

const widePushUp = demo(
  'wide-push-up',
  'Wide push-ups',
  [HEAD_ON(false, pushArms(false, [2.5, 12], [1, 14.5])), HEAD_ON(true, pushArms(true, [1.5, 11.5], [1, 14.5], 4))],
  beat([0, 450], [1, 550]),
  4,
)

const diamondPushUp = demo(
  'diamond-push-up',
  'Diamond push-ups',
  [
    HEAD_ON(false, pushArms(false, [5.5, 12], [7.5, 14.5])),
    HEAD_ON(true, pushArms(true, [2.5, 13], [7.5, 14.5], 4)),
    HEAD_ON(true, pushArms(true, [2.5, 13], [7.5, 14.5], 4), { fx: [{ kind: 'sparkle', at: [6.5, 13] }] }),
  ],
  beat([0, 450], [1, 400], [2, 200]),
  4,
)

const closeGripPushUp = demo(
  'close-grip-push-up',
  'Close-grip push-ups',
  [HEAD_ON(false, pushArms(false, [5, 12], [5, 14.5], 5)), HEAD_ON(true, pushArms(true, [4.5, 13.5], [5.5, 14.5], 5))],
  beat([0, 450], [1, 550]),
  4,
)

/** At the bottom of an archer: the body over the bent arm, the other reaching straight out along the mat. */
const ARCHER_LOW: Figure = HEAD_ON(
  true,
  [
    [[3.5, 12.5], [1.5, 11.5], [1.5, 14.5]],
    [[11.5, 12.5], [13.5, 13.5], [16, 14]],
  ],
  { x: -1.5 },
)

/** A head-on pose the other way: every point mirrored, the mat staying put. */
const mirrored = (f: Figure): Figure => ({
  ...f,
  ...(f.head === undefined ? {} : { head: { ...f.head, at: [10 - f.head.at[0], f.head.at[1]] as P } }),
  ...(f.torso === undefined ? {} : { torso: { ...f.torso, from: mx(f.torso.from), to: mx(f.torso.to) } }),
  backArm: (f.frontArm ?? []).map(mx),
  frontArm: (f.backArm ?? []).map(mx),
})

const archerPushUp = demo('archer-push-up', 'Archer push-ups', [HEAD_ON(false, pushArms(false, [2.5, 12], [1, 14.5])), ARCHER_LOW, mirrored(ARCHER_LOW)], beat([0, 400], [1, 600], [0, 400], [2, 600]), 2)

/** Hands under the shoulders, arms long; `tap`: one hand up on the other shoulder, the hips held still. */
const SHOULDER_TAP = (tap: 'none' | 'left' | 'right'): Figure => {
  const [left, right] = pushArms(false, [3.5, 12], [3, 14.5])
  return HEAD_ON(false, [tap === 'left' ? [[4.5, 9.5], [7, 11.5], [10.5, 9.5]] : left, tap === 'right' ? [[11.5, 9.5], [9, 11.5], [5.5, 9.5]] : right], {
    expr: tap === 'none' ? 'grin' : 'strain',
    x: tap === 'left' ? 0.5 : tap === 'right' ? -0.5 : 0,
  })
}

const plankShoulderTap = demo('plank-shoulder-tap', 'Plank shoulder taps', [SHOULDER_TAP('none'), SHOULDER_TAP('left'), SHOULDER_TAP('right')], beat([0, 300], [1, 450], [0, 300], [2, 450]), 3)

// ---------------------------------------------------------------------------------------------------------
// Push-ups in profile: the knees down, and the swoop.

const KNEE_PUSH = (low: boolean): Figure =>
  side({
    head: [10, low ? 8 : 5.5],
    neck: [10, low ? 12.5 : 10.5],
    hip: [5, low ? 13 : 12],
    arms: low
      ? [
          [[9.5, 13], [8, 14], [10, 14.5]],
          [[10.5, 13], [9, 14], [11, 14.5]],
        ]
      : [
          [[9.5, 11], [10, 13], [10, 14.5]],
          [[10.5, 11], [11, 13], [11, 14.5]],
        ],
    legs: [
      [[5, low ? 13.5 : 12.5], [3, 14.5], [1, 11]],
      [[5, low ? 13 : 12], [3.5, 14.5], [1.5, 10.5]],
    ],
    props: [MAT],
    ...(low ? { expr: 'strain' as const } : {}),
  })

const kneePushUp = demo('knee-push-up', 'Knee push-ups', [KNEE_PUSH(false), KNEE_PUSH(true)], beat([0, 450], [1, 550]), 4)

const hinduPushUp = demo(
  'hindu-push-up',
  'Hindu push-ups',
  [
    // Hips high, head between the arms.
    side({
      head: [8, 8],
      neck: [10, 10.5],
      hip: [5.5, 6],
      arms: [
        [[9.5, 11], [11, 13], [12, 14.5]],
        [[10.5, 11], [12, 13], [13, 14.5]],
      ],
      legs: [
        [[5.5, 6.5], [3, 10.5], [1, 14.5]],
        [[6, 6.5], [3.5, 10.5], [1.5, 14.5]],
      ],
      seat: [4.5, 8],
      props: [MAT],
    }),
    // The swoop: chest skimming the mat.
    side({
      head: [10, 8.5],
      neck: [10, 13],
      hip: [5, 11.5],
      arms: [
        [[9.5, 13], [9, 14], [12, 14.5]],
        [[10.5, 13], [10, 14], [13, 14.5]],
      ],
      legs: [
        [[5, 12], [2.5, 13], [0.5, 14.5]],
        [[5, 11.5], [2.5, 12.5], [1, 14.5]],
      ],
      props: [MAT],
      expr: 'strain',
    }),
    // Chest up, hips low, arms long.
    side({
      head: [10, 2.5],
      neck: [10.5, 8],
      hip: [5, 13.5],
      arms: [
        [[10, 8.5], [11, 11.5], [12, 14.5]],
        [[11, 8.5], [12, 11.5], [13, 14.5]],
      ],
      legs: [
        [[5, 14], [2.5, 14.5], [0.5, 14.5]],
        [[5, 13.5], [2.5, 14], [0.5, 14]],
      ],
      seat: [3.5, 14],
      props: [MAT],
      expr: 'smirk',
    }),
  ],
  beat([0, 550], [1, 350], [2, 600]),
  3,
)

// ---------------------------------------------------------------------------------------------------------
// Shoulders, standing front-on.

const dumbbellArnoldPress = demo(
  'dumbbell-arnold-press',
  'Dumbbell Arnold press',
  [
    // Dumbbells in front of the chin, palms in.
    front({ arms: both([5, 10.5], [5.5, 6.5]), props: DBS([5.5, 6.5], true) }),
    // Opened out to the sides, turning.
    front({ arms: both([2, 8.5], [2.5, 5.5]), props: DBS([2.5, 5], true), expr: 'blink' }),
    front({ arms: both([2.5, 4], [3, 1.5]), props: DBS([3, 1], true), expr: 'strain' }),
  ],
  beat([0, 400], [1, 300], [2, 500], [1, 300]),
  3,
)

const dumbbellLateralRaise = demo(
  'dumbbell-lateral-raise',
  'Dumbbell lateral raises',
  [front({ arms: both([3.5, 9.5], [3, 12]), props: DBS([3, 12]) }), front({ arms: both([2.5, 7.5], [1, 7.5]), props: DBS([1, 7.5]), expr: 'strain' })],
  beat([0, 450], [1, 550]),
  4,
)

const bandLateralRaise = demo(
  'band-lateral-raise',
  'Band lateral raises',
  [front({ arms: both([3.5, 9.5], [3.5, 12]), props: FOOT_BANDS([3.5, 12]) }), front({ arms: both([2.5, 7.5], [1, 7.5]), props: FOOT_BANDS([1, 7.5]), expr: 'strain' })],
  beat([0, 450], [1, 550]),
  4,
)

// ---------------------------------------------------------------------------------------------------------
// Triceps.

/** Hinged over, flat back, the far hand on the knee; the near arm `arm`, a dumbbell in its hand. */
const HINGED = (arm: Limb, expr?: Expr): Figure =>
  side({
    head: [10, 3],
    neck: [10, 8.5],
    hip: [5, 10.5],
    arms: [[[9.5, 9], [9.5, 11], [8.5, 12.5]], arm],
    legs: [
      [[5, 11], [6, 13], [5, 14.5]],
      [[6, 11], [8, 12.5], [7, 14.5]],
    ],
    props: [DB(arm.at(-1) ?? [0, 0])],
    ...(expr === undefined ? {} : { expr }),
  })

const dumbbellTricepsKickback = demo(
  'dumbbell-triceps-kickback',
  'Dumbbell triceps kickbacks',
  [
    HINGED([
      [10.5, 9],
      [7.5, 9],
      [7.5, 12],
    ]),
    HINGED(
      [
        [10.5, 9],
        [7.5, 9],
        [2.5, 8.5],
      ],
      'strain',
    ),
  ],
  beat([0, 450], [1, 550]),
  4,
)

/** Standing side-on to a band anchored high in front; the hands at `hand`. */
const PUSHDOWN = (elbow: P, hand: P, expr?: Expr): Figure =>
  STAND_SIDE({
    arms: [
      [[7, 7], [elbow[0] - 1, elbow[1]], [hand[0] - 1, hand[1]]],
      [[9, 7], elbow, hand],
    ],
    props: [{ kind: 'band', from: [15, 0], to: hand }],
    ...(expr === undefined ? {} : { expr }),
  })

const bandTricepsPushdown = demo('band-triceps-pushdown', 'Band triceps pushdowns', [PUSHDOWN([9, 10.5], [12, 8]), PUSHDOWN([9.5, 10.5], [11, 13], 'strain')], beat([0, 450], [1, 550]), 4)

// ---------------------------------------------------------------------------------------------------------
// Back: the bar, the bands, the floor.

/** Hanging from the bar overhead, arms long; `active`: shoulders pulled down, the body a little higher. */
const SCAP = (active: boolean): Figure =>
  front({
    y: active ? 2 : 4,
    arms: active ? both([4.5, 2], [4.5, -2]) : both([4.5, 1], [4.5, -4]),
    legs: [
      [[6, 12], [7, 14]],
      [[10, 12], [9, 14]],
    ],
    props: [{ kind: 'bar', y: 0 }],
    expr: active ? 'strain' : 'blink',
  })

const scapularPullUp = demo('scapular-pull-up', 'Scapular pull-ups', [SCAP(false), SCAP(true)], beat([0, 500], [1, 600]), 4)

/** A low bar; hands close, palms facing him. Hanging, then chin over it, elbows down in front. */
const chinUp = demo(
  'chin-up',
  'Chin-ups',
  [
    front({ y: 5, arms: both([5, 3], [6, -1]), props: [{ kind: 'bar', y: 4 }] }),
    front({
      arms: both([3.5, 10], [5.5, 4]),
      bicep: [[3.8, 8.5], mx([3.8, 8.5])],
      legs: [
        [[6, 12], [7, 14]],
        [[10, 12], [9, 14]],
      ],
      props: [{ kind: 'bar', y: 4 }],
      expr: 'strain',
    }),
  ],
  beat([0, 500], [1, 650]),
  3,
)

/** High plank on two dumbbells; `row`: the near one pulled up to the hip. */
const RENEGADE = (row: boolean): Figure =>
  side({
    head: [10, 5],
    neck: [10, 10],
    hip: [5, 11.5],
    arms: [
      [[9.5, 10.5], [10, 12.5], [10, 14]],
      row ? [[10.5, 10.5], [7.5, 9], [8.5, 11]] : [[10.5, 10.5], [11, 12.5], [11, 14]],
    ],
    legs: [
      [[5, 12], [2.5, 13], [0, 14.5]],
      [[5, 11.5], [3, 12.5], [1.5, 14.5]],
    ],
    props: [MAT, DB([10, 14]), DB(row ? [8.5, 11] : [11.5, 14])],
    ...(row ? { expr: 'strain' as const } : {}),
  })

const dumbbellRenegadeRow = demo('dumbbell-renegade-row', 'Dumbbell renegade rows', [RENEGADE(false), RENEGADE(true)], beat([0, 450], [1, 550]), 4)

/** Kneeling front-on, a band from high on each side down to each hand. */
const PULLDOWN = (elbow: P, hand: P, expr?: Expr): Figure =>
  front({
    y: 3,
    arms: both([elbow[0], elbow[1] - 3], [hand[0], hand[1] - 3]),
    legs: [
      [[6, 12], [6, 12.5]],
      [[10, 12], [10, 12.5]],
    ],
    props: [
      { kind: 'band', from: [1, -3], to: [hand[0], hand[1] - 3] },
      { kind: 'band', from: mx([1, -3]), to: mx([hand[0], hand[1] - 3]) },
    ],
    ...(expr === undefined ? {} : { expr }),
  })

const bandLatPulldown = demo(
  'band-lat-pulldown',
  'Band lat pulldowns',
  [PULLDOWN([2.5, 6], [2, 3]), { ...PULLDOWN([1.5, 12], [2.5, 8], 'strain'), bicep: [[2.5, 10.5], mx([2.5, 10.5])] }],
  beat([0, 450], [1, 550]),
  4,
)

/** Side-on to a band anchored at face height ahead; `pulled`: hands up by the face, elbows high. */
const FACE_PULL = (pulled: boolean): Figure =>
  shift(
    STAND_SIDE({
      arms: pulled
        ? [
            [[7, 7], [5, 6.5], [10.5, 5.5]],
            [[9, 7], [6, 6.5], [11.5, 5.5]],
          ]
        : [
            [[7, 7], [10, 6.5], [13, 6.5]],
            [[9, 7], [12, 6.5], [15, 6.5]],
          ],
      props: [{ kind: 'band', from: pulled ? [11.5, 5.5] : [15, 6.5], to: [18.5, 5] }],
      ...(pulled ? { expr: 'strain' as const } : {}),
    }),
    -3,
    0,
  )

const bandFacePull = demo('band-face-pull', 'Band face pulls', [FACE_PULL(false), FACE_PULL(true)], beat([0, 450], [1, 600]), 4)

/** Hinged over, seen head-on: the head low, arms hanging; `open`: dumbbells out wide like wings. */
const REVERSE_FLY = (open: boolean): Figure => {
  const [backArm, frontArm] = pair(open ? [[4.5, 9.5], [2.5, 9.5], [0.5, 9]] : [[4.5, 9.5], [4.5, 11.5], [5, 13]])
  return {
    head: { at: [5, 3.5], facing: 'front', ...(open ? { expr: 'strain' as const } : {}) },
    torso: { from: [8, 9], to: [8, 10.5], width: 7 },
    shorts: { from: [8, 10.5], to: [8, 12] },
    backLeg: [
      [6, 12],
      [5.5, 14.5],
    ],
    frontLeg: [
      [10, 12],
      [10.5, 14.5],
    ],
    backArm,
    frontArm,
    props: DBS(open ? [0.5, 9] : [5, 13]),
  }
}

const dumbbellReverseFly = demo('dumbbell-reverse-fly', 'Dumbbell reverse flys', [REVERSE_FLY(false), REVERSE_FLY(true)], beat([0, 450], [1, 600]), 4)

/** Lying face down, seen head-on along the mat: the arms out in a shape (the left `arm`), lifted or resting. */
const PRONE = (arm: Limb, lifted: boolean): Figure => {
  const [backArm, frontArm] = pair(arm)
  return shift(
    { head: { at: [5, 8], facing: 'front', expr: lifted ? 'strain' : 'blink' }, torso: { from: [8, 12.5], to: [8, 13.5], width: 7 }, backArm, frontArm, props: [MAT] },
    0,
    lifted ? -1.5 : 0,
  )
}

/** Elbows bent and low, hands up by the head: a W. */
const PRONE_W: Limb = [
  [4.5, 13],
  [1.5, 13.5],
  [2.5, 10],
]
/** Arms straight out to the sides: a T. */
const PRONE_T: Limb = [
  [4.5, 13],
  [2.5, 13],
  [0, 13],
]

const proneWRaise = demo('prone-w-raise', 'Prone W-raises', [PRONE(PRONE_W, false), PRONE(PRONE_W, true)], beat([0, 450], [1, 650]), 4)
const proneTRaise = demo('prone-t-raise', 'Prone T-raises', [PRONE(PRONE_T, false), PRONE(PRONE_T, true)], beat([0, 450], [1, 650]), 4)

// ---------------------------------------------------------------------------------------------------------
// Biceps: dumbbells upright (palms in), a band, a towel.

const HANG: Limb = [SHOULDER_L, [3.5, 9.5], [3.5, 12]]
const CURLED: Limb = [SHOULDER_L, [3.5, 9.5], [4, 6.5]]
const BICEP: P = [3.2, 8]

/** One arm at a time: 'none' both down, or the 'left' or 'right' one curled up. */
const HAMMER = (up: 'none' | 'left' | 'right'): Figure =>
  front({
    arms: [up === 'left' ? CURLED : HANG, (up === 'right' ? CURLED : HANG).map(mx)],
    props: [DB(up === 'left' ? [4, 6.5] : [3.5, 12], true), DB(mx(up === 'right' ? [4, 6.5] : [3.5, 12]), true)],
    ...(up === 'none' ? {} : { expr: 'strain' as const, bicep: [up === 'left' ? BICEP : mx(BICEP)] }),
  })

const dumbbellHammerCurl = demo('dumbbell-hammer-curl', 'Dumbbell hammer curls', [HAMMER('none'), HAMMER('left'), HAMMER('right')], beat([0, 300], [1, 500], [0, 300], [2, 500]), 2)

const bandHammerCurl = demo(
  'band-hammer-curl',
  'Band hammer curls',
  [front({ arms: pair(HANG), props: FOOT_BANDS([3.5, 12]) }), front({ arms: pair(CURLED), bicep: [BICEP, mx(BICEP)], props: FOOT_BANDS([4, 6.5]), expr: 'strain' })],
  beat([0, 450], [1, 550]),
  4,
)

/** On one leg, a towel under the other foot, a hand on each end: curling it lifts the knee. */
const TOWEL = (up: boolean): Figure => {
  const foot: P = up ? [12.5, 11.5] : [11, 14.5]
  const hands: [P, P] = [
    [foot[0] - 1.5, foot[1] - 2],
    [foot[0] + 2, foot[1] - 2],
  ]
  return front({
    arms: [
      [SHOULDER_L, up ? [6, 10] : [5.5, 10.5], hands[0]],
      [mx(SHOULDER_L), up ? [14, 8] : [13, 10], hands[1]],
    ],
    legs: [[[6, 12], [6, 14.5]], up ? [[10, 12], [13, 10], foot] : [[10, 12], [10.5, 13], foot]],
    props: [
      { kind: 'band', from: hands[0], to: foot },
      { kind: 'band', from: hands[1], to: foot },
    ],
    ...(up ? { expr: 'strain' as const } : {}),
  })
}

const towelCurl = demo('towel-curl', 'Towel curls', [TOWEL(false), TOWEL(true)], beat([0, 500], [1, 600]), 3)

export const NEW_A_DEMOS: readonly Move[] = [
  kneePushUp,
  widePushUp,
  diamondPushUp,
  plankShoulderTap,
  archerPushUp,
  dumbbellArnoldPress,
  dumbbellLateralRaise,
  bandLateralRaise,
  hinduPushUp,
  dumbbellTricepsKickback,
  bandTricepsPushdown,
  closeGripPushUp,
  scapularPullUp,
  dumbbellRenegadeRow,
  bandLatPulldown,
  proneWRaise,
  dumbbellReverseFly,
  bandFacePull,
  proneTRaise,
  dumbbellHammerCurl,
  bandHammerCurl,
  chinUp,
  towelCurl,
]

/** Exercise names to these demos, most specific first; each anchored to the whole name. */
export const NEW_A_DEMO_BY_NAME: readonly (readonly [RegExp, MoveId])[] = [
  [/^knee push-?ups?$/i, 'knee-push-up'],
  [/^wide(-grip)? push-?ups?$/i, 'wide-push-up'],
  [/^diamond push-?ups?$/i, 'diamond-push-up'],
  [/^plank shoulder taps?$/i, 'plank-shoulder-tap'],
  [/^archer push-?ups?$/i, 'archer-push-up'],
  [/^dumbbell arnold press(es)?$/i, 'dumbbell-arnold-press'],
  [/^dumbbell lateral raises?$/i, 'dumbbell-lateral-raise'],
  [/^band lateral raises?$/i, 'band-lateral-raise'],
  [/^hindu push-?ups?$/i, 'hindu-push-up'],
  [/^dumbbell triceps? kickbacks?$/i, 'dumbbell-triceps-kickback'],
  [/^band triceps? push-?downs?$/i, 'band-triceps-pushdown'],
  [/^close[- ]grip push-?ups?$/i, 'close-grip-push-up'],
  [/^scapular pull-?ups?$/i, 'scapular-pull-up'],
  [/^dumbbell renegade rows?$/i, 'dumbbell-renegade-row'],
  [/^band lat pull-?downs?$/i, 'band-lat-pulldown'],
  [/^prone w[- ]raises?$/i, 'prone-w-raise'],
  [/^dumbbell reverse fl(y|ys|ies)$/i, 'dumbbell-reverse-fly'],
  [/^band face pulls?$/i, 'band-face-pull'],
  [/^prone t[- ]raises?$/i, 'prone-t-raise'],
  [/^dumbbell hammer curls?$/i, 'dumbbell-hammer-curl'],
  [/^band hammer curls?$/i, 'band-hammer-curl'],
  [/^chin-?ups?$/i, 'chin-up'],
  [/^towel curls?$/i, 'towel-curl'],
]

/** Each demo's form cue: Swolomon's voice, one {mate}, never the exercise's name. */
export const NEW_A_DEMO_LINES = [
  { id: 'form-knee-push-up', voice: 'swolomon', variants: ['Straight line from knees to head, {mate}.', 'Chest to the floor, {mate}. Easy does it.'] },
  { id: 'form-wide-push-up', voice: 'swolomon', variants: ['Hands wide, elbows out a little, {mate}.', 'Chest between the hands, {mate}. Slow down.'] },
  { id: 'form-diamond-push-up', voice: 'swolomon', variants: ['Thumbs and fingers touching, {mate}. Elbows in.', 'Chest to the hands, {mate}. Shine like a gem.'] },
  { id: 'form-plank-shoulder-tap', voice: 'swolomon', variants: ['Hips still, {mate}. Feet wide helps.', 'Tap, tap, no rocking, {mate}. Be furniture.'] },
  { id: 'form-archer-push-up', voice: 'swolomon', variants: ['One arm bends, one stays long, {mate}.', 'Shift over slow, {mate}. Like drawing a bow.'] },
  { id: 'form-dumbbell-arnold-press', voice: 'swolomon', variants: ['Palms in, turn them out on the way up, {mate}.', 'Smooth twist, {mate}. No rush to the top.'] },
  { id: 'form-dumbbell-lateral-raise', voice: 'swolomon', variants: ['Lead with the elbows, {mate}. Shoulder height.', 'Go light and slow, {mate}. Like wings.'] },
  { id: 'form-band-lateral-raise', voice: 'swolomon', variants: ['Out to the sides, {mate}. Stop at the shoulders.', 'Control it back down, {mate}.'] },
  { id: 'form-hindu-push-up', voice: 'swolomon', variants: ['Hips high, swoop low, chest up, {mate}.', 'Flow like water, {mate}. Breathe out on the swoop.'] },
  { id: 'form-dumbbell-triceps-kickback', voice: 'swolomon', variants: ['Elbow stays high and still, {mate}.', 'Straighten the arm back, {mate}. Squeeze.'] },
  { id: 'form-band-triceps-pushdown', voice: 'swolomon', variants: ['Elbows glued to the sides, {mate}.', 'All the way down, {mate}. Slow back up.'] },
  { id: 'form-close-grip-push-up', voice: 'swolomon', variants: ['Hands under the shoulders, elbows brush the ribs, {mate}.', 'Elbows back, not out, {mate}.'] },
  { id: 'form-scapular-pull-up', voice: 'swolomon', variants: ['Arms stay straight, {mate}. Shoulders down.', 'Tiny move, big focus, {mate}.'] },
  { id: 'form-dumbbell-renegade-row', voice: 'swolomon', variants: ['Feet wide, hips square, {mate}.', 'Pull to the hip, {mate}. No twisting.'] },
  { id: 'form-band-lat-pulldown', voice: 'swolomon', variants: ['Elbows down to the pockets, {mate}.', 'Chest proud, {mate}. Squeeze the back.'] },
  { id: 'form-prone-w-raise', voice: 'swolomon', variants: ['Thumbs up, elbows tucked, {mate}. Lift and hold.', 'Nose down, shoulder blades together, {mate}.'] },
  { id: 'form-dumbbell-reverse-fly', voice: 'swolomon', variants: ['Flat back, a little bend in the elbows, {mate}.', 'Light weights, {mate}. Squeeze the back.'] },
  { id: 'form-band-face-pull', voice: 'swolomon', variants: ['Pull to the eyes, elbows high, {mate}.', 'Hands by the ears, {mate}. Hold a beat.'] },
  { id: 'form-prone-t-raise', voice: 'swolomon', variants: ['Arms straight out, thumbs up, {mate}.', 'Lift a little, hold a little, {mate}.'] },
  { id: 'form-dumbbell-hammer-curl', voice: 'swolomon', variants: ['Thumbs up, elbows pinned, {mate}.', 'One at a time, {mate}. No swinging.'] },
  { id: 'form-band-hammer-curl', voice: 'swolomon', variants: ['Palms facing in, {mate}. Squeeze at the top.', 'Slow on the way down, {mate}.'] },
  { id: 'form-chin-up', voice: 'swolomon', variants: ['Palms toward you, {mate}. Chin over, lower slow.', 'Full hang at the bottom, {mate}.'] },
  { id: 'form-towel-curl', voice: 'swolomon', variants: ['Pull hard, let the leg fight back, {mate}.', 'Stand tall on one foot, {mate}. Hold something if needed.'] },
] as const satisfies readonly LineEntry[]
