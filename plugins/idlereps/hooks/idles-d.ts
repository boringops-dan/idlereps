/**
 * Copyright 2026 Orange Specs Mobile Labs. All rights reserved: not covered by the Apache License (see NOTICE). Swolomon's
 * name, character, likeness and these moves are proprietary.
 *
 * Idle animations, set D (hooks/idles.ts): silly bits, little dances and reactions. Pure data.
 */

import { shift, turned } from './figure'
import { ARMS_DOWN, arms, front, LEGS, SHOULDER_L, SHOULDER_R, side, STAND_SIDE } from './move-kit'
import type { Expr, Facing, Figure, Fx, Limb, P, Prop } from './figure'
import type { FrontOpts } from './move-kit'
import type { Move } from './moves'

/** An idle animation: its poses, played in `beats` order, once. */
const idle = (id: string, title: string, poses: Figure[], beats: [number, number][]): Move => ({ id, title, family: 'idle', poses, beats, reps: 1 })

/** `poses` in turn, `ms` each, `times` over. */
const loop = (poses: readonly number[], ms: number, times: number): [number, number][] => Array.from({ length: times }, () => poses.map(p => [p, ms] as [number, number])).flat()

/** The same body, his head turned: profile heads sit a pixel toward the way he looks. */
const looking = (f: Figure, facing: Facing, expr: Expr = 'grin'): Figure => ({ ...f, head: { at: facing === 'right' ? [6, 0] : facing === 'left' ? [4, 0] : [5, 0], facing, expr } })

/** His head alone moved by (dx, dy), the body where it was: a droop, a jolt. */
const headAt = (f: Figure, dx: number, dy: number): Figure => (f.head === undefined ? f : { ...f, head: { ...f.head, at: [f.head.at[0] + dx, f.head.at[1] + dy] } })

/** Front-on, his upper body leaning `dx` over feet that stay planted. */
const lean = (dx: number, o: FrontOpts = {}): Figure =>
  front({
    legs: [
      [[6, 12], [6 - dx, 14.5]],
      [[10, 12], [10 - dx, 14.5]],
    ],
    ...o,
    x: dx + (o.x ?? 0),
  })

const note = (at: P): Fx => ({ kind: 'note', at })
const puff = (at: P): Fx => ({ kind: 'puff', at })
const star = (at: P): Fx => ({ kind: 'star', at })
const sparkle = (at: P): Fx => ({ kind: 'sparkle', at })

/** Knees out; with the body a pixel lower (y: 1), so the shoes stay on the floor. */
const KNEES: [Limb, Limb] = [
  [[6, 12], [4, 12.5], [5.5, 13.5]],
  [[10, 12], [12, 12.5], [10.5, 13.5]],
]
const TOGETHER: [Limb, Limb] = [
  [[7, 12], [7, 14.5]],
  [[9, 12], [9, 14.5]],
]
const WIDE: [Limb, Limb] = [
  [[6, 12], [4, 14.5]],
  [[10, 12], [12, 14.5]],
]

// ---------------------------------------------------------------------------------------------------------
// Reactions.

/** Ah... ah... CHOO, three times over, each one knocking him about. */
const WIND_UP = (expr: Expr): Figure => headAt(front({ expr, arms: [ARMS_DOWN[0], [SHOULDER_R, [12.5, 8], [10.5, 6]]] }), 0, -1)
const CHOO = (dx: number): Figure => front({ x: dx, y: 1, expr: 'strain', arms: arms([3, 9.5], [4, 11]), fx: [puff([dx < 0 ? 0 : 12, 4]), puff([dx < 0 ? 1 : 13, 7])] })
const sneezeFit = idle('sneezing-fit', 'Sneezing fit', [WIND_UP('o'), CHOO(-1), CHOO(1), WIND_UP('blink'), front({ expr: 'talk', arms: [ARMS_DOWN[0], [SHOULDER_R, [12.5, 9], [11, 7.5]]] })], [
  [0, 500],
  [1, 300],
  [3, 400],
  [2, 300],
  [0, 700],
  [3, 400],
  [1, 300],
  [4, 900],
])

