/**
 * Copyright 2026 Orange Specs Mobile Labs. All rights reserved: not covered by the Apache License (see NOTICE). Swolomon's
 * name, character, likeness and these moves are proprietary.
 *
 * Idle animations, set C (hooks/idles.ts): him watching the agent work, office life, and misreading all of it.
 * Pure data.
 */

import { shift } from './figure'
import { ARMS_DOWN, arms, front, LEGS, right, SHOULDER_L, SHOULDER_R, side, STAND_SIDE } from './move-kit'
import type { Expr, Facing, Figure, Fx, Limb, P, Prop } from './figure'
import type { Move } from './moves'

/** An idle: `poses`, played by `beats` once. */
const idle = (id: string, title: string, poses: Figure[], beats: [number, number][]): Move => ({ id, title, family: 'idle', poses, beats, reps: 1 })

/** `poses` in turn, `ms` each, `times` over. */
const loop = (poses: readonly number[], ms: number, times: number): [number, number][] => Array.from({ length: times }, () => poses.map(p => [p, ms] as [number, number])).flat()

/** The same body, his head turned (and `dy` lower): profile heads sit a pixel toward the way he looks. */
const looking = (f: Figure, facing: Facing, expr: Expr = 'grin', dy = 0): Figure => {
  const x = facing === 'right' ? 6 : facing === 'left' ? 4 : 5
  const [, y] = f.head?.at ?? [5, 0]
  return { ...f, head: { at: [x + (f.head?.at[0] ?? 5) - 5, y + dy], facing, expr } }
}

/** The head `dy` lower on the same body (a nod, a droop), and its worn props with it. */
const nod = (f: Figure, dy: number, expr?: Expr): Figure => {
  if (f.head === undefined) return f
  return { ...f, head: { ...f.head, at: [f.head.at[0], f.head.at[1] + dy], ...(expr === undefined ? {} : { expr }) } }
}

const CROSSED: [Limb, Limb] = [
  [SHOULDER_L, [5, 9.5], [10.5, 8.5]],
  [SHOULDER_R, [11, 9.5], [5.5, 8.5]],
]
const HIPS = arms([2, 8.5], [5, 10.5])
const DROP: Fx = { kind: 'drop', at: [11, 0] }

// ---------------------------------------------------------------------------------------------------------
// Watching the agent type: he types along, in the air, faster.

const TYPE = (l: number, r: number, expr: Expr, fx: Fx[] = []): Figure =>
  front({
    arms: [
      [SHOULDER_L, [2.5, 9.5], [3.5, l]],
      [SHOULDER_R, [13.5, 9.5], [12.5, r]],
    ],
    expr,
    fx,
  })
const airTyping = idle(
  'air-typing',
  'Air typing',
  [TYPE(7, 10, 'strain'), TYPE(10, 7, 'strain', [{ kind: 'star', at: [14, 5] }]), TYPE(8.5, 8.5, 'smirk', [{ kind: 'sparkle', at: [12, 0] }])],
  [...loop([0, 1], 160, 8), [2, 900]],
)

// Leaning in at the screen, closer and closer.
const PEER = (lean: number, expr: Expr): Figure =>
  side({
    head: [5 + lean, lean * 0.5],
    neck: [8 + lean * 0.6, 6 + lean * 0.3],
    hip: [8, 10.5],
    arms: [
      [[7 + lean * 0.5, 7], [6, 9.5], [7, 10.5]],
      [[9 + lean * 0.5, 7.2], [8, 9.5], [8.5, 10.5]],
    ],
    legs: [
      [[7, 12], [7, 14.5]],
      [[9, 12], [9, 14.5]],
    ],
    seat: [8, 12],
    expr,
  })
const peerAtScreen = idle('peer-at-screen', 'Peer at screen', [PEER(0, 'grin'), PEER(1, 'blink'), PEER(2, 'blink'), { ...PEER(3, 'o'), fx: [{ kind: 'drop', at: [7, 0] }] }], [
  [0, 600],
  [1, 600],
  [2, 700],
  [3, 900],
  [0, 500],
])

