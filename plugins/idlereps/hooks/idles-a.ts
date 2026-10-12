/**
 * Copyright 2026 Orange Specs Mobile Labs. All rights reserved: not covered by the Apache License (see NOTICE). Swolomon's
 * name, character, likeness and these moves are proprietary.
 *
 * Idle animations, set A (hooks/idles.ts): his warm-ups and fidgets on the gym floor, each with a little
 * show for whoever is watching at the end. Pure data.
 */

import { turned } from './figure'
import { ARMS_DOWN, arms, front, LEGS, SHOULDER_L, SHOULDER_R, side, STAND_SIDE } from './move-kit'
import type { Expr, Facing, Figure, Fx, Limb, P, Prop } from './figure'
import type { Move } from './moves'

/** An idle: `poses` played through `beats` (pose, ms), once. */
const idle = (id: string, title: string, poses: Figure[], beats: [number, number][]): Move => ({ id, title, family: 'idle', poses, beats, reps: 1 })

/** `poses` in turn, `ms` each, `times` over. */
const loop = (poses: readonly number[], ms: number, times: number): [number, number][] => Array.from({ length: times }, () => poses.map(p => [p, ms] as [number, number])).flat()

/** The same body, his head turned: profile heads sit a pixel toward the way he looks. */
const looking = (f: Figure, facing: Facing, expr: Expr = 'grin'): Figure => {
  const [x, y] = f.head?.at ?? [5, 0]
  return { ...f, head: { at: [facing === 'right' ? x + 1 : facing === 'left' ? x - 1 : x, y], facing, expr } }
}

/** The pose with a different face. */
const face = (f: Figure, expr: Expr, fx?: readonly Fx[]): Figure => ({ ...f, ...(f.head === undefined ? {} : { head: { ...f.head, expr } }), ...(fx === undefined ? {} : { fx }) })

const HIPS = arms([2, 8.5], [5, 10.5])
const SPARKLE_L: Fx = { kind: 'sparkle', at: [0, 1] }
const SPARKLE_R: Fx = { kind: 'sparkle', at: [13, 1] }
const SWEAT: Fx = { kind: 'sweat', at: [12, 1] }
const SIDE_ARMS: [Limb, Limb] = [
  [[7, 7], [6.5, 9.5], [6.5, 11.5]],
  [[9, 7], [9.5, 9.5], [9.5, 11.5]],
]
const SIDE_LEGS: [Limb, Limb] = [
  [[7, 12], [7, 14.5]],
  [[9, 12], [9, 14.5]],
]

// ---------------------------------------------------------------------------------------------------------
// Arm circles: both arms straight, swung round through four points of the clock.

const CIRCLE: [Limb, Limb][] = [arms([3.5, 4], [3, 1]), arms([2, 5], [0.5, 3.5]), arms([2, 7.5], [0.5, 8]), arms([2.5, 9.5], [1.5, 11])]
const armCircles = idle(
  'arm-circles',
  'Arm circles',
  [...CIRCLE.map((a, i) => front({ arms: a, expr: i === 0 ? 'o' : 'grin' })), front({ arms: CIRCLE[2], expr: 'wink', fx: [{ kind: 'puff', at: [0, 4] }, { kind: 'puff', at: [13, 4] }] })],
  [...loop([0, 1, 2, 3], 160, 4), [4, 900]],
)

// ---------------------------------------------------------------------------------------------------------
// Toe touch: arms up tall, then folded over, fingers to his shoes.

const TALL = STAND_SIDE({
  arms: [
    [[7, 7], [7, 4], [7.5, 1]],
    [[9, 7], [9.5, 4], [10, 1]],
  ],
  head: [5, 1],
  neck: [8, 7],
})
const FOLDED = (expr: Expr, fx?: readonly Fx[]): Figure =>
  side({
    head: [9, 8],
    neck: [10, 9],
    hip: [7, 11],
    arms: [
      [[9.5, 9.5], [10, 12], [9.5, 14.5]],
      [[10, 9.5], [11, 12], [10.5, 14.5]],
    ],
    legs: SIDE_LEGS,
    seat: [8, 12],
    expr,
    ...(fx === undefined ? {} : { fx }),
  })
