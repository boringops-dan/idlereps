/**
 * Copyright 2026 Orange Specs Mobile Labs. All rights reserved: not covered by the Apache License (see NOTICE). Swolomon's
 * name, character, likeness and these moves are proprietary.
 *
 * Idle animations, set B (hooks/idles.ts): his bro side, vain and swaggering, between lines. Pure data.
 */

import { shift } from './figure'
import { ARMS_DOWN, arms, front, right, SHOULDER_L, SHOULDER_R, STAND_SIDE } from './move-kit'
import type { Expr, Facing, Figure, Fx, Limb, P } from './figure'
import type { Move } from './moves'

/** An idle: `beats` once through. */
const idle = (id: string, title: string, poses: Figure[], beats: [number, number][]): Move => ({ id, title, family: 'idle', poses, beats, reps: 1 })

/** `poses` in turn, `ms` each, `times` over. */
const loop = (poses: readonly number[], ms: number, times: number): [number, number][] => Array.from({ length: times }, () => poses.map(p => [p, ms] as [number, number])).flat()

/** The same body, his head turned (or nodded down `dy`): profile heads sit a pixel toward the way he looks. */
const looking = (f: Figure, facing: Facing, expr: Expr = 'grin', dy = 0): Figure => ({ ...f, head: { at: [facing === 'right' ? 6 : facing === 'left' ? 4 : 5, dy], facing, expr } })

/** The far arm brought over the tank, painted in front of it: a hand that crosses his chest. */
const crossing = (f: Figure): Figure => ({ ...f, ...(f.frontArm === undefined ? {} : { backArm: f.frontArm }), ...(f.backArm === undefined ? {} : { frontArm: f.backArm }) })
/** His head ducked `dy` pixels (a nod, a bow), the same way round. */
const ducked = (f: Figure, dy: number): Figure => (f.head === undefined ? f : { ...f, head: { ...f.head, at: [f.head.at[0], f.head.at[1] + dy] } })

const sparkle = (x: number, y: number): Fx => ({ kind: 'sparkle', at: [x, y] })
const star = (x: number, y: number): Fx => ({ kind: 'star', at: [x, y] })
const puff = (x: number, y: number): Fx => ({ kind: 'puff', at: [x, y] })

const L_HIP: Limb = [SHOULDER_L, [2.5, 9], [5, 10.5]]
const R_HIP: Limb = [SHOULDER_R, [13.5, 9], [11, 10.5]]
const HIPS: [Limb, Limb] = [L_HIP, R_HIP]
const R_FLEX: Limb = [SHOULDER_R, [14.5, 6.5], [14.5, 3]]
const R_BULGE: P = [13.5, 5.8]
const WIDE: [Limb, Limb] = [
  [[6, 12], [4.5, 14.5]],
  [[10, 12], [11.5, 14.5]],
]

// ---------------------------------------------------------------------------------------------------------

/** One hand sweeps back across his hair, twice, then the smirk. */
const hairFix = idle(
  'hair-fix',
  'Hair fix',
  [
    ducked(front({ arms: right([14.5, 4], [11.5, 0]), expr: 'blink' }), 1),
    ducked(front({ arms: right([13.5, 2.5], [7, 0]), expr: 'blink' }), 1),
    front({ expr: 'smirk', fx: [sparkle(12, 0)] }),
  ],
  [...loop([0, 1], 300, 2), [2, 1100]],
)

/** Tugs the tank down at one hip, then the other, so it sits just so. */
const tankTug = idle(
  'tank-tug',
  'Tank tug',
  [
    front({ arms: [[SHOULDER_L, [3, 9.5], [5.5, 11.5]], ARMS_DOWN[1]], expr: 'strain' }),
    front({ arms: [ARMS_DOWN[0], [SHOULDER_R, [13, 9.5], [10.5, 11.5]]], expr: 'strain' }),
    front({ arms: HIPS, expr: 'smirk', fx: [star(6, 8), star(9, 9)] }),
  ],
  [[0, 400], [1, 400], [0, 400], [1, 400], [2, 1200]],
)

/** Hands on hips, his pecs taking turns to jump. */
const PEC = (x: number, expr: Expr): Figure => ({ ...front({ arms: HIPS, expr, fx: [star(x, 7), star(x, 8)] }), torso: { from: [8, 6], to: [8, 10], width: 7 } })
const pecBounce = idle('pec-bounce', 'Pec bounce', [PEC(6, 'o'), PEC(9, 'o'), { ...PEC(6, 'wink'), fx: [sparkle(12, 0)] }], [...loop([0, 1], 220, 4), [2, 1000]])