// Reading the log as it scrolls past: eyes left to right, the page climbing.
const READ = (facing: Facing, padY: number, expr: Expr = 'grin'): Figure =>
  looking(front({ arms: arms([3.5, 10.5], [6, padY + 2]), props: [{ kind: 'pad', at: [6, padY] }] }), facing, expr, 1)
const readScroll = idle('read-scroll', 'Read the scroll', [READ('left', 9), READ('right', 9), READ('left', 8), READ('right', 8, 'blink'), READ('front', 7, 'o')], [
  ...loop([0, 1], 350, 2),
  ...loop([2, 3], 300, 2),
  [4, 800],
])

// A coffee (his soda can, today a cup): cradled, blown on, sipped, savoured.
const CUP = (hand: number, cup: number, expr: Expr, fx: Fx[] = []): Figure =>
  front({
    arms: [
      [SHOULDER_L, [3.5, 10], [6.5, hand]],
      [SHOULDER_R, [12.5, 10], [9, hand]],
    ],
    expr,
    props: [{ kind: 'soda', at: [7, cup] }],
    fx,
  })
const coffeeSip = idle(
  'coffee-sip',
  'Coffee sip',
  [
    CUP(9.5, 7, 'grin', [{ kind: 'puff', at: [11, 3] }]),
    CUP(8.5, 6, 'o', [{ kind: 'puff', at: [10, 2] }]),
    CUP(6.5, 3, 'blink'),
    CUP(9.5, 7, 'smirk', [{ kind: 'heart', at: [12, 1] }]),
  ],
  [
    [0, 700],
    [1, 600],
    [2, 1100],
    [3, 900],
  ],
)

// What time is it? He checks a watch he isn't wearing, taps it, holds it to his ear.
const checkWatch = idle(
  'check-watch',
  'Check watch',
  [
    front(),
    looking(front({ arms: right([13, 9], [10, 7.5]) }), 'right', 'blink', 1),
    looking(front({ arms: [[SHOULDER_L, [5, 9.5], [9.5, 7.5]], [SHOULDER_R, [13, 9], [10, 7.5]]], fx: [{ kind: 'star', at: [9, 6] }] }), 'right', 'strain', 1),
    looking(front({ arms: right([14, 6.5], [11.5, 3]), fx: [DROP] }), 'right', 'o'),
  ],
  [
    [0, 500],
    [1, 800],
    [2, 300],
    [1, 300],
    [2, 300],
    [3, 1000],
  ],
)

// Drumming on the desk edge, waiting on a build.
const DESK: Prop = { kind: 'bar', y: 11 }
const DRUM = (hand: P, expr: Expr, fx: Fx[] = []): Figure => front({ arms: right([13.5, 9], hand, [SHOULDER_L, [3, 9], [3.5, 10.5]]), expr, props: [DESK], fx })
const fingerDrum = idle('finger-drum', 'Finger drum', [DRUM([14.5, 8], 'blink'), DRUM([14.5, 10.5], 'blink', [{ kind: 'star', at: [15, 12] }]), DRUM([14.5, 10.5], 'smirk', [{ kind: 'star', at: [13, 12] }])], [
  ...loop([0, 1, 0, 2], 180, 4),
  [0, 900],
])

// Nodding along to whatever the agent just said, arms akimbo, very much agreeing.
const NOD = front({ arms: HIPS, expr: 'talk' })
const nodAlong = idle('nod-along', 'Nod along', [NOD, nod(NOD, 1, 'blink'), nod(NOD, 1, 'grin')], [...loop([0, 1, 0, 2], 280, 3), [0, 600]])

// ---------------------------------------------------------------------------------------------------------
// Thinking about it, badly.

const SCRATCH = (hand: P, expr: Expr, fx: Fx[] = []): Figure => looking(front({ arms: right([14, 4.5], hand), fx }), 'left', expr)
const headScratch = idle('head-scratch', 'Head scratch', [front({ expr: 'o' }), SCRATCH([10.5, 0.5], 'o'), SCRATCH([11.5, 1.5], 'blink', [{ kind: 'drop', at: [3, 1] }])], [
  [0, 500],
  ...loop([1, 2], 220, 5),
  [1, 700],
])