/** Hic: a little jump he did not mean, a hand to his mouth, another. */
const HIC = front({ y: -1, expr: 'o', arms: arms([2.5, 8], [2.5, 6.5]), fx: [star([2, 1]), star([13, 2])] })
const HUSH = front({ expr: 'blink', arms: [ARMS_DOWN[0], [SHOULDER_R, [12.5, 8], [10.5, 5.5]]] })
const hiccup = idle('hiccup', 'Hiccups', [front({ expr: 'smirk' }), HIC, HUSH], [
  [0, 700],
  [1, 160],
  [0, 600],
  [1, 160],
  [2, 800],
  [1, 160],
  [2, 900],
])

/** Two kettlebells, one up while the other is in hand, crossing over his head. */
const KB_TOSS = (i: number, expr: Expr): Figure =>
  front({
    expr,
    arms: i === 0 ? [[SHOULDER_L, [2.5, 8], [1.5, 6]], [SHOULDER_R, [13, 9.5], [13.5, 10.5]]] : [[SHOULDER_L, [3, 9.5], [2.5, 10.5]], [SHOULDER_R, [13, 8], [14, 6]]],
    props: [
      { kind: 'kettlebell', at: i === 0 ? [12, 0] : [12, 10] },
      { kind: 'kettlebell', at: i === 0 ? [1, 9] : [1, 0] },
    ],
  })
const kettlebellJuggle = idle(
  'kettlebell-juggle',
  'Kettlebell juggle',
  [
    KB_TOSS(0, 'o'),
    KB_TOSS(1, 'grin'),
    front({
      y: 1,
      expr: 'strain',
      arms: arms([2.5, 9.5], [2, 11]),
      props: [
        { kind: 'kettlebell', at: [0, 11] },
        { kind: 'kettlebell', at: [13, 11] },
      ],
      fx: [{ kind: 'sweat', at: [12, 1] }],
    }),
  ],
  [...loop([0, 1], 260, 4), [2, 1000]],
)

/** Fall asleep standing up, head lower and lower, then a jolt awake. */
const nodOff = idle(
  'nod-off',
  'Nodding off',
  [
    front({ expr: 'blink' }),
    headAt(front({ expr: 'sleep', fx: [{ kind: 'zzz', at: [12, 0] }] }), 0, 1),
    headAt(front({ expr: 'sleep', arms: arms([4, 10], [4.5, 12]), fx: [{ kind: 'zzz', at: [13, 1] }] }), 1, 2),
    front({ y: -1, expr: 'o', arms: arms([2, 7.5], [1, 6]), fx: [puff([0, 2]), puff([13, 2])] }),
  ],
  [
    [0, 700],
    [1, 800],
    [2, 1000],
    [3, 300],
    [0, 600],
    [1, 900],
    [3, 300],
  ],
)

/** Something went bang: off the floor, arms everywhere; then hand on heart, then playing it cool. */
const startled = idle(
  'startled',
  'Startled',
  [
    front({ expr: 'blink' }),
    front({ y: -1, expr: 'o', arms: arms([2, 4], [0.5, 1.5]), legs: KNEES, fx: [star([0, 7]), star([15, 7]), puff([12, 0])] }),
    front({ expr: 'strain', arms: [[SHOULDER_L, [3, 10], [7, 8]], ARMS_DOWN[1]], fx: [{ kind: 'sweat', at: [12, 1] }] }),
    front({ expr: 'smirk', arms: [[SHOULDER_L, [2, 8.5], [5, 10.5]], [SHOULDER_R, [13, 8.5], [10, 10.5]]] }),
  ],
  [
    [0, 900],
    [1, 500],
    [2, 1000],
    [3, 1100],
  ],
)

