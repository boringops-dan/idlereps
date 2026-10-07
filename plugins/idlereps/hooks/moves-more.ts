/**
 * Copyright 2026 zrobok. All rights reserved: not covered by the Apache License (see NOTICE). Swolomon's
 * name, character, likeness and these moves are proprietary.
 *
 * More of his moves to collect (owner, 2026-10-06: "add 50 more ... Swolomon animations"): flexes and gags,
 * unlocked after the first 30 in this order, and played between his lines once collected. Among the gags, him
 * slacking off (owner: "Swolomon being a bad boy like eating a slice of pizza or sleeping on the job"), always
 * caught at the end. Pure data.
 */

import { turned } from './figure'
import { ARMS_DOWN, arms, beat, front, gesture, right, SHOULDER_L, SHOULDER_R, side, STAND_SIDE } from './move-kit'
import type { LineEntry } from './copy'
import type { Expr, Facing, Figure, Limb, P, Prop } from './figure'
import type { Move } from './moves'

/** A gesture that is a flex: each pose for its `ms`, once through, `reps` times. */
const flex = (id: string, title: string, poses: Figure[], ms: readonly number[], reps = 1): Move => ({ ...gesture(id, title, poses, ms, reps), family: 'flex' })

/** The same body, his head turned: profile heads sit a pixel toward the way he looks. */
const looking = (f: Figure, facing: Facing, expr: Expr = 'grin'): Figure => ({ ...f, head: { at: facing === 'right' ? [6, 0] : facing === 'left' ? [4, 0] : [5, 0], facing, expr } })

/** `poses` in turn, `ms` each, `times` over. */
const loop = (poses: readonly number[], ms: number, times: number): [number, number][] => Array.from({ length: times }, () => poses.map(p => [p, ms] as [number, number])).flat()

const DOUBLE_BICEPS = arms([1.5, 6.5], [1.5, 3])
const DOUBLE_BULGE: P[] = [
  [2.5, 5.8],
  [12.5, 5.8],
]
const L_FLEX: Limb = [SHOULDER_L, [1, 6.5], [1, 3]]
const R_FLEX: Limb = [SHOULDER_R, [14.5, 6.5], [14.5, 3]]
const L_HIP: Limb = [SHOULDER_L, [2.5, 9], [5, 10.5]]
const HIPS = arms([2, 8.5], [5, 10.5])
const WIDE: [Limb, Limb] = [
  [[6, 12], [4.5, 14.5]],
  [[10, 12], [11.5, 14.5]],
]
const HEELS: [Limb, Limb] = [
  [[7, 12], [7, 14.5]],
  [[9, 12], [9, 14.5]],
]
const BEHIND_HEAD = arms([2, 3.5], [5.5, 2])
const SPARKLE_L = { kind: 'sparkle', at: [0, 1] } as const
const SPARKLE_R = { kind: 'sparkle', at: [13, 1] } as const
const wide = (f: Figure, width: number): Figure => ({ ...f, torso: { from: [8, 6], to: [8, 10], width } })

// ---------------------------------------------------------------------------------------------------------
// Flexes.

const SIDE_CHEST = looking(
  front({
    arms: [
      [SHOULDER_L, [7, 10], [11.5, 9]],
      [SHOULDER_R, [13.5, 9.5], [12, 8.5]],
    ],
    bicep: [[13, 8]],
    legs: [
      [[6, 12], [7, 14.5]],
      [[10, 12], [11.5, 13], [10, 14.5]],
    ],
  }),
  'right',
  'smirk',
)
const sideChest = flex('side-chest', 'Side chest', [front(), SIDE_CHEST, { ...looking(SIDE_CHEST, 'right', 'wink'), fx: [SPARKLE_L] }], [400, 700, 900], 2)

const SIDE_TRI = looking(
  front({
    arms: [
      [SHOULDER_L, [7, 10.5], [12, 12]],
      [SHOULDER_R, [13, 9.5], [12.5, 12]],
    ],
    bicep: [[13.2, 8.8]],
  }),
  'right',
  'strain',
)
const sideTriceps = flex('side-triceps', 'Side triceps', [front(), SIDE_TRI, { ...looking(SIDE_TRI, 'right', 'wink'), fx: [SPARKLE_L] }], [400, 700, 900], 2)

const absAndThigh = flex(
  'abs-and-thigh',
  'Abs and thigh',
  [
    front({ arms: BEHIND_HEAD }),
    front({
      arms: BEHIND_HEAD,
      expr: 'strain',
      legs: [
        [[6, 12], [6, 14.5]],
        [[10, 12], [12, 13], [12, 14.5]],
      ],
      fx: [
        { kind: 'star', at: [7, 8] },
        { kind: 'star', at: [9, 9] },
        { kind: 'star', at: [7, 10] },
      ],
    }),
    front({ arms: BEHIND_HEAD, expr: 'wink', fx: [SPARKLE_R] }),
  ],
  [500, 900, 800],
  2,
)

const vacuum = flex(
  'vacuum',
  'Stomach vacuum',
  [front({ arms: arms([3, 9], [5.5, 10.5]) }), wide(front({ arms: arms([3.5, 9], [6.5, 10.5]), expr: 'o' }), 4), wide(front({ arms: arms([3.5, 9], [6.5, 10.5]), expr: 'strain', fx: [{ kind: 'sweat', at: [12, 1] }] }), 3.6)],
  [500, 900, 900],
  2,
)

const handsOnHips = flex(
  'hands-on-hips',
  'Hands on hips',
  [
    front({ arms: HIPS, legs: WIDE, expr: 'smirk' }),
    front({
      arms: HIPS,
      legs: WIDE,
      expr: 'grin',
      fx: [
        { kind: 'puff', at: [0, 3] },
        { kind: 'puff', at: [0, 8] },
        { kind: 'sparkle', at: [13, 0] },
      ],
    }),
  ],
  [700, 1000],
  2,
)