const CHIN: [Limb, Limb] = [
  [SHOULDER_L, [5.5, 10], [11, 9.5]],
  [SHOULDER_R, [12.5, 9.5], [10.5, 5.5]],
]
const THINK = (expr: Expr, props: Prop[]): Figure => looking(front({ arms: CHIN, props }), 'right', expr)
const chinThink = idle(
  'chin-think',
  'Chin think',
  [THINK('blink', []), THINK('smirk', [{ kind: 'bubble', at: [13, 4] }]), THINK('blink', [{ kind: 'bubble', at: [12, 0], big: true }, { kind: 'bubble', at: [14, 5] }])],
  [
    [0, 700],
    [1, 800],
    [2, 1200],
    [0, 500],
  ],
)

const facepalm = idle(
  'facepalm',
  'Facepalm',
  [
    front({ expr: 'o' }),
    front({ arms: right([15, 7], [14, 3]), expr: 'strain' }),
    nod(front({ arms: right([14, 4.5], [8, 1]), expr: 'strain', fx: [{ kind: 'star', at: [3, 0] }, { kind: 'star', at: [12, 0] }] }), 2),
    nod(front({ arms: right([14, 5], [8.5, 1.5]), expr: 'sleep', fx: [{ kind: 'drop', at: [3, 3] }] }), 2),
  ],
  [
    [0, 500],
    [1, 300],
    [2, 1100],
    [3, 1000],
  ],
)

const eureka = idle(
  'eureka',
  'Eureka',
  [
    THINK('blink', []),
    front({ arms: right([13, 4], [13, 0.5]), expr: 'o', fx: [{ kind: 'star', at: [14, 0] }, { kind: 'star', at: [11, 1] }] }),
    shift(front({ arms: right([13, 4], [13, 0.5]), expr: 'grin', fx: [{ kind: 'sparkle', at: [0, 1] }] }), 0, -1),
  ],
  [
    [0, 900],
    [1, 500],
    [2, 300],
    [1, 300],
    [2, 900],
  ],
)

const PALMS = (dy: number, expr: Expr, fx: Fx[] = []): Figure => nod(front({ arms: arms([2, 9 + dy], [0.5, 7.5 + dy]), expr, fx }), 1 + dy)
const dunnoShrug = idle('dunno-shrug', 'Dunno shrug', [front({ expr: 'blink' }), PALMS(0, 'smirk'), PALMS(-1, 'o', [{ kind: 'puff', at: [12, 0] }])], [
  [0, 500],
  [1, 500],
  [2, 900],
  [1, 400],
  [0, 500],
])

const WHISPER = (dx: number, expr: Expr, fx: Fx[] = []): Figure => looking(front({ arms: right([13.5, 8], [12, 4]), x: dx, fx }), 'right', expr)
const whisperAside = idle('whisper-aside', 'Whisper aside', [front(), WHISPER(1, 'talk'), WHISPER(1, 'smirk'), WHISPER(0, 'wink', [{ kind: 'sparkle', at: [0, 1] }])], [
  [0, 500],
  ...loop([1, 2], 250, 4),
  [3, 1000],
])

// Taking notes on the agent's work, the pad held high, nodding as if it all makes sense.
const NOTES = (hand: P, facing: Facing, expr: Expr): Figure =>
  looking(
    front({
      arms: [
        [SHOULDER_L, [2, 8], [1.5, 6.5]],
        [SHOULDER_R, [8, 9.5], hand],
      ],
      props: [{ kind: 'pad', at: [0, 3] }],
    }),
    facing,
    expr,
  )
const takeNotes = idle('take-notes', 'Take notes', [NOTES([4, 6], 'front', 'o'), NOTES([4.5, 5], 'left', 'blink'), NOTES([4, 7], 'left', 'smirk')], [
  [0, 700],
  ...loop([1, 2], 200, 5),
  [0, 500],
  ...loop([1, 2], 200, 3),
])

// ---------------------------------------------------------------------------------------------------------
// Office life.