/** Arm out, he leans in close to admire a vein. */
const VEIN_ARM: [Limb, Limb] = [ARMS_DOWN[0], [SHOULDER_R, [13.5, 6.5], [15.5, 5]]]
const veinCheck = idle(
  'vein-check',
  'Vein check',
  [
    looking(front({ arms: VEIN_ARM }), 'right', 'grin'),
    { ...looking(front({ arms: VEIN_ARM, bicep: [[13, 6.5]] }), 'right', 'o'), head: { at: [7, 1], facing: 'right', expr: 'o' } },
    { ...looking(front({ arms: VEIN_ARM, bicep: [[13, 6.5]], fx: [star(14, 4)] }), 'right', 'strain'), head: { at: [7, 1], facing: 'right', expr: 'strain' } },
    looking(front({ arms: VEIN_ARM, bicep: [[13, 6.5]], fx: [sparkle(12, 2)] }), 'front', 'wink'),
  ],
  [[0, 500], [1, 700], [2, 300], [1, 300], [2, 300], [3, 1000]],
)

/** Flexes, then pokes his own bicep: boing. */
const POKE_AWAY: Limb = [SHOULDER_L, [6, 10], [9.5, 8]]
const POKE_IN: Limb = [SHOULDER_L, [6.5, 9.5], [12, 6.5]]
const bicepPoke = idle(
  'bicep-poke',
  'Bicep poke',
  [
    crossing(looking(front({ arms: [POKE_AWAY, R_FLEX], bicep: [R_BULGE] }), 'right', 'grin')),
    crossing(looking(front({ arms: [POKE_IN, R_FLEX], bicep: [[13.5, 5.3]], fx: [star(15, 4)] }), 'right', 'o')),
    looking(front({ arms: [POKE_AWAY, R_FLEX], bicep: [R_BULGE], fx: [sparkle(12, 0)] }), 'front', 'smirk'),
  ],
  [[0, 500], ...loop([1, 0], 250, 3), [2, 1000]],
)

/** Phone up high in his left hand, the right arm flexed for the shot, the flash, then a look at it. */
const PHONE_HIGH: Limb = [SHOULDER_L, [1.5, 5], [1.5, 3]]
const gymSelfie = idle(
  'gym-selfie',
  'Gym selfie',
  [
    looking(front({ arms: [PHONE_HIGH, R_FLEX], bicep: [R_BULGE], props: [{ kind: 'phone', at: [1, 0] }] }), 'left', 'o'),
    looking(front({ arms: [PHONE_HIGH, R_FLEX], bicep: [R_BULGE], props: [{ kind: 'phone', at: [1, 0] }], fx: [sparkle(2, 4)] }), 'left', 'smirk'),
    looking(front({ arms: [[SHOULDER_L, [3, 10], [4.5, 8]], ARMS_DOWN[1]], props: [{ kind: 'phone', at: [3, 6] }], fx: [{ kind: 'heart', at: [0, 1] }] }), 'left', 'grin', 1),
  ],
  [[0, 700], [1, 250], [0, 300], [1, 250], [2, 1300]],
)

/** A sniff under the arm: a wince, then a nod. Still fresh. */
const ARM_UP: [Limb, Limb] = [ARMS_DOWN[0], [SHOULDER_R, [14, 3.5], [12.5, 0.5]]]
const sniffCheck = idle(
  'sniff-check',
  'Sniff check',
  [
    looking(front({ arms: ARM_UP }), 'right', 'grin'),
    { ...looking(front({ arms: ARM_UP }), 'right', 'blink'), head: { at: [7, 2], facing: 'right', expr: 'blink' } },
    { ...looking(front({ arms: ARM_UP, fx: [puff(13, 5)] }), 'right', 'o'), head: { at: [7, 2], facing: 'right', expr: 'o' } },
    front({ expr: 'grin', fx: [sparkle(12, 4), sparkle(1, 5)] }),
  ],
  [[0, 500], [1, 700], [2, 600], [3, 1200]],
)