const ARCHER = front({
  arms: [
    [SHOULDER_L, [2, 7], [0, 6.5]],
    [SHOULDER_R, [14.5, 5.5], [12, 3.5]],
  ],
  bicep: [[13.5, 5.8]],
})
const archer = flex('archer-flex', 'Archer flex', [front(), looking(ARCHER, 'left', 'smirk'), { ...looking(ARCHER, 'left', 'wink'), fx: [{ kind: 'star', at: [0, 4] }, { kind: 'puff', at: [1, 9] }] }], [400, 900, 1000], 2)

const singlePeak = flex(
  'single-peak',
  'Single peak',
  [
    front({ arms: [L_HIP, ARMS_DOWN[1]] }),
    front({ arms: [L_HIP, R_FLEX], bicep: [[13.5, 5.8]], expr: 'smirk' }),
    front({ arms: [L_HIP, R_FLEX], bicep: [[13.5, 5.4]], expr: 'wink', fx: [{ kind: 'sparkle', at: [10, 2] }] }),
  ],
  [400, 700, 900],
  2,
)

const MIRROR: Prop = { kind: 'wall', x: 15 }
const MIRROR_FLEX: [Limb, Limb] = [
  [[7, 7], [6.5, 9.5], [6.5, 11.5]],
  [[9, 7], [12.5, 7.5], [12.5, 4]],
]
const mirrorCheck = flex(
  'mirror-check',
  'Mirror check',
  [STAND_SIDE({ props: [MIRROR] }), STAND_SIDE({ arms: MIRROR_FLEX, expr: 'smirk', props: [MIRROR] }), STAND_SIDE({ arms: MIRROR_FLEX, expr: 'wink', props: [MIRROR], fx: [{ kind: 'sparkle', at: [12, 0] }] })],
  [600, 700, 1100],
  2,
)

const V = arms([2.5, 4], [1, 1.5])
const crowdPleaser = flex(
  'crowd-pleaser',
  'Crowd pleaser',
  [front({ arms: V, expr: 'talk' }), front({ arms: V, x: -1, fx: [{ kind: 'heart', at: [12, 1] }] }), front({ arms: V, x: 1, expr: 'wink', fx: [{ kind: 'heart', at: [0, 1] }] })],
  [400, 400, 400],
  3,
)

const bicepPingPong = flex(
  'bicep-ping-pong',
  'Bicep ping-pong',
  [looking(front({ arms: [L_FLEX, ARMS_DOWN[1]], bicep: [[2, 5.8]] }), 'left', 'wink'), looking(front({ arms: [ARMS_DOWN[0], R_FLEX], bicep: [[13.5, 5.8]] }), 'right', 'wink')],
  [400, 400],
  3,
)

const quarterTurns = flex(
  'quarter-turns',
  'Quarter turns',
  [front(), STAND_SIDE({ expr: 'smirk' }), turned(STAND_SIDE({ expr: 'smirk' })), front({ arms: DOUBLE_BICEPS, bicep: DOUBLE_BULGE, expr: 'wink', fx: [SPARKLE_L] })],
  [600, 600, 600, 1000],
)

/** Arms straight out, a bulge rolling from one hand to the other, through his shoulders. */
const OUT = arms([2.5, 7], [0.5, 7])
const muscleWave = flex(
  'muscle-wave',
  'Muscle wave',
  [
    front({ arms: OUT, bicep: [[1, 5.6]] }),
    front({ arms: OUT, bicep: [[3, 5.6]] }),
    front({ arms: OUT, bicep: [[4.5, 5.8], [10.5, 5.8]], expr: 'talk' }),
    front({ arms: OUT, bicep: [[12, 5.6]] }),
    front({ arms: OUT, bicep: [[14, 5.6]], expr: 'wink' }),
  ],
  [220, 220, 220, 220, 500],
  2,
)

const POINT_AT_R: Limb = [SHOULDER_L, [7, 9.5], [12, 8]]
const GUN_SHOW = front({ arms: [POINT_AT_R, R_FLEX], bicep: [[13.5, 5.8]], expr: 'talk' })
const gunShow = flex('gun-show', 'Gun show', [GUN_SHOW, { ...GUN_SHOW, head: { at: [5, 0], facing: 'front', expr: 'wink' }, fx: [{ kind: 'star', at: [15, 1] }, { kind: 'star', at: [12, 0] }] }, turned(GUN_SHOW)], [500, 700, 900], 2)

const latFlare = flex(
  'lat-flare',
  'Lat flare',
  [front({ arms: arms([3, 9], [5.5, 10.5]) }), wide(front({ arms: arms([2, 9.5], [5, 10.5]), expr: 'strain' }), 8), wide(front({ arms: arms([1, 9.5], [4.5, 10.5]), expr: 'smirk', fx: [SPARKLE_L] }), 10)],
  [400, 400, 1000],
  2,
)

const CROSSED: [Limb, Limb] = [
  [SHOULDER_L, [5, 10], [11, 8.5]],
  [SHOULDER_R, [11, 10], [5, 8.5]],
]
const CROSSED_BULGE: P[] = [
  [3.8, 8.5],
  [12.2, 8.5],
]
const armsCrossed = flex(
  'arms-crossed',
  'Arms crossed',
  [front({ arms: CROSSED, bicep: CROSSED_BULGE, expr: 'smirk' }), front({ arms: CROSSED, bicep: CROSSED_BULGE, expr: 'blink' }), front({ arms: CROSSED, bicep: CROSSED_BULGE, expr: 'wink', fx: [SPARKLE_R] })],
  [1000, 150, 1000],
  2,
)