const toeTouch = idle(
  'toe-touch',
  'Toe touch',
  [TALL, FOLDED('strain', [{ kind: 'sweat', at: [6, 7] }]), FOLDED('blink'), face(TALL, 'wink', [SPARKLE_R])],
  [[0, 600], [1, 900], [2, 500], [0, 500], [1, 900], [3, 1000]],
)

// ---------------------------------------------------------------------------------------------------------
// Quad pull: on one leg, heel held to his seat, wobbling.

const QUAD = (dx: number, expr: Expr): Figure =>
  STAND_SIDE({
    head: [5 + dx, 0],
    neck: [8 + dx, 6],
    hip: [8 + dx, 10.5],
    arms: [
      [[7 + dx, 7], [9 + dx, 5], [12 + dx, 4]],
      [[9 + dx, 7], [6.5 + dx, 9.5], [5.5 + dx, 12]],
    ],
    legs: [
      [[7 + dx, 12], [7.5, 14.5]],
      [[9 + dx, 12], [8.5 + dx, 14], [5.5 + dx, 12.5]],
    ],
    expr,
  })
const quadPull = idle(
  'quad-pull',
  'Quad pull',
  [QUAD(0, 'grin'), QUAD(1, 'o'), QUAD(-1, 'strain'), face(QUAD(0, 'smirk'), 'smirk', [SPARKLE_R])],
  [[0, 600], ...loop([1, 0, 2, 0], 220, 2), [3, 1000]],
)

// ---------------------------------------------------------------------------------------------------------
// Triceps reach: an elbow up past his ear, the other hand pressing it down; both sides.

const TRI_R: [Limb, Limb] = [
  [SHOULDER_L, [3, 3.5], [5.5, 1]],
  [SHOULDER_R, [12.5, 2], [11.5, 0.5]],
]
const TRI_R_DEEP: [Limb, Limb] = [
  [SHOULDER_L, [3, 3], [5.5, 0.5]],
  [SHOULDER_R, [12.5, 1.5], [10.5, 3]],
]
const tricepsReach = idle(
  'triceps-reach',
  'Triceps reach',
  [front({ arms: TRI_R, expr: 'grin' }), front({ arms: TRI_R_DEEP, expr: 'strain' }), turned(front({ arms: TRI_R, expr: 'grin' })), turned(front({ arms: TRI_R_DEEP, expr: 'strain' })), front({ arms: TRI_R, expr: 'wink', fx: [SPARKLE_L] })],
  [[0, 500], [1, 900], [2, 500], [3, 900], [4, 1000]],
)

// ---------------------------------------------------------------------------------------------------------
// Cross-arm stretch: one arm straight across his chest, hooked by the other; then the other side.

const CROSS_R: [Limb, Limb] = [
  [SHOULDER_L, [3, 9.5], [6.5, 8]],
  [SHOULDER_R, [8, 8], [2.5, 8]],
]
const CROSS_R_PULL: [Limb, Limb] = [
  [SHOULDER_L, [3.5, 10], [6, 7.5]],
  [SHOULDER_R, [8, 7.5], [1.5, 7.5]],
]
const CROSS = (a: [Limb, Limb], expr: Expr): Figure => looking(front({ arms: a }), 'left', expr)
const crossArmStretch = idle(
  'cross-arm-stretch',
  'Cross-arm stretch',
  [CROSS(CROSS_R, 'grin'), CROSS(CROSS_R_PULL, 'strain'), turned(CROSS(CROSS_R, 'grin')), turned(CROSS(CROSS_R_PULL, 'strain')), front({ expr: 'smirk', fx: [SPARKLE_R] })],
  [[0, 450], [1, 900], [2, 450], [3, 900], [4, 900]],
)

// ---------------------------------------------------------------------------------------------------------
// Hip circles: hands on his hips, the hips going round under a still chest.