/** Brushes the dust off one shoulder, then the other. */
const BRUSH_R1: [Limb, Limb] = [[SHOULDER_L, [7, 9.5], [11.5, 6]], ARMS_DOWN[1]]
const BRUSH_R2: [Limb, Limb] = [[SHOULDER_L, [7.5, 10], [13.5, 8.5]], ARMS_DOWN[1]]
const BRUSH_L1: [Limb, Limb] = [ARMS_DOWN[0], [SHOULDER_R, [8, 9.5], [3.5, 6]]]
const BRUSH_L2: [Limb, Limb] = [ARMS_DOWN[0], [SHOULDER_R, [7.5, 10], [1.5, 8.5]]]
const brushShoulders = idle(
  'brush-shoulders',
  'Brush shoulders',
  [
    crossing(looking(front({ arms: BRUSH_R1 }), 'right', 'smirk')),
    crossing(looking(front({ arms: BRUSH_R2, fx: [puff(13, 5)] }), 'right', 'smirk')),
    looking(front({ arms: BRUSH_L1 }), 'left', 'smirk'),
    looking(front({ arms: BRUSH_L2, fx: [puff(0, 5)] }), 'left', 'smirk'),
  ],
  [...loop([0, 1], 220, 2), ...loop([2, 3], 220, 2), [3, 500]],
)

/** Fists on the chest, left, right, left, right, then a roar. */
const FISTS_OUT = arms([2.5, 9.5], [3.5, 7])
const POUND_L: [Limb, Limb] = [[SHOULDER_L, [3, 9.5], [6.5, 7.5]], FISTS_OUT[1]]
const POUND_R: [Limb, Limb] = [FISTS_OUT[0], [SHOULDER_R, [13, 9.5], [9.5, 7.5]]]
const chestPound = idle(
  'chest-pound',
  'Chest pound',
  [
    front({ arms: FISTS_OUT, expr: 'strain' }),
    crossing(front({ arms: POUND_L, expr: 'strain', fx: [star(4, 6)] })),
    front({ arms: POUND_R, expr: 'strain', fx: [star(11, 6)] }),
    front({ arms: arms([2.5, 4], [1, 1.5]), expr: 'o', y: -1, fx: [puff(0, 7), puff(13, 7)] }),
  ],
  [[0, 300], ...loop([1, 2], 200, 3), [3, 1000]],
)

/** The guitar solo: windmill strums, then down on one knee for the big note. */
const GUITAR_NECK: Limb = [SHOULDER_L, [2, 6], [1, 4]]
const GUITAR = [
  { kind: 'band', from: [1, 4], to: [9, 10] },
  { kind: 'band', from: [7, 9.5], to: [10, 11.5] },
] as const
const KNEEL: [Limb, Limb] = [
  [[6, 12], [5, 14], [2, 14.5]],
  [[10, 12], [12, 12.5], [12, 14.5]],
]
const guitarSolo = idle(
  'guitar-solo',
  'Guitar solo',
  [
    front({ arms: [GUITAR_NECK, [SHOULDER_R, [13.5, 4], [13, 0.5]]], props: GUITAR, expr: 'o' }),
    front({ arms: [GUITAR_NECK, [SHOULDER_R, [13, 9.5], [10.5, 9.5]]], props: GUITAR, expr: 'strain', fx: [{ kind: 'note', at: [13, 1] }] }),
    { ...front({ arms: [GUITAR_NECK, [SHOULDER_R, [13, 9.5], [10.5, 9.5]]], props: GUITAR, expr: 'sleep', fx: [{ kind: 'note', at: [13, 0] }, { kind: 'note', at: [0, 0] }] }), backLeg: KNEEL[0], frontLeg: KNEEL[1] },
  ],
  [...loop([0, 1], 250, 3), [2, 1300]],
)

/** Tries a pose, weighs it up, tries another, and is happy with that one. */
const BEHIND_HEAD = arms([2, 3.5], [5.5, 2])
const poseCheck = idle(
  'pose-check',
  'Pose check',
  [
    front({ arms: HIPS, legs: WIDE, expr: 'strain' }),
    looking(front({ arms: HIPS, legs: WIDE }), 'left', 'o'),
    front({ arms: BEHIND_HEAD, expr: 'smirk' }),
    front({ arms: BEHIND_HEAD, expr: 'wink', fx: [sparkle(0, 6), sparkle(13, 6)] }),
  ],
  [[0, 800], [1, 700], [2, 800], [3, 1100]],
)