const crownedBicep = flex(
  'crowned-bicep',
  'Crowned bicep',
  [
    front({ bare: true, arms: right([13.5, 7.5], [12.5, 4.5]), props: [{ kind: 'laurel', at: [10, 4] }] }),
    front({ bare: true, arms: [[SHOULDER_L, [6, 9], [11, 5]], R_FLEX], bicep: [[13.5, 5.8]], expr: 'o', props: [{ kind: 'laurel', at: [11, 3] }] }),
    front({ bare: true, arms: [ARMS_DOWN[0], R_FLEX], bicep: [[13.5, 5.8]], expr: 'wink', props: [{ kind: 'laurel', at: [11, 3] }], fx: [{ kind: 'sparkle', at: [0, 1] }] }),
  ],
  [600, 600, 1300],
)

const MOST_MUSCULAR = (expr: Expr, fx: Figure['fx'] = []): Figure =>
  front({
    y: 1,
    arms: [
      [SHOULDER_L, [3, 10], [6.5, 11]],
      [SHOULDER_R, [13, 10], [9.5, 11]],
    ],
    bicep: [
      [3.5, 8.5],
      [12.5, 8.5],
    ],
    expr,
    fx,
  })
const poseDown = flex(
  'pose-down',
  'Pose-down',
  [front({ arms: DOUBLE_BICEPS, bicep: DOUBLE_BULGE }), MOST_MUSCULAR('strain', [{ kind: 'sweat', at: [12, 1] }]), front({ arms: DOUBLE_BICEPS, bicep: DOUBLE_BULGE, expr: 'strain', fx: [{ kind: 'drop', at: [4, 1] }] }), MOST_MUSCULAR('wink', [{ kind: 'puff', at: [0, 1] }, { kind: 'puff', at: [13, 1] }])],
  [300, 300, 300, 600],
  2,
)

const FLAMINGO: [Limb, Limb] = [
  [[7, 12], [7, 14.5]],
  [[9, 12], [12, 11.5], [9.5, 13]],
]
const flamingo = flex(
  'flamingo-flex',
  'Flamingo flex',
  [
    front({ arms: DOUBLE_BICEPS, bicep: DOUBLE_BULGE, legs: FLAMINGO }),
    front({ arms: DOUBLE_BICEPS, bicep: DOUBLE_BULGE, legs: FLAMINGO, x: 1, expr: 'o' }),
    front({ arms: DOUBLE_BICEPS, bicep: DOUBLE_BULGE, legs: FLAMINGO, x: -1, expr: 'o' }),
    front({ arms: DOUBLE_BICEPS, bicep: DOUBLE_BULGE, legs: FLAMINGO, expr: 'wink', fx: [{ kind: 'sparkle', at: [13, 9] }] }),
  ],
  [500, 250, 250, 1000],
  2,
)

// ---------------------------------------------------------------------------------------------------------
// Gags.

/** Three dumbbells round four spots, the hands low: one always in the air on each side. */
const SLOTS: P[] = [
  [2, 10],
  [2, 3],
  [13, 3],
  [13, 10],
]
const juggle = gesture(
  'juggle',
  'Juggling',
  [0, 1, 2, 3].map(i =>
    front({
      arms: arms([3, 10], [3, 11]),
      expr: i % 2 === 0 ? 'o' : 'grin',
      props: [0, 1, 2].map(k => ({ kind: 'dumbbell' as const, at: SLOTS[(i + k) % 4] ?? [2, 10], upright: true })),
    }),
  ),
  [220, 220, 220, 220],
  3,
)

const SPIN = right([13.5, 4.5], [13, 1.5])
const laurelSpin: Move = {
  id: 'laurel-spin',
  title: 'Laurel spin',
  family: 'gag',
  poses: [
    front({ bare: true, arms: SPIN, expr: 'o', props: [{ kind: 'laurel', at: [10, 0] }] }),
    front({ bare: true, arms: SPIN, expr: 'grin', props: [{ kind: 'laurel', at: [9, 0] }], fx: [{ kind: 'star', at: [15, 2] }] }),
    front({ expr: 'wink', fx: [SPARKLE_L] }),
  ],
  beats: [...loop([0, 1], 150, 5), [2, 1000]],
  reps: 1,
}

const chalkUp: Move = {
  id: 'chalk-up',
  title: 'Chalk up',
  family: 'gag',
  poses: [
    front({ arms: arms([5, 10], [7.3, 9]), expr: 'smirk' }),
    front({ arms: arms([4.5, 10], [6.8, 9.5]), expr: 'smirk' }),
    front({
      arms: arms([2.5, 8], [2, 6]),
      expr: 'o',
      fx: [
        { kind: 'puff', at: [6, 7] },
        { kind: 'puff', at: [2, 9] },
        { kind: 'puff', at: [10, 8] },
        { kind: 'puff', at: [7, 11] },
      ],
    }),
    front({
      expr: 'blink',
      fx: [
        { kind: 'puff', at: [1, 2] },
        { kind: 'puff', at: [12, 3] },
      ],
    }),
  ],
  beats: [...loop([0, 1], 200, 3), [2, 700], [3, 800]],
  reps: 1,
}

const ROPE_HANDS = arms([3, 10], [2, 11.5])
const jumpRope = gesture(
  'jump-rope',
  'Jump rope',
  [
    front({
      arms: ROPE_HANDS,
      props: [
        { kind: 'band', from: [2, 11.5], to: [0.5, 0] },
        { kind: 'band', from: [13, 11.5], to: [14.5, 0] },
      ],
    }),
    front({
      y: -1,
      arms: ROPE_HANDS,
      expr: 'talk',
      props: [
        { kind: 'band', from: [2, 11.5], to: [3, 16] },
        { kind: 'band', from: [3, 16], to: [12, 16] },
        { kind: 'band', from: [12, 16], to: [13, 11.5] },
      ],
    }),
  ],
  [260, 260],
  5,
)