const hipsAt = (dx: number, dy: number, expr: Expr = 'grin', fx?: readonly Fx[]): Figure => {
  const base = front({ arms: HIPS, expr, ...(fx === undefined ? {} : { fx }) })
  return {
    ...base,
    torso: { from: [8, 6], to: [8 + dx, 10 + dy] },
    shorts: { from: [8 + dx, 10 + dy], to: [8 + dx, 12 + dy] },
    backArm: [SHOULDER_L, [2 + dx, 8.5 + dy], [5 + dx, 10.5 + dy]],
    frontArm: [SHOULDER_R, [13 + dx, 8.5 + dy], [10 + dx, 10.5 + dy]],
    backLeg: [[6 + dx, 12 + dy], [6, 14.5]],
    frontLeg: [[10 + dx, 12 + dy], [10, 14.5]],
  }
}
const hipCircles = idle(
  'hip-circles',
  'Hip circles',
  [hipsAt(-1.5, 0), hipsAt(0, 0.5, 'o'), hipsAt(1.5, 0), hipsAt(0, -0.5), hipsAt(0, 0, 'wink', [{ kind: 'note', at: [13, 1] }])],
  [...loop([0, 1, 2, 3], 200, 4), [4, 1000]],
)

// ---------------------------------------------------------------------------------------------------------
// Knee hug: a knee pulled up into his chest, one leg then the other.

const HUG_FRONT = (expr: Expr): Figure =>
  side({
    head: [5, 0],
    neck: [8, 6],
    hip: [8, 10.5],
    arms: [
      [[7, 7], [10.5, 8.5], [12, 10]],
      [[9, 7], [11.5, 9], [12.5, 11]],
    ],
    legs: [
      [[7, 12], [7, 14.5]],
      [[9, 11.5], [12, 9.5], [11.5, 13]],
    ],
    seat: [9.5, 11.5],
    expr,
  })
const HUG_BACK = (expr: Expr): Figure =>
  side({
    head: [5, 0],
    neck: [8, 6],
    hip: [8, 10.5],
    arms: [
      [[7, 7], [10.5, 8.5], [12, 10]],
      [[9, 7], [11.5, 9], [12.5, 11]],
    ],
    legs: [
      [[8, 11.5], [11.5, 9.5], [11, 13]],
      [[9, 12], [9, 14.5]],
    ],
    seat: [9, 12],
    expr,
  })
const kneeHug = idle(
  'knee-hug',
  'Knee hug',
  [STAND_SIDE(), HUG_FRONT('strain'), HUG_BACK('strain'), face(HUG_FRONT('blink'), 'blink'), face(STAND_SIDE({ expr: 'wink' }), 'wink', [{ kind: 'heart', at: [12, 1] }])],
  [[0, 500], [1, 900], [3, 300], [0, 400], [2, 900], [0, 300], [4, 1000]],
)

// ---------------------------------------------------------------------------------------------------------
// Butt kicks: jogging on the spot, a heel flicked up to his seat each step.

const KICK = (isFront: boolean, expr: Expr): Figure =>
  STAND_SIDE({
        arms: isFront
      ? [
          [[7, 7], [9.5, 8.5], [10.5, 6.5]],
          [[9, 7], [7, 9], [6, 10.5]],
        ]
      : [
          [[7, 7], [5, 9], [4.5, 10.5]],
          [[9, 7], [11, 8.5], [12, 6.5]],
        ],
    legs: isFront
      ? [
          [[7, 12], [7, 14.5]],
          [[9, 12], [8.5, 14], [5.5, 11.5]],
        ]
      : [
          [[7, 12], [7, 14], [4.5, 11.5]],
          [[9, 12], [9, 14.5]],
        ],
    expr,
  })
const buttKicks = idle(
  'butt-kicks',
  'Butt kicks',
  [KICK(true, 'grin'), KICK(false, 'talk'), face(KICK(true, 'o'), 'o', [{ kind: 'sweat', at: [3, 1] }]), face(STAND_SIDE({ expr: 'smirk' }), 'smirk', [SWEAT])],
  [...loop([0, 1], 180, 4), ...loop([2, 1], 180, 2), [3, 1000]],
)

// ---------------------------------------------------------------------------------------------------------
// Double unders: one jump, the rope round twice (over his head, under his feet), a puff when he lands.