const phoneCheck = idle(
  'phone-check',
  'Phone check',
  [
    front({ arms: right([13.5, 9.5], [12.5, 11.5]), props: [{ kind: 'phone', at: [12, 10] }] }),
    looking(front({ arms: right([14, 9], [13.5, 6]), props: [{ kind: 'phone', at: [13, 3] }] }), 'right', 'blink'),
    looking(front({ arms: right([14, 9], [13.5, 6]), props: [{ kind: 'phone', at: [13, 3] }], fx: [{ kind: 'drop', at: [3, 0] }] }), 'right', 'o'),
    front({ expr: 'smirk' }),
  ],
  [
    [0, 500],
    [1, 1000],
    [2, 700],
    [3, 800],
  ],
)

const BOP = (dx: number, facing: Facing, fx: Fx): Figure => {
  const f = looking(front({ arms: arms([2.5, 9], [3.5, 11]), x: dx, fx: [fx] }), facing, 'blink')
  return { ...f, props: [{ kind: 'headphones', at: f.head?.at ?? [5, 0] }] }
}
const headphonesBop = idle('headphones-bop', 'Headphones bop', [BOP(-1, 'left', { kind: 'note', at: [12, 2] }), BOP(1, 'right', { kind: 'note', at: [1, 3] })], loop([0, 1], 330, 7))

const BACKBEND = (lean: number, expr: Expr, fx: Fx[] = []): Figure =>
  side({
    head: [5 - lean, lean * 0.4],
    neck: [8 - lean * 0.6, 6],
    hip: [8, 10.5],
    arms: [
      [[7 - lean * 0.5, 7], [5.5, 9], [7, 10.5]],
      [[9 - lean * 0.5, 7], [7, 9.5], [8, 10.5]],
    ],
    legs: [
      [[7, 12], [7, 14.5]],
      [[9, 12], [9.5, 14.5]],
    ],
    seat: [8, 12],
    expr,
    fx,
  })
const lumbarStretch = idle('lumbar-stretch', 'Lumbar stretch', [STAND_SIDE(), BACKBEND(1.5, 'strain'), BACKBEND(2.5, 'strain', [{ kind: 'star', at: [10, 9] }]), STAND_SIDE({ expr: 'blink', fx: [{ kind: 'puff', at: [12, 3] }] })], [
  [0, 400],
  [1, 500],
  [2, 1300],
  [3, 1000],
])

const RUB = (l: number, r: number, fx: Fx[] = []): Figure =>
  front({
    arms: [
      [SHOULDER_L, [2, 6], [4, l]],
      [SHOULDER_R, [14, 6], [12, r]],
    ],
    expr: 'sleep',
    fx,
  })
const eyeRub = idle('eye-rub', 'Eye rub', [RUB(1.5, 4), RUB(4, 1.5), front({ expr: 'o', fx: [{ kind: 'sparkle', at: [12, 0] }] })], [...loop([0, 1], 200, 6), [2, 1000]])

const quietYes = idle(
  'quiet-yes',
  'Quiet yes',
  [
    front({ arms: right([13.5, 8.5], [12, 6]), expr: 'smirk' }),
    front({ arms: right([14, 10], [13.5, 8.5]), expr: 'strain', fx: [{ kind: 'star', at: [15, 7] }] }),
    looking(front({ arms: right([13.5, 9.5], [12.5, 11]) }), 'left', 'blink'),
    looking(front({ arms: right([13.5, 9.5], [12.5, 11]) }), 'right', 'blink'),
    front({ arms: right([13.5, 9.5], [12.5, 11]), expr: 'wink' }),
  ],
  [
    [0, 400],
    [1, 400],
    [0, 300],
    [1, 500],
    [2, 600],
    [3, 600],
    [4, 900],
  ],
)

const TAP = (toe: number, expr: Expr, fx: Fx[] = []): Figure => front({ arms: CROSSED, legs: [LEGS[0], [[10, 12], [11, 13.5], [12, toe]]], expr, fx })
const footTap = idle('foot-tap', 'Foot tap', [TAP(14.5, 'blink'), TAP(13, 'blink'), TAP(13, 'smirk', [{ kind: 'star', at: [14, 15] }])], [...loop([0, 1, 0, 2], 220, 4), [0, 700]])

// ---------------------------------------------------------------------------------------------------------
// The agent stalls; so does he.