/** Peeking in from the left edge, the right, the floor; then all of him. */
const peekaboo = idle(
  'peekaboo',
  'Peekaboo',
  [
    front({ x: -8, expr: 'grin' }),
    front({ x: 8, expr: 'wink' }),
    front({ y: 10, expr: 'o' }),
    front({ expr: 'talk', arms: arms([2, 5], [0.5, 2.5]), fx: [sparkle([0, 9]), sparkle([13, 9])] }),
  ],
  [
    [0, 600],
    [1, 600],
    [0, 400],
    [2, 700],
    [3, 1100],
  ],
)

/** The fly: buzzing round his head, him looking after it, a clap at it, and it gets away. */
const FLY_A: Fx = star([1, 2])
const FLY_B: Fx = star([14, 5])
const CLAP: [Limb, Limb] = [
  [SHOULDER_L, [8, 6], [13, 3]],
  [SHOULDER_R, [13.5, 5.5], [13.5, 3.5]],
]
const swatFly = idle(
  'swat-fly',
  'Swat the fly',
  [
    { ...looking(front(), 'left', 'o'), fx: [FLY_A] },
    { ...looking(front(), 'right', 'smirk'), fx: [FLY_B] },
    { ...looking(front({ arms: CLAP }), 'right', 'strain'), fx: [puff([13, 0])] },
    { ...looking(front({ arms: arms([3, 9], [5, 8]) }), 'left', 'o'), fx: [star([0, 1])] },
  ],
  [
    [0, 600],
    [1, 600],
    [0, 500],
    [1, 400],
    [2, 500],
    [3, 1200],
  ],
)

/** That itch: over the shoulder, then the bear's way, his back up against the wall. */
const REACH_OVER = (elbow: P, expr: Expr): Figure =>
  front({
    expr,
    arms: [
      [SHOULDER_L, elbow, [8, 8]],
      [SHOULDER_R, [13, 9], [11, 11]],
    ],
  })
const WALL: Prop = { kind: 'wall', x: 4 }
const RUB = (dy: number): Figure =>
  side({
    head: [6, -1 + dy],
    neck: [7, 5 + dy],
    hip: [7, 10 + dy],
    arms: [
      [[6, 6 + dy], [5.5, 8.5 + dy], [6, 10.5 + dy]],
      [[8, 6 + dy], [9.5, 8.5 + dy], [10, 10.5 + dy]],
    ],
    legs: [
      [[6.5, 11.5 + dy], [9, 12.5 + dy / 2], [8, 14.5]],
      [[8, 11.5 + dy], [10.5, 12.5 + dy / 2], [9.5, 14.5]],
    ],
    expr: dy === 0 ? 'blink' : 'o',
    props: [WALL],
  })
const itchBack = idle('itch-back', 'Back scratch', [REACH_OVER([2.5, 2.5], 'strain'), REACH_OVER([3.5, 3], 'strain'), RUB(0), RUB(1)], [
  ...loop([0, 1], 200, 3),
  ...loop([2, 3], 300, 4),
])

/** Walking along, a toe catches, a stagger, windmilling arms, and caught: nobody saw. */
const STEP = (i: number): Figure =>
  STAND_SIDE({
    arms: [
      [[7, 7], i === 0 ? [5.5, 9.5] : [8, 9.5], i === 0 ? [5, 11.5] : [9.5, 11]],
      [[9, 7], i === 0 ? [10.5, 9.5] : [8, 9.5], i === 0 ? [11, 11.5] : [6.5, 11]],
    ],
    legs:
      i === 0
        ? [
            [[7, 12], [5, 14.5]],
            [[9, 12], [11, 14.5]],
          ]
        : TOGETHER,
  })
const STAGGER = (i: number): Figure =>
  side({
    head: [8, 2],
    neck: [10, 7],
    hip: [8, 11],
    arms:
      i === 0
        ? [
            [[9.5, 7.5], [9, 4], [11, 2]],
            [[10.5, 7.5], [13, 9], [14.5, 11]],
          ]
        : [
            [[9.5, 7.5], [12, 9], [13.5, 11]],
            [[10.5, 7.5], [11, 4], [13, 2]],
          ],
    legs: [
      [[7.5, 11.5], [6, 13], [4, 13.5]],
      [[8.5, 11.5], [11, 13], [12, 14.5]],
    ],
    expr: 'o',
    fx: [{ kind: 'sweat', at: [6, 2] }],
  })