const ROPE_HANDS = arms([3, 9.5], [1.5, 10])
type Band = Extract<Prop, { kind: 'band' }>
const ROPE_UP: Band[] = [
  { kind: 'band', from: [1.5, 10], to: [2.5, 0.5] },
  { kind: 'band', from: [2.5, 0.5], to: [12.5, 0.5] },
  { kind: 'band', from: [12.5, 0.5], to: [13.5, 10] },
]
const ROPE_DOWN: Band[] = [
  { kind: 'band', from: [1.5, 10], to: [3, 15.5] },
  { kind: 'band', from: [3, 15.5], to: [12, 15.5] },
  { kind: 'band', from: [12, 15.5], to: [13.5, 10] },
]
const doubleUnders = idle(
  'double-unders',
  'Double unders',
  [
    front({ arms: ROPE_HANDS, props: ROPE_UP, expr: 'grin' }),
    front({ y: -1, arms: ROPE_HANDS, props: ROPE_DOWN, expr: 'o' }),
    front({ y: -1, arms: ROPE_HANDS, props: ROPE_UP.map(p => ({ ...p, from: [p.from[0], Math.max(1.5, p.from[1] + 1)] as P, to: [p.to[0], Math.max(1.5, p.to[1] + 1)] as P })), expr: 'strain' }),
    front({ arms: ROPE_HANDS, props: ROPE_DOWN, expr: 'grin', fx: [{ kind: 'puff', at: [1, 13] }, { kind: 'puff', at: [12, 13] }] }),
    front({ arms: ROPE_HANDS, props: ROPE_DOWN, expr: 'wink', fx: [SPARKLE_R] }),
  ],
  [...loop([0, 1, 2, 3], 170, 4), [4, 1000]],
)

// ---------------------------------------------------------------------------------------------------------
// Boxer bounce: guard up, light on his toes, and a jab at nobody.

const GUARD: [Limb, Limb] = [
  [SHOULDER_L, [3, 9.5], [5.5, 6.5]],
  [SHOULDER_R, [13, 9.5], [10.5, 6.5]],
]
const JAB: [Limb, Limb] = [GUARD[0], [SHOULDER_R, [13.5, 7], [15.5, 6.5]]]
const boxer = (y: number, a: [Limb, Limb], expr: Expr, fx?: readonly Fx[]): Figure => looking(front({ y, arms: a, ...(fx === undefined ? {} : { fx }) }), 'right', expr)
const boxerBounce = idle(
  'boxer-bounce',
  'Boxer bounce',
  [boxer(0, GUARD, 'smirk'), boxer(-1, GUARD, 'smirk'), boxer(0, JAB, 'strain', [{ kind: 'star', at: [15, 4] }]), face(boxer(-1, GUARD, 'wink'), 'wink', [SPARKLE_L])],
  [...loop([0, 1], 200, 3), [2, 300], ...loop([0, 1], 200, 2), [2, 300], [3, 900]],
)

// ---------------------------------------------------------------------------------------------------------
// Shake out: arms gone loose, flapping, the whole of him jiggling.

const LOOSE_A: [Limb, Limb] = [
  [SHOULDER_L, [2.5, 9.5], [1.5, 12]],
  [SHOULDER_R, [13.5, 9], [14, 11.5]],
]
const LOOSE_B: [Limb, Limb] = [
  [SHOULDER_L, [3, 9], [2, 11.5]],
  [SHOULDER_R, [12.5, 9.5], [13.5, 12]],
]
const shakeOut = idle(
  'shake-out',
  'Shake out',
  [
    front({ x: -1, arms: LOOSE_A, expr: 'o' }),
    front({ x: 1, arms: LOOSE_B, expr: 'blink' }),
    front({ arms: LOOSE_A, expr: 'talk', fx: [{ kind: 'puff', at: [0, 9] }, { kind: 'puff', at: [13, 9] }] }),
    front({ expr: 'grin', fx: [SPARKLE_L] }),
  ],
  [...loop([0, 1], 110, 7), [2, 400], ...loop([0, 1], 110, 4), [3, 900]],
)

// ---------------------------------------------------------------------------------------------------------
// Ankle rolls: hands on hips, a toe on the floor, the heel going round; then the other foot.