const SPIN: P[] = [
  [13, 0],
  [14, 1],
  [13, 2],
  [12, 1],
]
const BUFFER = (k: number, expr: Expr): Figure => front({ arms: arms([3, 8.5], [2, 6.5]), expr, fx: [{ kind: 'star', at: SPIN[k % 4] ?? [13, 0] }] })
const buffering = idle('buffering', 'Buffering', [BUFFER(0, 'o'), BUFFER(1, 'o'), BUFFER(2, 'o'), BUFFER(3, 'o'), front({ expr: 'blink' })], [...loop([0, 1, 2, 3], 200, 4), [4, 900]])

const sigh = idle(
  'sigh',
  'Sigh',
  [
    front({ arms: arms([2.5, 8.5], [2, 10.5]), expr: 'o' }),
    nod(front({ arms: arms([4, 10], [4.5, 12]), expr: 'blink', fx: [{ kind: 'puff', at: [12, 4] }] }), 1),
    nod(front({ arms: arms([4, 10], [4.5, 12]), expr: 'sleep', fx: [{ kind: 'puff', at: [13, 2] }] }), 1),
    front({ arms: ARMS_DOWN, expr: 'smirk' }),
  ],
  [
    [0, 900],
    [1, 500],
    [2, 900],
    [3, 700],
  ],
)

const SQUINT = (hand: P, pad: P, expr: Expr, fx: Fx[] = []): Figure => looking(front({ arms: right([13.5, 8], hand), props: [{ kind: 'pad', at: pad }], fx }), 'right', expr)
const squintRead = idle(
  'squint-read',
  'Squint read',
  [SQUINT([12, 9], [10, 7], 'grin'), SQUINT([15, 7], [12, 3], 'strain'), SQUINT([11, 6], [10, 2], 'strain', [{ kind: 'drop', at: [3, 0] }]), SQUINT([15, 7], [12, 3], 'blink')],
  [
    [0, 500],
    [1, 700],
    [2, 700],
    [1, 600],
    [3, 900],
  ],
)

const doubleTake = idle(
  'double-take',
  'Double take',
  [
    looking(front(), 'right', 'grin'),
    front({ expr: 'smirk' }),
    looking(front({ arms: arms([2, 8], [1.5, 6]), x: 1 }), 'right', 'o'),
    looking(front({ arms: arms([2, 8], [1.5, 6]), fx: [{ kind: 'drop', at: [4, 0] }] }), 'right', 'o'),
  ],
  [
    [0, 600],
    [1, 700],
    [2, 250],
    [3, 1100],
  ],
)

const TEMPLES = arms([1.5, 5], [4, 2.5])
const mindBlown = idle(
  'mind-blown',
  'Mind blown',
  [
    front({ arms: TEMPLES, expr: 'strain' }),
    front({ arms: TEMPLES, expr: 'o', fx: [{ kind: 'star', at: [3, 0] }, { kind: 'star', at: [12, 0] }] }),
    front({
      bare: true,
      arms: arms([2.5, 4.5], [0.5, 1.5]),
      expr: 'o',
      props: [{ kind: 'laurel', at: [10, 0] }],
      fx: [
        { kind: 'puff', at: [1, 4] },
        { kind: 'puff', at: [12, 5] },
        { kind: 'star', at: [3, 0] },
      ],
    }),
    front({ arms: arms([2.5, 9.5], [2, 11]), expr: 'blink', fx: [{ kind: 'puff', at: [12, 1] }] }),
  ],
  [
    [0, 500],
    [1, 500],
    [2, 1100],
    [3, 900],
  ],
)

export const IDLES_C: readonly Move[] = [
  airTyping,
  peerAtScreen,
  readScroll,
  coffeeSip,
  checkWatch,
  fingerDrum,
  nodAlong,
  headScratch,
  chinThink,
  facepalm,
  eureka,
  dunnoShrug,
  whisperAside,
  takeNotes,
  phoneCheck,
  headphonesBop,
  lumbarStretch,
  eyeRub,
  quietYes,
  footTap,
  buffering,
  sigh,
  squintRead,
  doubleTake,
  mindBlown,
]