const tripRecover = idle(
  'trip-recover',
  'Trip and recover',
  [shift(STEP(0), -3, 0), shift(STEP(1), -2, 0), STAGGER(0), STAGGER(1), front({ expr: 'smirk', arms: [[SHOULDER_L, [2, 8.5], [5, 10.5]], [SHOULDER_R, [13, 6], [11, 3.5]]] })],
  [
    [0, 400],
    [1, 400],
    [0, 400],
    [2, 250],
    [3, 250],
    [2, 250],
    [3, 250],
    [4, 1300],
  ],
)

// ---------------------------------------------------------------------------------------------------------
// Little dances.

/** Saturday night: up to the top corner, down across to the floor, hip cocked. */
const POINT_UP = lean(1, {
  arms: [
    [SHOULDER_L, [2.5, 9], [5, 10.5]],
    [SHOULDER_R, [13.5, 4.5], [15.5, 1.5]],
  ],
  expr: 'smirk',
})
const POINT_DOWN = lean(-1, {
  arms: [
    [SHOULDER_L, [2.5, 9], [5, 10.5]],
    [SHOULDER_R, [9, 10], [3.5, 13.5]],
  ],
  expr: 'grin',
})
const discoPoint = idle(
  'disco-point',
  'Disco point',
  [POINT_UP, POINT_DOWN, { ...POINT_UP, head: { at: [6, 0], facing: 'front', expr: 'wink' }, fx: [sparkle([12, 6]), star([2, 1])] }],
  [...loop([0, 1], 380, 4), [2, 1200]],
)

/** Swaying slow side to side, snapping on the beat, eyes shut. */
const SNAP = (dx: number, isSnap: boolean): Figure =>
  lean(dx, {
    expr: isSnap ? 'blink' : 'smirk',
    arms: isSnap ? arms([2.5, 9], [2.5, 6.5]) : arms([3, 9.5], [4, 8]),
    ...(isSnap ? { fx: [note([dx < 0 ? 0 : 13, 3])] } : {}),
  })
const swayDance = idle('sway-dance', 'Slow sway', [SNAP(-1, true), SNAP(0, false), SNAP(1, true)], [...loop([0, 1, 2, 1], 450, 3), [1, 300]])

/** Arms out, round and round, faster than is wise; then the room keeps going. */
const SPIN_OUT = arms([2, 7], [0.5, 6])
const SPIN_SIDE = STAND_SIDE({
  arms: [
    [[7, 7], [7.5, 8], [9, 8]],
    [[9, 7], [12, 7], [14.5, 7]],
  ],
  expr: 'o',
})
const spinAround = idle(
  'spin-around',
  'Spin around',
  [
    front({ arms: SPIN_OUT, expr: 'grin' }),
    SPIN_SIDE,
    front({ arms: SPIN_OUT, expr: 'o' }),
    turned(SPIN_SIDE),
    lean(-1, { expr: 'blink', arms: arms([2.5, 9.5], [1.5, 11]), fx: [star([1, 0]), star([13, 1]), star([8, -0.4])] }),
    lean(1, { expr: 'strain', arms: arms([2.5, 9.5], [1.5, 11]), fx: [star([2, 1]), star([12, 0])] }),
  ],
  [...loop([0, 1, 2, 3], 130, 3), ...loop([4, 5], 350, 3)],
)