const ANKLE_R: [Limb, Limb][] = [
  [LEGS[0], [[10, 12], [11.5, 14]]],
  [LEGS[0], [[10, 12], [12, 14.5]]],
  [LEGS[0], [[10, 12], [11, 14.5]]],
]
const ankle = (legs: [Limb, Limb], expr: Expr): Figure => looking(front({ arms: HIPS, legs }), 'right', expr)
const ankleRolls = idle(
  'ankle-rolls',
  'Ankle rolls',
  [...ANKLE_R.map(legs => ankle(legs, 'blink')), ...ANKLE_R.map(legs => turned(ankle(legs, 'grin'))), front({ arms: HIPS, expr: 'smirk', fx: [SPARKLE_R] })],
  [...loop([0, 1, 2], 220, 3), ...loop([3, 4, 5], 220, 3), [6, 900]],
)

// ---------------------------------------------------------------------------------------------------------
// Deep breath: arms swept up as his chest fills, then let out in a long puff.

const deepBreath = idle(
  'deep-breath',
  'Deep breath',
  [
    front({ expr: 'blink' }),
    { ...front({ arms: arms([2, 5], [1, 2.5]), expr: 'o' }), torso: { from: [8, 6], to: [8, 10], width: 7 } },
    { ...front({ y: -1, arms: arms([3.5, 3], [5.5, 0.5]), expr: 'sleep' }), torso: { from: [8, 5], to: [8, 9], width: 8 } },
    front({ arms: arms([2, 8], [1.5, 10.5]), expr: 'talk', fx: [{ kind: 'puff', at: [11, 3] }, { kind: 'puff', at: [13, 1] }] }),
    front({ expr: 'grin', fx: [SPARKLE_L] }),
  ],
  [[0, 600], [1, 700], [2, 1100], [3, 1000], [4, 900]],
)

// ---------------------------------------------------------------------------------------------------------
// Brow wipe: sweat on his brow, the back of a hand across it, and the drops flicked away.

const browWipe = idle(
  'brow-wipe',
  'Brow wipe',
  [
    front({ expr: 'strain', fx: [SWEAT, { kind: 'drop', at: [4, 2] }] }),
    front({ arms: [ARMS_DOWN[0], [SHOULDER_R, [13.5, 4.5], [11, 1.5]]], expr: 'blink' }),
    front({ arms: [ARMS_DOWN[0], [SHOULDER_R, [14, 5], [15, 2]]], expr: 'o', fx: [{ kind: 'drop', at: [15, 0] }, { kind: 'drop', at: [13, 0] }] }),
    front({ arms: [ARMS_DOWN[0], [SHOULDER_R, [14, 5], [15, 2]]], expr: 'smirk', fx: [{ kind: 'sparkle', at: [0, 3] }] }),
  ],
  [[0, 900], [1, 500], [2, 400], [0, 600], [1, 500], [2, 400], [3, 1000]],
)

// ---------------------------------------------------------------------------------------------------------
// Water break: the bottle off his hip, a long glug, the back of his hand to his mouth.

const BOTTLE_LOW: Prop = { kind: 'shake', at: [13, 10] }
const BOTTLE_UP: Prop = { kind: 'shake', at: [12, 1] }
const DRINK = (expr: Expr, fx?: readonly Fx[]): Figure => looking(front({ arms: [ARMS_DOWN[0], [SHOULDER_R, [14, 6], [12.5, 4.5]]], props: [BOTTLE_UP], ...(fx === undefined ? {} : { fx }) }), 'right', expr)
const waterBreak = idle(
  'water-break',
  'Water break',
  [
    front({ arms: [ARMS_DOWN[0], [SHOULDER_R, [13.5, 9.5], [13.5, 11.5]]], props: [BOTTLE_LOW], expr: 'grin' }),
    DRINK('o'),
    DRINK('sleep', [{ kind: 'drop', at: [11, 5] }]),
    front({ arms: [ARMS_DOWN[0], [SHOULDER_R, [13.5, 9.5], [13.5, 11.5]]], props: [BOTTLE_LOW], expr: 'wink', fx: [{ kind: 'drop', at: [9, 6] }, SPARKLE_L] }),
  ],
  [[0, 600], [1, 400], ...loop([2, 1], 300, 3), [3, 1100]],
)