const HOOP_ARMS = arms([2, 5], [2.5, 2])
const hulaHoop = gesture(
  'hula-hoop',
  'Hula hoop',
  [
    front({ x: -1, arms: HOOP_ARMS, props: [{ kind: 'band', from: [2, 9], to: [15, 11] }], fx: [{ kind: 'note', at: [14, 1] }] }),
    front({ x: 1, arms: HOOP_ARMS, expr: 'talk', props: [{ kind: 'band', from: [0, 11], to: [13, 9] }] }),
  ],
  [260, 260],
  5,
)

const GUITAR: Prop[] = [
  { kind: 'band', from: [0.5, 6.5], to: [8, 10] },
  { kind: 'band', from: [7, 10], to: [11, 12] },
  { kind: 'band', from: [8, 11], to: [11, 11] },
]
const airGuitar = gesture(
  'air-guitar',
  'Air guitar',
  [
    front({ arms: [[SHOULDER_L, [2, 8], [0.5, 6.5]], right([12.5, 10], [10, 9])[1]], props: GUITAR, expr: 'strain', fx: [{ kind: 'note', at: [13, 1] }] }),
    front({ arms: [[SHOULDER_L, [2, 8], [0.5, 6.5]], right([12.5, 10.5], [10.5, 12])[1]], props: GUITAR, expr: 'o', fx: [{ kind: 'note', at: [14, 3] }] }),
  ],
  [220, 220],
  5,
)

const GUARD = (expr: Expr = 'smirk'): Figure =>
  STAND_SIDE({
    arms: [
      [[7, 7], [8, 10], [10, 7]],
      [[9, 7], [11, 9], [12, 6.5]],
    ],
    legs: [
      [[7, 12], [5.5, 14.5]],
      [[9, 12], [10.5, 14.5]],
    ],
    expr,
  })
const karateKick = gesture(
  'karate-kick',
  'Karate kick',
  [
    GUARD(),
    side({
      head: [3, 0],
      neck: [6, 6],
      hip: [7, 10.5],
      arms: [
        [[5.5, 7], [4, 9], [3, 7]],
        [[7, 7], [9, 8.5], [10, 6.5]],
      ],
      legs: [
        [[6.5, 11.5], [6, 14.5]],
        [[8, 11.5], [12, 10], [15, 9.5]],
      ],
      expr: 'strain',
      fx: [{ kind: 'puff', at: [13, 6] }],
    }),
    GUARD('wink'),
  ],
  [500, 700, 800],
  2,
)

const TREE: [Limb, Limb] = [
  [[7, 12], [7, 14.5]],
  [[9, 12], [12, 12.5], [8, 13.5]],
]
const OVERHEAD = arms([3, 4], [5.5, 0.5])
const treePose = gesture(
  'tree-pose',
  'Tree pose',
  [
    front({ legs: TREE, arms: arms([5, 10], [7.3, 8]), expr: 'blink' }),
    front({ legs: TREE, arms: OVERHEAD, expr: 'blink', fx: [SPARKLE_L] }),
    front({ legs: TREE, arms: OVERHEAD, x: 1, expr: 'o' }),
    front({ legs: TREE, arms: OVERHEAD, x: -1, expr: 'o' }),
  ],
  [800, 1000, 250, 250],
  2,
)

const CROSS_LEGGED: [Limb, Limb] = [
  [[6, 12], [2.5, 12.5], [7, 13]],
  [[10, 12], [13.5, 12.5], [9, 13]],
]
const SEATED = (y: number, expr: Expr, fx: Figure['fx'] = []): Figure => front({ y, legs: CROSS_LEGGED, arms: arms([3, 10], [2.5, 11.5]), expr, fx })
const meditate = gesture(
  'meditate',
  'Meditate',
  [SEATED(2, 'blink'), SEATED(1, 'blink', [SPARKLE_L, { kind: 'sparkle', at: [13, 3] }]), SEATED(2, 'sleep', [{ kind: 'zzz', at: [12, 0] }]), SEATED(2, 'o')],
  [900, 1000, 1200, 700],
)

const PHONE_UP = right([14, 6], [14, 4.5])
const PEACE: Limb = [SHOULDER_L, [2.5, 6], [3, 3.5]]
const selfie = gesture(
  'selfie',
  'Selfie',
  [
    front({ arms: PHONE_UP, expr: 'o', props: [{ kind: 'phone', at: [13, 1] }] }),
    front({ arms: [PEACE, PHONE_UP[1]], expr: 'wink', props: [{ kind: 'phone', at: [13, 1] }] }),
    front({ arms: [PEACE, PHONE_UP[1]], expr: 'wink', props: [{ kind: 'phone', at: [13, 1] }], fx: [{ kind: 'sparkle', at: [11, 5] }, { kind: 'star', at: [15, 0] }] }),
  ],
  [700, 500, 1000],
)

const sneeze = gesture(
  'sneeze',
  'Sneeze',
  [
    front({ expr: 'o' }),
    front({ expr: 'blink', arms: arms([3, 9], [4, 7]) }),
    front({
      y: 1,
      bare: true,
      expr: 'strain',
      arms: arms([3, 10], [5, 11]),
      props: [{ kind: 'laurel', at: [8, 0] }],
      fx: [
        { kind: 'puff', at: [11, 4] },
        { kind: 'puff', at: [13, 6] },
      ],
    }),
    front({ expr: 'smirk' }),
  ],
  [500, 600, 700, 900],
)

const STRETCH_UP = arms([2.5, 4], [2.5, 1])
const yawn = gesture('yawn', 'Yawn', [front({ expr: 'o' }), front({ arms: STRETCH_UP, expr: 'o' }), front({ arms: STRETCH_UP, expr: 'sleep' }), front({ expr: 'blink' })], [600, 1100, 500, 700])