/** Heel, toe, heel, toe, arms out, then the big finish. */
const TAP_ARMS = arms([2.5, 9], [1, 8.5])
const TAP = (isLeft: boolean): Figure =>
  front({
    arms: TAP_ARMS,
    expr: isLeft ? 'grin' : 'talk',
    legs: isLeft
      ? [
          [[6, 12], [4.5, 13.5], [3, 13.5]],
          [[10, 12], [10, 14.5]],
        ]
      : [
          [[6, 12], [6, 14.5]],
          [[10, 12], [11.5, 13.5], [13, 13.5]],
        ],
    fx: [puff(isLeft ? [1, 12] : [13, 12])],
  })
const tapDance = idle(
  'tap-dance',
  'Tap dance',
  [TAP(true), TAP(false), front({ y: -1, arms: TAP_ARMS, legs: TOGETHER, expr: 'o' }), front({ arms: arms([2, 4.5], [0.5, 2]), legs: WIDE, expr: 'grin', fx: [sparkle([0, 10]), sparkle([13, 10])] })],
  [...loop([0, 1], 220, 3), [2, 250], ...loop([1, 0], 220, 2), [2, 250], [3, 1100]],
)

/** Hand raised high, down like an axe, HI-YA, through an imaginary plank. */
const CHOP_STANCE: [Limb, Limb] = [
  [[7, 12], [5.5, 14.5]],
  [[9, 12], [10.5, 14.5]],
]
const karateChop = idle(
  'karate-chop',
  'Karate chop',
  [
    STAND_SIDE({
      legs: CHOP_STANCE,
      arms: [
        [[7, 7], [8, 10], [10, 8]],
        [[9, 7], [10, 3.5], [11, 0.5]],
      ],
      expr: 'smirk',
    }),
    STAND_SIDE({
      legs: CHOP_STANCE,
      head: [5, 1],
      arms: [
        [[7, 7], [6, 9.5], [5, 8]],
        [[9, 7], [12, 8.5], [15, 9.5]],
      ],
      expr: 'strain',
      fx: [puff([12, 10]), star([14, 7]), star([15, 12])],
    }),
    STAND_SIDE({
      legs: CHOP_STANCE,
      arms: [
        [[7, 7], [8, 10], [10, 8]],
        [[9, 7], [11, 9], [12, 6.5]],
      ],
      expr: 'talk',
    }),
  ],
  [
    [0, 800],
    [1, 350],
    [2, 500],
    [0, 600],
    [1, 350],
    [2, 1000],
  ],
)

/** An orchestra only he can hear: both hands up, down, swept wide, and the crescendo. */
const conductor = idle(
  'conductor',
  'Conductor',
  [
    front({ expr: 'blink', arms: arms([2.5, 5], [3.5, 3]), fx: [note([0, 8])] }),
    front({ expr: 'blink', arms: arms([3, 9], [5, 9.5]) }),
    lean(-1, { expr: 'talk', arms: [[SHOULDER_L, [2, 7.5], [0.5, 6]], [SHOULDER_R, [12.5, 9], [10, 9.5]]], fx: [note([13, 2])] }),
    lean(1, { expr: 'talk', arms: [[SHOULDER_L, [3, 9], [6, 9.5]], [SHOULDER_R, [13, 7.5], [14.5, 6]]], fx: [note([0, 2])] }),
    front({ y: -1, expr: 'o', arms: arms([2, 3.5], [0.5, 0.5]), fx: [note([0, 8]), note([13, 8]), sparkle([12, 12])] }),
  ],
  [...loop([0, 1], 400, 2), ...loop([2, 3], 400, 2), [4, 1200]],
)