// ---------------------------------------------------------------------------------------------------------
// Belt tighten: a lifting belt hauled in a notch; his waist pulled thin, then his chest out.

const belted = (width: number, hands: [Limb, Limb], expr: Expr, fx?: readonly Fx[]): Figure => {
  const f = front({ arms: hands, expr, props: [{ kind: 'band', from: [8 - width / 2, 9.5], to: [8 + width / 2 - 1, 9.5] }], ...(fx === undefined ? {} : { fx }) })
  return { ...f, torso: { from: [8, 6], to: [8, 10], width } }
}
const BELT_HOLD = arms([3, 10], [5, 9.5])
const BELT_PULL = arms([2, 9], [2.5, 10])
const beltTighten = idle(
  'belt-tighten',
  'Belt tighten',
  [belted(6, BELT_HOLD, 'grin'), belted(5, BELT_PULL, 'strain', [SWEAT]), belted(4, BELT_PULL, 'o', [{ kind: 'star', at: [2, 8] }, { kind: 'star', at: [13, 8] }]), belted(7, arms([1.5, 6.5], [1.5, 3]), 'smirk', [SPARKLE_R])],
  [[0, 600], [1, 500], [0, 300], [1, 500], [2, 700], [3, 1100]],
)

// ---------------------------------------------------------------------------------------------------------
// Grip squeeze: a fist held up and clenched, the forearm popping each time.

const GRIP_L: Limb = [SHOULDER_L, [2.5, 9], [3, 6]]
const GRIP_R: Limb = [SHOULDER_R, [13.5, 9], [13, 6]]
const gripSqueeze = idle(
  'grip-squeeze',
  'Grip squeeze',
  [
    looking(front({ arms: [ARMS_DOWN[0], GRIP_R] }), 'right', 'grin'),
    looking(front({ arms: [ARMS_DOWN[0], GRIP_R], bicep: [[13.2, 7.5]], fx: [{ kind: 'star', at: [14, 5] }] }), 'right', 'strain'),
    looking(front({ arms: [GRIP_L, ARMS_DOWN[1]] }), 'left', 'grin'),
    looking(front({ arms: [GRIP_L, ARMS_DOWN[1]], bicep: [[2.8, 7.5]], fx: [{ kind: 'star', at: [1, 5] }] }), 'left', 'strain'),
    front({ arms: [GRIP_L, GRIP_R], bicep: [[2.8, 7.5], [13.2, 7.5]], expr: 'wink', fx: [SPARKLE_R] }),
  ],
  [...loop([0, 1], 250, 3), ...loop([2, 3], 250, 3), [4, 1000]],
)

// ---------------------------------------------------------------------------------------------------------
// Warm hands: cupped at his mouth, rubbed together, blown on.

const RUB = (y: number, expr: Expr, fx?: readonly Fx[]): Figure =>
  STAND_SIDE({
    arms: [
      [[7, 7], [10, 8.5], [11.5, 4.5 + y]],
      [[9, 7], [11.5, 8.5], [12, 5.5 - y]],
    ],
    expr,
    ...(fx === undefined ? {} : { fx }),
  })
const warmHands = idle(
  'warm-hands',
  'Warm hands',
  [RUB(0, 'blink'), RUB(1, 'blink'), RUB(0.5, 'o', [{ kind: 'puff', at: [13, 2] }]), face(STAND_SIDE({ expr: 'smirk' }), 'smirk', [{ kind: 'heart', at: [12, 1] }])],
  [...loop([0, 1], 150, 5), [2, 600], ...loop([0, 1], 150, 3), [2, 600], [3, 900]],
)

// ---------------------------------------------------------------------------------------------------------
// Skip in place: a knee up and a hop, the opposite arm swinging high.