const WALK = (i: number): Figure =>
  STAND_SIDE({
    arms: [
      [[7, 7], i === 0 ? [5.5, 9.5] : [8, 9.5], i === 0 ? [5, 11.5] : [9, 11.5]],
      [[9, 7], i === 0 ? [10.5, 9.5] : [8, 9.5], i === 0 ? [11, 11.5] : [7, 11.5]],
    ],
    legs:
      i === 0
        ? [
            [[7, 12], [5.5, 14.5]],
            [[9, 12], [10.5, 14.5]],
          ]
        : HEELS,
    props: [{ kind: 'dumbbell', at: [13, 14] }],
  })
const totallyMeantThat = gesture(
  'meant-that',
  'Totally meant that',
  [
    WALK(0),
    WALK(1),
    side({
      head: [8, 2],
      neck: [10, 8],
      hip: [7, 11],
      arms: [
        [[9.5, 8], [12, 8], [14, 6]],
        [[10.5, 8], [13, 9], [15, 8]],
      ],
      legs: [
        [[7, 11.5], [4, 13], [2, 12]],
        [[8, 11.5], [10, 14.5]],
      ],
      expr: 'o',
      props: [{ kind: 'dumbbell', at: [13, 14] }],
    }),
    front({ arms: DOUBLE_BICEPS, bicep: DOUBLE_BULGE, expr: 'wink', props: [{ kind: 'dumbbell', at: [13, 14] }], fx: [SPARKLE_L] }),
  ],
  [400, 400, 600, 1300],
)

const PASSE_FRONT: [Limb, Limb] = [
  [[7, 12], [8, 14.5]],
  [[9, 12], [11.5, 12.5], [8.5, 13]],
]
const PASSE_SIDE: [Limb, Limb] = [
  [[7, 12], [8, 14.5]],
  [[9, 12], [11, 11.5], [8.5, 13]],
]
const RING_SIDE: [Limb, Limb] = [
  [[7, 7], [6, 4], [7.5, 1.5]],
  [[9, 7], [10.5, 4], [9, 1.5]],
]
const pirouette: Move = {
  id: 'pirouette',
  title: 'Pirouette',
  family: 'gag',
  poses: [
    front({ arms: OVERHEAD, legs: PASSE_FRONT, expr: 'blink' }),
    STAND_SIDE({ arms: RING_SIDE, legs: PASSE_SIDE, expr: 'blink' }),
    turned(STAND_SIDE({ arms: RING_SIDE, legs: PASSE_SIDE, expr: 'blink' })),
    front({ arms: arms([2, 7], [0.5, 7.5]), legs: HEELS, expr: 'wink', fx: [SPARKLE_L, SPARKLE_R] }),
  ],
  beats: [...loop([0, 1, 2], 180, 3), [3, 1000]],
  reps: 1,
}

const plie = gesture(
  'plie',
  'Plié',
  [
    front({ legs: HEELS, arms: arms([3, 10], [5, 11.5]), expr: 'smirk' }),
    front({
      y: 1,
      legs: [
        [[7, 12], [4, 12.5], [6, 13.5]],
        [[9, 12], [12, 12.5], [10, 13.5]],
      ],
      arms: OVERHEAD,
      expr: 'blink',
    }),
    front({ legs: HEELS, arms: arms([2, 7], [0.5, 7.5]), expr: 'smirk', fx: [{ kind: 'sparkle', at: [13, 10] }] }),
  ],
  [600, 800, 900],
  2,
)

const robot = gesture(
  'robot-dance',
  'The robot',
  [
    front({
      arms: [
        [SHOULDER_L, [2, 7], [2, 4]],
        [SHOULDER_R, [14, 7], [14, 10]],
      ],
      expr: 'blink',
    }),
    front({
      arms: [
        [SHOULDER_L, [2, 7], [2, 10]],
        [SHOULDER_R, [14, 7], [14, 4]],
      ],
      expr: 'blink',
    }),
    front({ x: 1, arms: arms([2.5, 9.5], [5, 9.5]), expr: 'smirk' }),
  ],
  [320, 320, 320],
  3,
)

const SUMO_ARMS = arms([3, 10], [4, 11])
const SUMO: [Limb, Limb] = [
  [[6, 12], [3, 12], [3, 13.5]],
  [[10, 12], [13, 12], [13, 13.5]],
]
const sumoStomp = gesture(
  'sumo-stomp',
  'Sumo stomp',
  [
    front({ y: 1, legs: SUMO, arms: SUMO_ARMS, expr: 'smirk' }),
    front({
      y: 1,
      x: -1,
      legs: [
        [[6, 12], [3, 12], [3, 13.5]],
        [[10, 12], [13, 10], [14.5, 8]],
      ],
      arms: SUMO_ARMS,
      expr: 'talk',
    }),
    front({
      y: 1,
      legs: SUMO,
      arms: SUMO_ARMS,
      expr: 'strain',
      fx: [
        { kind: 'puff', at: [12, 12] },
        { kind: 'star', at: [15, 10] },
        { kind: 'star', at: [9, 11] },
      ],
    }),
  ],
  [500, 600, 600],
  2,
)

const JAB = STAND_SIDE({
  arms: [
    [[7, 7], [8, 10], [10, 7]],
    [[9, 7], [12, 7], [15, 7]],
  ],
  legs: [
    [[7, 12], [5.5, 14.5]],
    [[9, 12], [10.5, 14.5]],
  ],
  expr: 'strain',
  fx: [{ kind: 'puff', at: [13, 4] }],
})
const CROSS = STAND_SIDE({
  arms: [
    [[7, 7], [11, 7.5], [14.5, 7.5]],
    [[9, 7], [11, 9], [12, 6.5]],
  ],
  legs: [
    [[7, 12], [5.5, 14.5]],
    [[9, 12], [10.5, 14.5]],
  ],
  expr: 'strain',
  fx: [{ kind: 'puff', at: [13, 9] }],
})
const shadowBoxing: Move = {
  id: 'shadow-boxing',
  title: 'Shadow boxing',
  family: 'gag',
  poses: [GUARD(), JAB, CROSS, GUARD('wink')],
  beats: [...loop([0, 1, 0, 1, 0, 2], 200, 2), [3, 800]],
  reps: 1,
}