/** Mic up to his mouth, eyes shut, the other hand reaching for the high note. */
const MIC_HAND: Limb = [SHOULDER_R, [13, 9.5], [12, 7]]
const MIC: Prop = { kind: 'mic', at: [11, 4] }
const croon = idle(
  'croon',
  'Croon',
  [
    front({ expr: 'talk', arms: [ARMS_DOWN[0], MIC_HAND], props: [MIC], fx: [note([0, 2])] }),
    lean(-1, { expr: 'blink', arms: [[SHOULDER_L, [2, 6.5], [0.5, 4.5]], MIC_HAND], props: [MIC], fx: [note([13, 0])] }),
    headAt(lean(-1, { expr: 'o', arms: [[SHOULDER_L, [1.5, 5], [1, 2]], MIC_HAND], props: [MIC], fx: [note([13, 0]), note([0, 7])] }), 0, -1),
    front({ expr: 'wink', arms: [[SHOULDER_L, [2, 8.5], [5, 10.5]], MIC_HAND], props: [MIC], fx: [{ kind: 'heart', at: [0, 2] }] }),
  ],
  [
    [0, 600],
    [1, 700],
    [0, 500],
    [1, 600],
    [2, 1200],
    [3, 1000],
  ],
)

/** Chew, chew, a bubble, a bigger one, bigger: and it pops all over his face. */
const bubblegum = idle(
  'bubblegum',
  'Bubble pop',
  [
    front({ expr: 'talk', arms: arms([2, 8.5], [5, 10.5]) }),
    front({ expr: 'smirk', arms: arms([2, 8.5], [5, 10.5]) }),
    front({ expr: 'blink', arms: arms([2, 8.5], [5, 10.5]), props: [{ kind: 'bubble', at: [6.5, 3.5], big: true }] }),
    front({
      expr: 'strain',
      arms: arms([2.5, 6], [4, 3]),
      props: [
        { kind: 'bubble', at: [5, 2] },
        { kind: 'bubble', at: [8, 4] },
        { kind: 'bubble', at: [10, 1] },
      ],
      fx: [puff([1, 1]), puff([12, 1])],
    }),
  ],
  [...loop([0, 1], 250, 3), [2, 900], [3, 1100]],
)

/** Hop on one foot, land on two, along the squares, and turn round pleased with himself. */
const ONE_FOOT: [Limb, Limb] = [
  [[6, 12], [6, 14.5]],
  [[10, 12], [12, 12.5], [12.5, 11]],
]
const BALANCE = arms([2, 7.5], [0.5, 8])
const HOP = (x: number): Figure => front({ x, y: -1, legs: ONE_FOOT, arms: BALANCE, expr: 'o' })
const LAND = (x: number): Figure => front({ x, legs: WIDE, arms: BALANCE, expr: 'grin' })
const hopScotch = idle('hop-scotch', 'Hopscotch', [HOP(-3), LAND(-2), HOP(0), LAND(1), HOP(2), front({ x: 2, expr: 'wink', arms: arms([2, 4.5], [0.5, 2]), fx: [star([0, 2])] })], [
  [0, 350],
  [1, 350],
  [2, 350],
  [3, 350],
  [4, 350],
  [3, 350],
  [5, 1100],
])

/** The running man: a knee up while the other foot slides back, fists pumping, on the spot. */
const RUN_FISTS = (isUp: boolean): [Limb, Limb] => [
  [[7, 7], [6, isUp ? 8.5 : 9.5], [7.5, isUp ? 8 : 10]],
  [[9, 7], [11, isUp ? 8 : 9.5], [12, isUp ? 7.5 : 9.5]],
]
const runningMan = idle(
  'running-man',
  'Running man',
  [
    STAND_SIDE({
      arms: RUN_FISTS(true),
      legs: [
        [[7, 12], [5, 14.5]],
        [[9, 12], [11.5, 11], [11, 13]],
      ],
      expr: 'grin',
    }),
    STAND_SIDE({ arms: RUN_FISTS(false), legs: TOGETHER, expr: 'talk', fx: [note([13, 1])] }),
    STAND_SIDE({
      arms: RUN_FISTS(true),
      legs: [
        [[7, 12], [9.5, 11], [9, 13]],
        [[9, 12], [7, 14.5]],
      ],
      expr: 'grin',
    }),
  ],
  [...loop([0, 1, 2, 1], 220, 4), [1, 400]],
)