/** The crab: both arms flexed low; a look at each side, then the nod. */
const CRAB = arms([3, 10], [6.5, 10.5])
const CRAB_BULGE: P[] = [
  [3.2, 8.2],
  [11.8, 8.2],
]
const flexCheck = idle(
  'flex-check',
  'Flex check',
  [
    front({ arms: CRAB, bicep: CRAB_BULGE, expr: 'strain' }),
    looking(front({ arms: CRAB, bicep: CRAB_BULGE }), 'left', 'o', 1),
    looking(front({ arms: CRAB, bicep: CRAB_BULGE }), 'right', 'o', 1),
    front({ arms: CRAB, bicep: CRAB_BULGE, expr: 'smirk', fx: [sparkle(0, 2), sparkle(13, 2)] }),
  ],
  [[0, 700], [1, 600], [2, 600], [3, 1100]],
)

/** A slow, pleased rub of the six-pack, round and round. */
const rub = (hand: P): [Limb, Limb] => [L_HIP, [SHOULDER_R, [12.5, 10], hand]]
const absRub = idle(
  'abs-rub',
  'Abs rub',
  [front({ arms: rub([9.5, 8]), expr: 'blink' }), front({ arms: rub([6.5, 8.5]), expr: 'blink' }), front({ arms: rub([7, 10]), expr: 'grin' }), front({ arms: rub([10, 10]), expr: 'grin' })],
  [...loop([0, 1, 2, 3], 280, 3), [0, 400]],
)

/** Shoulders taking turns, up and down, to a beat only he hears. */
const shimmy = (up: 'l' | 'r', expr: Expr): Figure => {
  const l: Limb = up === 'l' ? [[4.5, 6], [3, 8.5], [3, 10.5]] : [[4.5, 7.5], [3.5, 10], [3.5, 12]]
  const r: Limb = up === 'r' ? [[11.5, 6], [13, 8.5], [13, 10.5]] : [[11.5, 7.5], [12.5, 10], [12.5, 12]]
  const f = front({ arms: [l, r], expr, fx: [{ kind: 'note', at: up === 'l' ? [0, 1] : [14, 1] }] })
  return { ...f, head: { at: [up === 'l' ? 4 : 6, 0], facing: 'front', expr } }
}
const shoulderShimmy = idle('shoulder-shimmy', 'Shoulder shimmy', [shimmy('l', 'smirk'), shimmy('r', 'smirk'), shimmy('l', 'wink')], [...loop([0, 1], 200, 5), [2, 700]])

/** A swaggering walk across, chest out, arms swinging wide. */
const STRIDE_A = (x: number): Figure =>
  shift(
    STAND_SIDE({
      expr: 'smirk',
      arms: [
        [[7, 7], [5, 9], [4.5, 11]],
        [[9, 7], [11, 9], [11.5, 11]],
      ],
      legs: [
        [[7, 12], [5.5, 14.5]],
        [[9, 12], [10.5, 14.5]],
      ],
    }),
    x,
    0,
  )
const STRIDE_B = (x: number): Figure =>
  shift(
    STAND_SIDE({
      expr: 'smirk',
      arms: [
        [[7, 7], [9, 9], [10, 11]],
        [[9, 7], [7.5, 9], [6.5, 11]],
      ],
      legs: [
        [[7, 12], [8, 14.5]],
        [[9, 12], [8, 14.5]],
      ],
    }),
    x,
    0,
  )
const strut = idle('strut', 'Strut', [STRIDE_A(-3), STRIDE_B(-2), STRIDE_A(-1), STRIDE_B(0), STRIDE_A(1), STRIDE_B(2), { ...STRIDE_A(3), head: { at: [8, 0], facing: 'right', expr: 'wink' } }], [
  [0, 260],
  [1, 260],
  [2, 260],
  [3, 260],
  [4, 260],
  [5, 260],
  [6, 900],
])

/** Leant on the wall, ankles crossed, elbow up: too cool. */
const LEAN = (expr: Expr, fx: readonly Fx[] = []): Figure => ({
  head: { at: [4, 0], facing: 'front', expr },
  torso: { from: [6.5, 6], to: [7.5, 10] },
  shorts: { from: [7.5, 10], to: [7.5, 12] },
  backArm: [[3.5, 7], [2, 4.5], [4, 2.5]],
  frontArm: [[10.5, 7], [12, 9.5], [10, 11]],
  backLeg: [[5.5, 12], [5.5, 14.5]],
  frontLeg: [[9.5, 12], [9, 13], [6.5, 14.5]],
  props: [{ kind: 'wall', x: 1 }],
  fx,
})
const leanCool = idle('lean-cool', 'Lean cool', [LEAN('smirk'), LEAN('blink'), LEAN('wink', [sparkle(12, 1)])], [[0, 1000], [1, 150], [0, 800], [2, 1100]])