const tinyDumbbell = gesture(
  'tiny-dumbbell',
  'Tiny dumbbell',
  [
    front({ arms: right([13.5, 9.5], [13, 11.5]), props: [{ kind: 'dumbbell', at: [13, 12] }], expr: 'strain', fx: [{ kind: 'sweat', at: [11, 1] }] }),
    front({ x: 1, arms: right([13.5, 9.5], [13, 11]), props: [{ kind: 'dumbbell', at: [13, 11.5] }], expr: 'strain', fx: [{ kind: 'drop', at: [4, 2] }] }),
    front({ arms: right([13.5, 9.5], [12.5, 6.5]), bicep: [[13, 8]], props: [{ kind: 'dumbbell', at: [12.5, 6] }], expr: 'talk', fx: [{ kind: 'sparkle', at: [0, 1] }] }),
  ],
  [300, 300, 1100],
  2,
)

/** A rack down his left: two on it, the third going on, set straight, admired. */
const RACK: Prop[] = [
  { kind: 'dumbbell', at: [0, 13] },
  { kind: 'dumbbell', at: [0, 10] },
]
const rackWeights = gesture(
  'rack-weights',
  "Rack 'em",
  [
    front({ x: 2, arms: right([12.5, 9.5], [12.5, 11.5]), props: [...RACK, { kind: 'dumbbell', at: [12.5, 12] }] }),
    { ...front({ x: 2, arms: [[SHOULDER_L, [2, 8], [0, 7.5]], ARMS_DOWN[1]], props: [...RACK, { kind: 'dumbbell', at: [0, 7] }] }), head: { at: [6, 0], facing: 'left', expr: 'smirk' } },
    front({ x: 2, expr: 'blink', props: [...RACK, { kind: 'dumbbell', at: [0, 7] }], fx: [{ kind: 'sparkle', at: [11, 6] }] }),
  ],
  [700, 700, 1100],
)

const POLISH = (hand: number, expr: Expr, fx: Figure['fx'] = []): Figure => front({ bare: true, arms: arms([4, 9.5], [hand, 7.5]), expr, props: [{ kind: 'laurel', at: [5, 7] }], fx })
const laurelPolish: Move = {
  id: 'laurel-polish',
  title: 'Laurel polish',
  family: 'gag',
  poses: [POLISH(5.5, 'grin'), POLISH(5.5, 'o', [{ kind: 'puff', at: [7, 4] }]), POLISH(6.5, 'blink'), POLISH(5, 'blink', [{ kind: 'star', at: [9, 7] }]), front({ expr: 'wink', fx: [SPARKLE_L, SPARKLE_R] })],
  beats: [[0, 500], [1, 700], ...loop([2, 3], 180, 3), [4, 1000]],
  reps: 1,
}

/** Down on one knee, the laces looped, pulled tight, and up again. */
const TYING = (hand: P, expr: Expr, fx: Figure['fx'] = []): Figure =>
  side({
    head: [6.5, 4],
    neck: [9, 9.5],
    hip: [6.5, 12],
    arms: [
      [[8.5, 10], [10.5, 12], hand],
      [[9.5, 10], [11.5, 12.5], [hand[0] + 0.5, hand[1]]],
    ],
    legs: [
      [[6.5, 12.5], [4, 14.5], [1.5, 14.5]],
      [[7.5, 12.5], [11, 12.5], [11, 14.5]],
    ],
    expr,
    fx,
  })
const tieShoe: Move = {
  id: 'tie-shoe',
  title: 'Tie a shoe',
  family: 'gag',
  poses: [TYING([11.5, 14], 'blink'), TYING([12.5, 13], 'smirk'), TYING([12, 12.5], 'strain', [{ kind: 'star', at: [14, 12] }]), STAND_SIDE({ expr: 'wink', fx: [SPARKLE_R] })],
  beats: [...loop([0, 1], 250, 3), [2, 500], [3, 1000]],
  reps: 1,
}

const bandSnap = gesture(
  'band-snap',
  'Band snap',
  [
    front({ arms: arms([3, 9], [4.5, 8]), props: [{ kind: 'band', from: [4.5, 8], to: [10.5, 8] }] }),
    front({ arms: arms([2, 8], [0.5, 8]), props: [{ kind: 'band', from: [0.5, 8], to: [14.5, 8] }], expr: 'strain' }),
    front({
      arms: arms([2, 8], [0.5, 8]),
      props: [
        { kind: 'band', from: [0.5, 8], to: [1, 11] },
        { kind: 'band', from: [14.5, 8], to: [14, 11] },
      ],
      expr: 'o',
      fx: [{ kind: 'puff', at: [6, 7] }],
    }),
    front({ expr: 'blink', props: [{ kind: 'band', from: [3.5, 11.5], to: [3.5, 14] }] }),
  ],
  [500, 800, 500, 900],
)

// ---------------------------------------------------------------------------------------------------------
// Slacking off: each caught at the end, startled, then snapping into a flex or a sheepish wink.

const STARTLED = (props: Prop[] = []): Figure => front({ expr: 'o', arms: arms([2, 7.5], [1.5, 5]), props, fx: [{ kind: 'drop', at: [11, 0] }] })
const SNAP_FLEX = front({ arms: DOUBLE_BICEPS, bicep: DOUBLE_BULGE, expr: 'grin', fx: [SPARKLE_L] })
const SHEEPISH = front({ arms: arms([3.5, 9.5], [5.5, 11]), expr: 'wink', fx: [{ kind: 'drop', at: [11, 0] }] })