const SKIP = (isFront: boolean, expr: Expr): Figure => {
  const y = -1
  return STAND_SIDE({
    head: [5, y],
    neck: [8, 6 + y],
    hip: [8, 10.5 + y],
    seat: [8.5, 12 + y],
    arms: isFront
      ? [
          [[7, 7 + y], [9, 5], [11, 3]],
          [[9, 7 + y], [7.5, 9], [6, 10]],
        ]
      : [
          [[7, 7 + y], [5.5, 8.5], [4.5, 10]],
          [[9, 7 + y], [11, 5], [12.5, 3]],
        ],
    legs: isFront
      ? [
          [[7, 12 + y], [7, 14.5 + y]],
          [[9, 11 + y], [12, 10 + y], [11.5, 13 + y]],
        ]
      : [
          [[7.5, 11 + y], [11, 10 + y], [10.5, 13 + y]],
          [[9, 12 + y], [9, 14.5 + y]],
        ],
    expr,
  })
}
const skipInPlace = idle(
  'skip-in-place',
  'Skip in place',
  [SKIP(true, 'grin'), STAND_SIDE({ expr: 'talk' }), SKIP(false, 'grin'), face(SKIP(true, 'wink'), 'wink', [{ kind: 'note', at: [1, 1] }])],
  [...loop([0, 1, 2, 1], 180, 3), [3, 900]],
)

// ---------------------------------------------------------------------------------------------------------
// Sumo sway: a wide, low stance, hands on his knees, his weight rocked side to side.

const SUMO = (dx: number, expr: Expr, fx?: readonly Fx[]): Figure =>
  front({
    y: 1,
    x: dx,
    arms: arms([2.5, 9.5], [3, 12]),
    legs: [
      [[6 - dx, 11], [3 - dx, 12], [3 - dx, 13.5]],
      [[10 - dx, 11], [13 - dx, 12], [13 - dx, 13.5]],
    ],
    expr,
    ...(fx === undefined ? {} : { fx }),
  })
const sumoSway = idle(
  'sumo-sway',
  'Sumo sway',
  [SUMO(-1, 'grin'), SUMO(0, 'strain'), SUMO(1, 'grin'), SUMO(0, 'smirk', [{ kind: 'puff', at: [0, 12] }, { kind: 'puff', at: [13, 12] }])],
  [...loop([0, 1, 2, 1], 350, 3), [3, 1000]],
)

// ---------------------------------------------------------------------------------------------------------
// Torso twist: arms out, swung round to one side and then the other, his head going with them.

const TWIST_L: [Limb, Limb] = [
  [SHOULDER_L, [2.5, 7], [0.5, 7]],
  [SHOULDER_R, [10, 8], [7.5, 8]],
]
const TWIST_OUT = arms([2.5, 7], [0.5, 7])
const torsoTwist = idle(
  'torso-twist',
  'Torso twist',
  [front({ arms: TWIST_OUT, expr: 'grin' }), looking(front({ arms: TWIST_L }), 'left', 'strain'), turned(looking(front({ arms: TWIST_L }), 'left', 'strain')), front({ arms: TWIST_OUT, expr: 'wink', fx: [SPARKLE_L] })],
  [[0, 400], ...loop([1, 0, 2, 0], 300, 3), [3, 900]],
)

// ---------------------------------------------------------------------------------------------------------
// Lean back: hands to his lower back, arched over backwards, and a satisfying crack.

const LEAN = (k: number, expr: Expr, fx?: readonly Fx[]): Figure =>
  side({
    head: [5 - 2 * k, 0 + k],
    neck: [8 - 1.5 * k, 6 + 0.5 * k],
    hip: [8, 10.5],
    arms: [
      [[7 - 1.5 * k, 7 + 0.5 * k], [5, 9], [6.5, 10.5]],
      [[9 - 1.5 * k, 7 + 0.5 * k], [5.5, 9.5], [7, 10.5]],
    ],
    legs: [
      [[7, 12], [7.5, 14.5]],
      [[9, 12], [9.5, 14.5]],
    ],
    seat: [8.5, 12],
    expr,
    ...(fx === undefined ? {} : { fx }),
  })
const leanBack = idle(
  'lean-back',
  'Lean back',
  [LEAN(0, 'grin'), LEAN(1, 'o'), LEAN(2, 'sleep', [{ kind: 'star', at: [9, 9] }, { kind: 'star', at: [10, 7] }]), face(LEAN(0, 'smirk'), 'smirk', [SPARKLE_R])],
  [[0, 500], [1, 500], [2, 1200], [1, 400], [0, 300], [3, 1000]],
)