/** Arms folded, tapping a foot and nodding along. */
const FOLDED: [Limb, Limb] = [
  [SHOULDER_L, [4.5, 9.5], [10.5, 8]],
  [SHOULDER_R, [11.5, 9.5], [5.5, 8]],
]
const TAP: [Limb, Limb] = [
  [[6, 12], [6, 14.5]],
  [[10, 12], [11.5, 13.5]],
]
const folded = (tap: boolean, nod: boolean, expr: Expr): Figure => {
  const f = front({ arms: FOLDED, legs: tap ? TAP : undefined, expr })
  return nod ? { ...f, head: { at: [5, 1], facing: 'front', expr } } : f
}
const armsFolded = idle('arms-folded', 'Arms folded', [folded(false, false, 'smirk'), folded(true, true, 'blink'), folded(false, false, 'grin')], [...loop([0, 1], 300, 4), [2, 900]])

/** Counting his reps on his fingers, one, two, three, and losing count. */
const COUNT_HAND: Limb = [SHOULDER_R, [14, 7], [13.5, 4]]
const POINT_AT: Limb = [SHOULDER_L, [6, 9.5], [11.5, 5.5]]
const count = (n: number, expr: Expr): Figure =>
  crossing(
    front({
      arms: [POINT_AT, COUNT_HAND],
      expr,
      fx: [star(12, 2), star(13.5, 1.5), star(15, 2)].slice(0, n),
    }),
  )
const countOnFingers = idle(
  'count-on-fingers',
  'Count on fingers',
  [count(1, 'talk'), count(2, 'talk'), count(3, 'talk'), { ...front({ arms: right([14, 4], [11, 1]), expr: 'strain', fx: [{ kind: 'sweat', at: [4, 1] }] }) }],
  [[0, 500], [1, 500], [2, 500], [0, 300], [1, 300], [3, 1100]],
)

/** "Come here": one hand out, the fingers curling him in. */
const BECKON_OUT: [Limb, Limb] = [L_HIP, [SHOULDER_R, [13.5, 8.5], [15, 8]]]
const BECKON_IN: [Limb, Limb] = [L_HIP, [SHOULDER_R, [13.5, 8.5], [13.5, 6]]]
const beckon = idle('beckon', 'Beckon', [looking(front({ arms: BECKON_OUT }), 'right', 'smirk'), looking(front({ arms: BECKON_IN }), 'right', 'smirk'), looking(front({ arms: BECKON_IN }), 'right', 'wink')], [...loop([0, 1], 300, 3), [2, 900]])

/** Quick, loud claps with a hop: let's go. */
const CLAP_OPEN = arms([2, 8], [1.5, 5.5])
const CLAP_SHUT = arms([3.5, 9.5], [7.5, 7.5])
const hypeClap = idle(
  'hype-clap',
  'Hype clap',
  [
    front({ arms: CLAP_OPEN, expr: 'talk' }),
    front({ arms: CLAP_SHUT, expr: 'o', y: -1, fx: [puff(2, 5), puff(11, 5)] }),
    front({ arms: arms([2.5, 4], [1, 1.5]), expr: 'talk', fx: [star(0, 0), star(15, 0), star(1, 9), star(14, 9)] }),
  ],
  [...loop([0, 1], 180, 5), [2, 900]],
)

/** A big breath in: the chest swells and swells, chin up, then out. */
const PUFF_ARMS = arms([2, 9], [2.5, 11.5])
const puffed = (width: number, expr: Expr, y: number, fx: readonly Fx[] = []): Figure => ({ ...front({ arms: width > 6 ? PUFF_ARMS : undefined, expr, fx }), torso: { from: [8, 6], to: [8, 10], width }, head: { at: [5, y], facing: 'front', expr } })
const chestPuff = idle('chest-puff', 'Chest puff', [puffed(6, 'blink', 0), puffed(7, 'o', 0), puffed(8, 'strain', 0, [star(4, 7), star(11, 7)]), puffed(6, 'grin', 0, [puff(2, 3)])], [
  [0, 500],
  [1, 500],
  [2, 1200],
  [3, 900],
])