/** The slacking poses `loops` times over, `ms` each, then the catch: each caught pose in turn, the last held. */
const slack = (id: string, title: string, doing: readonly Figure[], ms: number, loops: number, caught: readonly Figure[] = [STARTLED(), SNAP_FLEX]): Move => ({
  id,
  title,
  family: 'gag',
  poses: [...doing, ...caught],
  beats: [...loop(doing.map((_, i) => i), ms, loops), ...caught.map((_, i): [number, number] => [doing.length + i, i === caught.length - 1 ? 1100 : 500])],
  reps: 1,
})

const SNACK_ARM = (hand: P): [Limb, Limb] => right([13.5, 9], hand)
const pizzaBreak = slack(
  'pizza-break',
  'Pizza break',
  [
    front({ arms: SNACK_ARM([12, 7]), props: [{ kind: 'pizza', at: [10, 6] }] }),
    front({ arms: SNACK_ARM([11.5, 5.5]), expr: 'o', props: [{ kind: 'pizza', at: [9, 3] }] }),
    front({ arms: SNACK_ARM([12, 7]), expr: 'talk', props: [{ kind: 'pizza', at: [10, 6] }], fx: [{ kind: 'heart', at: [0, 1] }] }),
  ],
  450,
  2,
  [STARTLED([{ kind: 'pizza', at: [11, 12] }]), SNAP_FLEX],
)

const DROOP = (fx: Figure['fx']): Figure => ({ ...front({ arms: right([12.5, 9.5], [12.5, 11.5]), props: [{ kind: 'pad', at: [11, 11] }], fx }), head: { at: [5, 1], facing: 'front', expr: 'sleep' } })
const asleepOnTheJob = slack('asleep-on-the-job', 'Asleep on the job', [DROOP([{ kind: 'zzz', at: [12, 0] }]), DROOP([{ kind: 'zzz', at: [13, 2] }, { kind: 'drop', at: [9, 7] }])], 700, 2)

const HANDHELD = (x: number, expr: Expr, fx: Figure['fx'] = []): Figure => front({ x, arms: arms([3.5, 10], [5, 9.5]), expr, props: [{ kind: 'handheld', at: [5, 8] }], fx })
const gaming = slack('gaming', 'Gaming', [HANDHELD(0, 'strain', [{ kind: 'star', at: [7, 7] }]), HANDHELD(-1, 'talk'), HANDHELD(1, 'strain', [{ kind: 'note', at: [14, 1] }])], 300, 3, [STARTLED([{ kind: 'handheld', at: [10, 13] }]), SHEEPISH])

const BOB = (dy: number, armsAt: [Limb, Limb], fx: Figure['fx']): Figure => {
  const f = front({ arms: armsAt, expr: 'blink', fx })
  return { ...f, head: { at: [5, dy], facing: 'front', expr: 'blink' }, props: [{ kind: 'headphones', at: [5, dy] }] }
}
const headphonesOn = slack(
  'headphones-on',
  'Headphones on',
  [BOB(0, arms([3, 9], [5, 7.5]), [{ kind: 'note', at: [13, 1] }]), BOB(1, arms([3, 10], [4, 11.5]), [{ kind: 'note', at: [0, 3] }])],
  350,
  4,
  [{ ...STARTLED(), props: [{ kind: 'headphones', at: [5, 0] }] }, SNAP_FLEX],
)

const SCROLL = (dy: number, expr: Expr): Figure => ({ ...front({ arms: right([12.5, 10], [11, 8.5]), props: [{ kind: 'phone', at: [10, 6 + dy] }] }), head: { at: [5, 1], facing: 'front', expr } })
const scrolling = slack('scrolling', 'Scrolling', [SCROLL(0, 'blink'), SCROLL(0, 'grin'), SCROLL(-1, 'blink')], 400, 3, [STARTLED([{ kind: 'phone', at: [12, 13] }]), SHEEPISH])

const donutBreak = slack(
  'donut-break',
  'Donut',
  [
    front({ arms: SNACK_ARM([12, 7.5]), props: [{ kind: 'donut', at: [10.5, 6.5] }] }),
    front({ arms: SNACK_ARM([11.5, 5.5]), expr: 'o', props: [{ kind: 'donut', at: [9, 3] }] }),
    front({ arms: SNACK_ARM([12, 7.5]), expr: 'talk', props: [{ kind: 'donut', at: [10.5, 6.5] }], fx: [{ kind: 'sparkle', at: [0, 1] }] }),
  ],
  450,
  2,
  [STARTLED([{ kind: 'donut', at: [11, 13] }]), SHEEPISH],
)

const BURGER_HOLD = arms([3.5, 10], [6, 9])
const cheatDay = slack(
  'cheat-day',
  'Cheat day',
  [
    front({ arms: BURGER_HOLD, props: [{ kind: 'burger', at: [6, 7] }], fx: [{ kind: 'heart', at: [12, 0] }] }),
    front({ arms: arms([3.5, 9], [6, 6.5]), expr: 'blink', props: [{ kind: 'burger', at: [6, 4] }] }),
    front({ arms: BURGER_HOLD, expr: 'talk', props: [{ kind: 'burger', at: [6, 7] }] }),
  ],
  500,
  2,
  [STARTLED(), SHEEPISH],
)

const SIP = (hand: P, can: P, expr: Expr, fx: Figure['fx'] = []): Figure =>
  STAND_SIDE({
    arms: [
      [[7, 7], [6.5, 9.5], [6.5, 11.5]],
      [[9, 7], [11, 9.5], hand],
    ],
    expr,
    props: [{ kind: 'soda', at: can }],
    fx,
  })
const sodaBreak = slack('soda-break', 'Soda break', [SIP([11.5, 9.5], [11, 8], 'grin'), SIP([11, 6], [10.5, 3], 'blink'), SIP([11.5, 9.5], [11, 8], 'o', [{ kind: 'puff', at: [12, 3] }])], 600, 2)