/** Beaks, wings, a wiggle down low, and a clap: the wedding classic. */
const WINGS_DOWN = arms([3, 8.5], [5, 8])
const WINGS_UP = arms([1.5, 6], [5, 8])
const chickenDance = idle(
  'chicken-dance',
  'Chicken dance',
  [
    front({ arms: WINGS_DOWN, expr: 'o' }),
    front({ arms: WINGS_UP, expr: 'talk', fx: [puff([0, 3]), puff([13, 3])] }),
    front({ y: 1, x: -1, arms: WINGS_DOWN, legs: KNEES, expr: 'grin' }),
    front({ y: 1, x: 1, arms: WINGS_DOWN, legs: KNEES, expr: 'grin' }),
    front({ arms: [[SHOULDER_L, [3, 9], [7.5, 8]], [SHOULDER_R, [12, 9], [8.5, 8]]], expr: 'wink', fx: [star([7, 5]), note([13, 1])] }),
  ],
  [...loop([0, 1], 250, 2), ...loop([2, 3], 250, 2), [4, 400], [0, 250], [1, 250], [4, 900]],
)

/** Pull the cord, it does not start, pull the cord, it does not start, pull: and away. */
const CORD = (hand: P): Prop => ({ kind: 'band', from: [12, 14], to: hand })
const lawnmower = idle(
  'lawnmower',
  'Lawnmower',
  [
    side({
      head: [7, 2],
      neck: [9, 7.5],
      hip: [7, 11],
      arms: [
        [[8.5, 8], [10, 10.5], [11, 12]],
        [[9.5, 8], [11.5, 11], [12, 13]],
      ],
      legs: [
        [[6.5, 11.5], [5.5, 14.5]],
        [[7.5, 11.5], [9.5, 12.5], [9, 14.5]],
      ],
      expr: 'smirk',
      props: [CORD([12, 13])],
    }),
    STAND_SIDE({
      arms: [
        [[7, 7], [6.5, 9.5], [7, 11.5]],
        [[9, 7], [6, 6], [3, 4.5]],
      ],
      expr: 'strain',
      props: [CORD([3, 4.5])],
    }),
    STAND_SIDE({
      arms: [
        [[7, 7], [10, 9], [13, 9]],
        [[9, 7], [12, 8], [14.5, 8.5]],
      ],
      legs: [
        [[7, 12], [5.5, 14.5]],
        [[9, 12], [10.5, 14.5]],
      ],
      expr: 'grin',
      fx: [puff([12, 12]), note([13, 1])],
    }),
  ],
  [
    [0, 500],
    [1, 350],
    [0, 400],
    [1, 350],
    [0, 400],
    [1, 350],
    [2, 450],
    [1, 300],
    [2, 450],
    [1, 300],
    [2, 900],
  ],
)

/** The supermarket sweep: push the trolley, a soda off the top shelf, into the trolley, push on. */
const shoppingCart = idle(
  'shopping-cart',
  'Shopping cart',
  [
    STAND_SIDE({
      arms: [
        [[7, 7], [9.5, 9], [12.5, 9.5]],
        [[9, 7], [11.5, 9.5], [14.5, 9.5]],
      ],
      legs: [
        [[7, 12], [5.5, 14.5]],
        [[9, 12], [10.5, 14.5]],
      ],
      expr: 'grin',
    }),
    STAND_SIDE({
      arms: [
        [[7, 7], [9.5, 9], [12.5, 9.5]],
        [[9, 7], [11.5, 9.5], [14.5, 9.5]],
      ],
      legs: TOGETHER,
      expr: 'talk',
    }),
    STAND_SIDE({
      arms: [
        [[7, 7], [6.5, 9.5], [6.5, 11.5]],
        [[9, 7], [10.5, 3.5], [12, 1]],
      ],
      legs: TOGETHER,
      expr: 'o',
      props: [{ kind: 'soda', at: [12, 0] }],
    }),
    STAND_SIDE({
      arms: [
        [[7, 7], [6.5, 9.5], [6.5, 11.5]],
        [[9, 7], [11.5, 8.5], [13, 10.5]],
      ],
      legs: TOGETHER,
      expr: 'wink',
      props: [{ kind: 'soda', at: [13, 10] }],
      fx: [sparkle([13, 5])],
    }),
  ],
  [...loop([0, 1], 300, 2), [2, 700], [3, 700], ...loop([0, 1], 300, 2), [1, 300]],
)