// ---------------------------------------------------------------------------------------------------------
// Front kicks: a straight leg swung up to the opposite hand, one side then the other.

const FKICK = (isFront: boolean, expr: Expr): Figure =>
  STAND_SIDE({
    arms: isFront
      ? [
          [[7, 7], [5.5, 8.5], [4, 9]],
          [[9, 7], [11.5, 7], [14, 7.5]],
        ]
      : [
          [[7, 7], [10.5, 7], [13, 7.5]],
          [[9, 7], [7.5, 9], [6, 10]],
        ],
    legs: isFront
      ? [
          [[7, 12], [7, 14.5]],
          [[9, 11.5], [12, 10], [14.5, 8.5]],
        ]
      : [
          [[7.5, 11.5], [11, 10], [13.5, 8.5]],
          [[9, 12], [9, 14.5]],
        ],
    seat: [9, 11.5],
    expr,
  })
const frontKicks = idle(
  'front-kicks',
  'Front kicks',
  [FKICK(true, 'strain'), STAND_SIDE({ arms: SIDE_ARMS, expr: 'grin' }), FKICK(false, 'strain'), face(FKICK(true, 'wink'), 'wink', [{ kind: 'star', at: [14, 5] }])],
  [...loop([0, 1, 2, 1], 260, 3), [3, 900]],
)

// ---------------------------------------------------------------------------------------------------------
// Chin tuck: in profile, head pushed forward and drawn back into a double chin, then a nod.

const chin = (dx: number, dy: number, expr: Expr, fx?: readonly Fx[]): Figure => {
  const f = STAND_SIDE({ expr, ...(fx === undefined ? {} : { fx }) })
  return { ...f, head: { at: [5 + dx, dy], facing: 'right', expr } }
}
const chinTuck = idle(
  'chin-tuck',
  'Chin tuck',
  [chin(1, 0, 'o'), chin(-1, 1, 'strain'), chin(0, 2, 'blink'), chin(0, 0, 'smirk', [SPARKLE_R])],
  [...loop([0, 1], 450, 3), [2, 600], [3, 1000]],
)

// ---------------------------------------------------------------------------------------------------------
// Lateral shuffle: low and wide, stepping across the floor and back, dust at his feet.

const STANCE_WIDE: [Limb, Limb] = [
  [[6, 12], [4, 14.5]],
  [[10, 12], [12, 14.5]],
]
const STANCE_NARROW: [Limb, Limb] = [
  [[6.5, 12], [7, 14.5]],
  [[9.5, 12], [9, 14.5]],
]
const READY = arms([3, 9], [4.5, 8])
const shuffle = (x: number, isWide: boolean, expr: Expr, fx?: readonly Fx[]): Figure => front({ x, y: 0, arms: READY, legs: isWide ? STANCE_WIDE : STANCE_NARROW, expr, ...(fx === undefined ? {} : { fx }) })
const lateralShuffle = idle(
  'lateral-shuffle',
  'Lateral shuffle',
  [
    shuffle(-2, true, 'grin', [{ kind: 'puff', at: [14, 13] }]),
    shuffle(-1, false, 'talk'),
    shuffle(0, true, 'grin'),
    shuffle(1, false, 'talk'),
    shuffle(2, true, 'grin', [{ kind: 'puff', at: [-1, 13] }]),
    shuffle(0, true, 'wink', [SPARKLE_L]),
  ],
  [...loop([2, 3, 4, 3, 2, 1, 0, 1], 160, 2), [5, 900]],
)

export const IDLES_A: readonly Move[] = [
  armCircles,
  toeTouch,
  quadPull,
  tricepsReach,
  crossArmStretch,
  hipCircles,
  kneeHug,
  buttKicks,
  doubleUnders,
  boxerBounce,
  shakeOut,
  ankleRolls,
  deepBreath,
  browWipe,
  waterBreak,
  beltTighten,
  gripSqueeze,
  warmHands,
  skipInPlace,
  sumoSway,
  torsoTwist,
  leanBack,
  frontKicks,
  chinTuck,
  lateralShuffle,
]