const SPRAWL = (expr: Expr, fx: Figure['fx']): Figure =>
  front({
    y: 3,
    legs: [
      [[6, 12], [3, 12], [1.5, 11.5]],
      [[10, 12], [13, 12], [14.5, 11.5]],
    ],
    arms: arms([2, 9], [1, 10]),
    expr,
    props: [{ kind: 'beanbag', at: [2, 4] }],
    fx,
  })
const beanbag = slack('beanbag', 'Beanbag', [SPRAWL('sleep', [{ kind: 'zzz', at: [12, 2] }]), SPRAWL('sleep', [{ kind: 'zzz', at: [13, 0] }, { kind: 'drop', at: [9, 9] }])], 700, 2, [SPRAWL('o', [{ kind: 'drop', at: [11, 3] }]), SNAP_FLEX])

const COUCH = (expr: Expr, fx: Figure['fx'], hand: P = [11, 8]): Figure =>
  side({
    head: [3, 1],
    neck: [5.5, 6.5],
    hip: [4.5, 10.5],
    arms: [
      [[4.5, 7.5], [5, 10], [7, 10]],
      [[6, 7.5], [8.5, 9], hand],
    ],
    legs: [
      [[4, 11], [8, 11], [8, 14.5]],
      [[5, 11], [9, 11], [9, 14.5]],
    ],
    seat: [6.5, 11],
    expr,
    props: [
      { kind: 'chair', at: [1, 9] },
      { kind: 'remote', at: [hand[0], hand[1] - 2] },
    ],
    fx,
  })
const channelSurfing = slack('channel-surfing', 'Channel surfing', [COUCH('grin', [{ kind: 'star', at: [14, 6] }]), COUCH('blink', [{ kind: 'star', at: [15, 8] }], [11.5, 7.5]), COUCH('smirk', [{ kind: 'sparkle', at: [13, 5] }])], 450, 3, [COUCH('o', [{ kind: 'drop', at: [10, 0] }]), SHEEPISH])

const bubbleGum = slack(
  'bubble-gum',
  'Bubble gum',
  [front({ expr: 'smirk' }), front({ expr: 'grin', props: [{ kind: 'bubble', at: [7, 4] }] }), front({ expr: 'blink', props: [{ kind: 'bubble', at: [5.5, 3], big: true }] })],
  600,
  1,
  [
    front({
      expr: 'o',
      arms: arms([2, 7.5], [1.5, 5]),
      fx: [
        { kind: 'puff', at: [3, 3] },
        { kind: 'puff', at: [10, 3] },
      ],
    }),
    SHEEPISH,
  ],
)

const DOODLE = (hand: P, expr: Expr, fx: Figure['fx'] = []): Figure =>
  front({
    arms: [
      [SHOULDER_L, [4, 10], [6, 10]],
      [SHOULDER_R, [12, 10], hand],
    ],
    expr,
    props: [{ kind: 'pad', at: [6, 8] }],
    fx,
  })
const doodling = slack(
  'doodling',
  'Doodling',
  [DOODLE([9, 9], 'smirk'), DOODLE([8.5, 10], 'smirk', [{ kind: 'heart', at: [12, 2] }]), DOODLE([9.5, 10], 'talk', [{ kind: 'star', at: [14, 1] }])],
  400,
  3,
  [STARTLED([{ kind: 'pad', at: [11, 12] }]), SNAP_FLEX],
)

export const MORE_MOVES: readonly Move[] = [
  sideChest,
  sideTriceps,
  absAndThigh,
  vacuum,
  handsOnHips,
  archer,
  singlePeak,
  mirrorCheck,
  crowdPleaser,
  bicepPingPong,
  quarterTurns,
  muscleWave,
  gunShow,
  latFlare,
  armsCrossed,
  crownedBicep,
  poseDown,
  flamingo,
  juggle,
  laurelSpin,
  chalkUp,
  jumpRope,
  hulaHoop,
  airGuitar,
  karateKick,
  treePose,
  meditate,
  selfie,
  sneeze,
  yawn,
  totallyMeantThat,
  pirouette,
  plie,
  robot,
  sumoStomp,
  shadowBoxing,
  tinyDumbbell,
  rackWeights,
  laurelPolish,
  tieShoe,
  bandSnap,
  pizzaBreak,
  asleepOnTheJob,
  gaming,
  headphonesOn,
  scrolling,
  donutBreak,
  cheatDay,
  sodaBreak,
  beanbag,
  channelSurfing,
  bubbleGum,
  doodling,
]

/** The order they unlock in, after collection.ts's own: a flex, then a gag or two, the slacking spread through. */
export const MORE_UNLOCK_ORDER: readonly string[] = [
  'side-chest',
  'pizza-break',
  'air-guitar',
  'hands-on-hips',
  'juggle',
  'sneeze',
  'single-peak',
  'gaming',
  'chalk-up',
  'crowd-pleaser',
  'meant-that',
  'asleep-on-the-job',
  'abs-and-thigh',
  'karate-kick',
  'selfie',
  'gun-show',
  'headphones-on',
  'laurel-spin',
  'side-triceps',
  'jump-rope',
  'donut-break',
  'muscle-wave',
  'robot-dance',
  'tree-pose',
  'mirror-check',
  'cheat-day',
  'hula-hoop',
  'vacuum',
  'shadow-boxing',
  'scrolling',
  'bicep-ping-pong',
  'pirouette',
  'tiny-dumbbell',
  'archer-flex',
  'bubble-gum',
  'sumo-stomp',
  'lat-flare',
  'yawn',
  'soda-break',
  'quarter-turns',
  'tie-shoe',
  'rack-weights',
  'arms-crossed',
  'channel-surfing',
  'meditate',
  'flamingo-flex',
  'band-snap',
  'beanbag',
  'pose-down',
  'plie',
  'doodling',
  'crowned-bicep',
  'laurel-polish',
]

export const MORE_MOVE_LINES = [] as const satisfies readonly LineEntry[]