/** On his toes across the frame, hunched, knees high, sure no one is watching; then he is caught. */
const SNEAK = (i: number): Figure =>
  side({
    head: [6, 1],
    neck: [8, 6.5],
    hip: [7.5, 10.5],
    arms: [
      [[7.5, 7], [7, 9], [8.5, 8]],
      [[8.5, 7], [10, 9], [11, 7]],
    ],
    legs:
      i === 0
        ? [
            [[7, 11.5], [6.5, 14.5]],
            [[8.5, 11.5], [11, 11], [11, 13.5]],
          ]
        : [
            [[7, 11.5], [9.5, 11], [9.5, 13.5]],
            [[8.5, 11.5], [8, 14.5]],
          ],
    expr: 'smirk',
  })
const tiptoeSneak = idle(
  'tiptoe-sneak',
  'Tiptoe sneak',
  [shift(SNEAK(0), -5, 0), shift(SNEAK(1), -3, 0), shift(SNEAK(0), -1, 0), shift(SNEAK(1), 1, 0), shift(SNEAK(0), 3, 0), looking(shift(SNEAK(1), 3, 0), 'front', 'o')],
  [
    [0, 450],
    [1, 450],
    [2, 450],
    [3, 450],
    [4, 450],
    [5, 1200],
  ],
)

/** Fists stirring a big pot in front of him, his whole body going round with them. */
const STIR: P[] = [
  [-1.5, 0],
  [0, 1],
  [1.5, 0],
  [0, -1],
]
const cabbagePatch = idle(
  'cabbage-patch',
  'Cabbage patch',
  STIR.map(([dx, dy], i) =>
    front({
      x: Math.sign(dx),
      y: dy === 1 ? 1 : 0,
      legs: dy === 1 ? KNEES : LEGS,
      expr: i % 2 === 0 ? 'talk' : 'grin',
      arms: [
        [SHOULDER_L, [3 + dx, 9.5 + dy], [6.5 + dx, 8.5 + dy]],
        [SHOULDER_R, [12 + dx, 9.5 + dy], [9.5 + dx, 8.5 + dy]],
      ],
      ...(i === 3 ? { fx: [note([13, 1])] } : {}),
    }),
  ),
  [...loop([0, 1, 2, 3], 200, 4), [0, 300]],
)

/** Straight up and down like a pogo stick, higher every bounce. */
const POGO_ARMS = arms([3.5, 9.5], [3.5, 11.5])
const pogo = idle(
  'pogo',
  'Pogo',
  [
    front({ y: 1, legs: KNEES, arms: arms([3, 9.5], [2.5, 11]), expr: 'strain', fx: [puff([1, 13]), puff([12, 13])] }),
    front({ y: -1, legs: TOGETHER, arms: POGO_ARMS, expr: 'grin' }),
    front({ y: -1, legs: TOGETHER, arms: arms([2.5, 4], [2, 1.5]), expr: 'o', fx: [star([0, 9]), star([14, 9])] }),
  ],
  [...loop([0, 1], 200, 3), [0, 200], [2, 400], [0, 300], [1, 250]],
)

export const IDLES_D: readonly Move[] = [
  sneezeFit,
  hiccup,
  kettlebellJuggle,
  discoPoint,
  swayDance,
  spinAround,
  tapDance,
  karateChop,
  conductor,
  croon,
  bubblegum,
  nodOff,
  startled,
  peekaboo,
  hopScotch,
  runningMan,
  chickenDance,
  lawnmower,
  shoppingCart,
  tiptoeSneak,
  swatFly,
  itchBack,
  tripRecover,
  cabbagePatch,
  pogo,
]