/** Shoulders to his ears, the traps up and proud. */
const shrug = (up: boolean, expr: Expr, fx: readonly Fx[] = []): Figure => {
  if (!up) return front({ expr, fx })
  return {
    ...front({ expr, fx, arms: [[[4.5, 5.5], [3.5, 8.5], [3.5, 10.5]], [[11.5, 5.5], [12.5, 8.5], [12.5, 10.5]]] }),
    torso: { from: [8, 5.5], to: [8, 10], width: 7 },
    head: { at: [5, 1], facing: 'front', expr },
  }
}
const trapsShrug = idle('traps-shrug', 'Traps shrug', [shrug(false, 'grin'), shrug(true, 'strain', [star(3, 4), star(12, 4)]), shrug(true, 'wink', [sparkle(0, 1), sparkle(13, 1)])], [[0, 500], [1, 600], [0, 400], [1, 600], [2, 1000]])

/** Feet planted wide, fists on hips, chin up: the hero's stance. */
const PLANTED: [Limb, Limb] = [
  [[6, 12], [3, 14.5]],
  [[10, 12], [13, 14.5]],
]
const powerStance = idle(
  'power-stance',
  'Power stance',
  [
    front(),
    front({ arms: HIPS, legs: PLANTED, expr: 'strain', y: 1, fx: [puff(1, 13), puff(12, 13)] }),
    { ...front({ arms: HIPS, legs: PLANTED, y: 1 }), head: { at: [5, 1], facing: 'front', expr: 'smirk' } },
    { ...front({ arms: HIPS, legs: PLANTED, y: 1, fx: [sparkle(0, 0), sparkle(13, 0)] }), head: { at: [5, 1], facing: 'front', expr: 'wink' } },
  ],
  [[0, 400], [1, 600], [2, 1000], [3, 1000]],
)

/** Hi: a wave with the arm still flexed, the forearm wagging. */
const WAVE_IN: Limb = [SHOULDER_R, [14.5, 6.5], [12.5, 3]]
const flexWave = idle(
  'flex-wave',
  'Flex wave',
  [front({ arms: [L_HIP, R_FLEX], bicep: [R_BULGE], expr: 'grin' }), front({ arms: [L_HIP, WAVE_IN], bicep: [R_BULGE], expr: 'talk' }), front({ arms: [L_HIP, R_FLEX], bicep: [R_BULGE], expr: 'wink', fx: [{ kind: 'heart', at: [11, 0] }] })],
  [...loop([0, 1], 250, 4), [2, 900]],
)

/** A scoop of powder into the shaker, a hard shake, and a sip. */
const SHAKER_L: Limb = [SHOULDER_L, [3, 10], [4, 9]]
const scoopProtein = idle(
  'scoop-protein',
  'Scoop protein',
  [
    front({ arms: [SHAKER_L, [SHOULDER_R, [13, 10], [13, 12]]], expr: 'o', props: [{ kind: 'shake', at: [4, 6] }] }),
    front({ arms: [SHAKER_L, [SHOULDER_R, [12, 6], [6, 5]]], expr: 'grin', props: [{ kind: 'shake', at: [4, 6] }], fx: [puff(3, 3)] }),
    front({ arms: [ARMS_DOWN[0], [SHOULDER_R, [14, 6], [13.5, 3.5]]], expr: 'strain', props: [{ kind: 'shake', at: [13, 0] }] }),
    front({ arms: [ARMS_DOWN[0], [SHOULDER_R, [14, 8], [13.5, 6]]], expr: 'strain', props: [{ kind: 'shake', at: [13, 3] }], fx: [{ kind: 'drop', at: [15, 1] }] }),
    front({ arms: [ARMS_DOWN[0], [SHOULDER_R, [13, 7], [10, 4]]], expr: 'blink', props: [{ kind: 'shake', at: [9, 1] }], fx: [{ kind: 'heart', at: [0, 1] }] }),
  ],
  [[0, 600], [1, 700], ...loop([2, 3], 160, 4), [4, 1100]],
)

export const IDLES_B: readonly Move[] = [
  hairFix,
  tankTug,
  pecBounce,
  veinCheck,
  bicepPoke,
  gymSelfie,
  sniffCheck,
  brushShoulders,
  chestPound,
  guitarSolo,
  poseCheck,
  flexCheck,
  absRub,
  shoulderShimmy,
  strut,
  leanCool,
  armsFolded,
  countOnFingers,
  beckon,
  hypeClap,
  chestPuff,
  trapsShrug,
  powerStance,
  flexWave,
  scoopProtein,
]
