/**
 * Copyright 2026 Orange Specs Mobile Labs. All rights reserved: not covered by the Apache License (see NOTICE). Swolomon's
 * name, character, likeness and these moves are proprietary.
 *
 * More celebrations (owner, 2026-10-06: "add 50 more ... celebrations"): each a Celebration (celebrate.ts)
 * with its gestures (an offered one has `<id>-offer` and `<id>`), and its lines. Pure data.
 */

import type { Celebration } from './celebrate'
import type { LineEntry } from './copy'
import { shift, turned } from './figure'
import type { Expr, Figure, Fx, Limb, P } from './figure'
import { ARMS_DOWN, arms, front, gesture, LEGS, offer, right, SHOULDER_L, SHOULDER_R, side, STAND_SIDE } from './move-kit'
import type { Move } from './moves'

export const MORE_CELEBRATIONS: readonly Celebration[] = [
  { id: 'jump-five', kind: 'offer', label: 'Jump five', line: 'cel-jump-five', landed: 'cel-jump-five-landed', isFive: true },
  { id: 'low-ten', kind: 'offer', label: 'Low ten', line: 'cel-low-ten', landed: 'cel-low-ten-landed', isFive: true },
  { id: 'gimme-one', kind: 'offer', label: 'Gimme one', line: 'cel-gimme-one', landed: 'cel-gimme-one-landed', isFive: true },
  { id: 'slide-five', kind: 'offer', label: 'Slide five', line: 'cel-slide-five', landed: 'cel-slide-five-landed', isFive: true },
  { id: 'bear-hug', kind: 'offer', label: 'Bear hug', line: 'cel-bear-hug', landed: 'cel-bear-hug-landed' },
  { id: 'pound-hug', kind: 'offer', label: 'Pound hug', line: 'cel-pound-hug', landed: 'cel-pound-hug-landed' },
  { id: 'dap', kind: 'offer', label: 'Dap', line: 'cel-dap', landed: 'cel-dap-landed' },
  { id: 'shake-on-it', kind: 'offer', label: 'Shake on it', line: 'cel-shake-on-it', landed: 'cel-shake-on-it-landed' },
  { id: 'hip-bump', kind: 'offer', label: 'Hip bump', line: 'cel-hip-bump', landed: 'cel-hip-bump-landed' },
  { id: 'foot-bump', kind: 'offer', label: 'Foot bump', line: 'cel-foot-bump', landed: 'cel-foot-bump-landed' },
  { id: 'thumb-war', kind: 'offer', label: 'Thumb war', line: 'cel-thumb-war', landed: 'cel-thumb-war-landed' },
  { id: 'arm-wrestle', kind: 'offer', label: 'Arm wrestle', line: 'cel-arm-wrestle', landed: 'cel-arm-wrestle-landed' },
  { id: 'hands-in', kind: 'offer', label: 'Hands in', line: 'cel-hands-in', landed: 'cel-hands-in-landed' },
  { id: 'boop', kind: 'offer', label: 'Boop', line: 'cel-boop', landed: 'cel-boop-landed' },
  { id: 'cheers', kind: 'offer', label: 'Cheers', line: 'cel-cheers', landed: 'cel-cheers-landed' },
  { id: 'lend-laurel', kind: 'offer', label: 'Hold laurel', line: 'cel-lend-laurel', landed: 'cel-lend-laurel-landed' },
  { id: 'rock-paper-scissors', kind: 'offer', label: 'Shoot', line: 'cel-rock-paper-scissors', landed: 'cel-rock-paper-scissors-landed' },
  { id: 'dab', kind: 'show', line: 'cel-dab' },
  { id: 'floss', kind: 'show', line: 'cel-floss' },
  { id: 'the-worm', kind: 'show', line: 'cel-the-worm' },
  { id: 'cartwheel', kind: 'show', line: 'cel-cartwheel' },
  { id: 'backflip', kind: 'show', line: 'cel-backflip' },
  { id: 'jazz-hands', kind: 'show', line: 'cel-jazz-hands' },
  { id: 'laurel-tip', kind: 'show', line: 'cel-laurel-tip' },
  { id: 'finger-guns', kind: 'show', line: 'cel-finger-guns' },
  { id: 'the-robot', kind: 'show', line: 'cel-the-robot' },
  { id: 'sprinkler', kind: 'show', line: 'cel-sprinkler' },
  { id: 'spin-toe-stand', kind: 'show', line: 'cel-spin-toe-stand' },
  { id: 'protein-pop', kind: 'show', line: 'cel-protein-pop' },
  { id: 'medal-bite', kind: 'show', line: 'cel-medal-bite' },
  { id: 'royal-wave', kind: 'show', line: 'cel-royal-wave' },
  { id: 'crowd-surf', kind: 'show', line: 'cel-crowd-surf' },
  { id: 'airplane-arms', kind: 'show', line: 'cel-airplane-arms' },
  { id: 'fist-pump', kind: 'show', line: 'cel-fist-pump' },
  { id: 'double-fist-pump', kind: 'show', line: 'cel-double-fist-pump' },
  { id: 'heel-click', kind: 'show', line: 'cel-heel-click' },
  { id: 'curtsy', kind: 'show', line: 'cel-curtsy' },
  { id: 'standing-ovation', kind: 'show', line: 'cel-standing-ovation' },
  { id: 'fanfare', kind: 'show', line: 'cel-fanfare' },
  { id: 'drum-roll', kind: 'show', line: 'cel-drum-roll' },
  { id: 'sparkler', kind: 'show', line: 'cel-sparkler' },
  { id: 'butterfly', kind: 'show', line: 'cel-butterfly' },
  { id: 'big-wave', kind: 'show', line: 'cel-big-wave' },
  { id: 'peace-sign', kind: 'show', line: 'cel-peace-sign' },
  { id: 'heart-hands', kind: 'show', line: 'cel-heart-hands' },
  { id: 'blow-kiss', kind: 'show', line: 'cel-blow-kiss' },
  { id: 'rock-on', kind: 'show', line: 'cel-rock-on' },
  { id: 'shaka', kind: 'show', line: 'cel-shaka' },
  { id: 'lasso', kind: 'show', line: 'cel-lasso' },
  { id: 'title-belt', kind: 'show', line: 'cel-title-belt' },
  { id: 'mirror-flex', kind: 'show', line: 'cel-mirror-flex' },
  { id: 'ribbon-twirl', kind: 'show', line: 'cel-ribbon-twirl' },
  { id: 'tiny-parade', kind: 'show', line: 'cel-tiny-parade' },
]

// ---------------------------------------------------------------------------------------------------------
// The drawing kit for these: an arm on either side, his two arms as a pair, and his whole body upside down
// or lying flat.

const leftArm = (elbow: P, hand: P): Limb => [SHOULDER_L, elbow, hand]
const rightArm = (elbow: P, hand: P): Limb => [SHOULDER_R, elbow, hand]
const star = (x: number, y: number): Fx => ({ kind: 'star', at: [x, y] })
const fx = (kind: Fx['kind'], x: number, y: number): Fx => ({ kind, at: [x, y] })

/** Knees bent, ready to spring. */
const CROUCH: [Limb, Limb] = [
  [[6, 12], [4.5, 13], [6, 14.5]],
  [[10, 12], [11.5, 13], [10, 14.5]],
]
/** Mid-air, legs apart. */
const SPLAYED: [Limb, Limb] = [
  [[6, 12], [4.5, 14.5]],
  [[10, 12], [11.5, 14.5]],
]

/** On his hands, feet in the air: the middle of a cartwheel or a flip. */
const upsideDown = (dx: number, dy: number, expr: Expr = 'o'): Figure =>
  shift(
    {
      head: { at: [5, 10], facing: 'front', expr },
      torso: { from: [8, 9], to: [8, 5] },
      shorts: { from: [8, 5], to: [8, 3] },
      backArm: [[4.5, 9], [3, 12], [2.5, 14.5]],
      frontArm: [[11.5, 9], [13, 12], [13.5, 14.5]],
      backLeg: [[6, 3], [3.5, 0.5]],
      frontLeg: [[10, 3], [12.5, 0.5]],
    },
    dx,
    dy,
  )

/** Lying flat, head to the right: the worm on the floor, the crowd surf up high. */
const lying = (o: { dy?: number; chest?: number; hips?: number; expr?: Expr; fx?: readonly Fx[] }): Figure => {
  const chest = o.chest ?? 0
  const hips = o.hips ?? 0
  return shift(
    side({
      head: [10, 9 - chest],
      neck: [10.5, 13.5 - chest],
      hip: [5.5, 13.5 - hips],
      arms: [
        [[10, 13.5 - chest], [11.5, 14.5], [13.5, 14.5]],
        [[11, 13.5 - chest], [12.5, 14.5], [14.5, 14.5]],
      ],
      legs: [
        [[5.5, 13.5 - hips], [3, 14], [0.5, 14.5]],
        [[5.5, 14 - hips], [3, 14.5], [0.5, 14.5]],
      ],
      seat: [4, 13.8 - hips],
      ...(o.expr === undefined ? {} : { expr: o.expr }),
      ...(o.fx === undefined ? {} : { fx: o.fx }),
    }),
    0,
    o.dy ?? 0,
  )
}

// ---------------------------------------------------------------------------------------------------------
// The offered ones: what he holds out, then the contact.

const JUMP_UP = right([13.5, 4.5], [14, 1.5])
const LOW_TEN = arms([2.5, 10], [0.5, 12])
const ONE = right([13.5, 6], [14.5, 3.5])
const SLIDE = right([13.5, 9], [15, 8.5])
const WIDE = arms([2, 6.5], [0.5, 5])
const POUND = right([13.5, 9.5], [14.5, 7.5])
const DAP = right([14, 6], [14, 3])
const SHAKE_HAND = right([13.5, 9.5], [15, 9])
const AKIMBO = arms([2, 8.5], [4.5, 10])
const HIP_OUT: [Limb, Limb] = [
  [[6, 12], [5, 14.5]],
  [[10, 12], [9.5, 14.5]],
]
const FOOT_OUT: [Limb, Limb] = [LEGS[0], [[10, 12], [12.5, 13.5], [14, 14]]]
const THUMB = right([13.5, 9.5], [14, 7.5])
const WRESTLE = right([14, 10.5], [14, 6.5])
const HAND_IN = right([14, 10], [15.5, 12])
const BOOP = right([13, 7.5], [12.5, 5.5])
const CHEERS = right([13.5, 8.5], [14.5, 6])
const LAUREL_OUT = right([14, 5], [14, 1.5])
const FIST_HIGH = right([13.5, 8], [13.5, 6])

const jumpFive = gesture('jump-five', 'Jump five', [front({ arms: JUMP_UP, legs: CROUCH, y: 1, expr: 'grin' }), front({ arms: right([13.5, 3.5], [14, 0.5]), legs: SPLAYED, y: -1, expr: 'talk', fx: [star(15, 0), star(11, 0), fx('puff', 6, 14)] }), front({ arms: JUMP_UP, expr: 'wink' })], [300, 450, 800])
const lowTen = gesture('low-ten', 'Low ten', [front({ arms: LOW_TEN, y: 1, expr: 'grin' }), front({ arms: LOW_TEN, y: 1, expr: 'talk', fx: [star(0, 14), star(15, 14), fx('puff', 1, 12), fx('puff', 12, 12)] }), front({ arms: LOW_TEN, expr: 'wink' })], [350, 400, 800])
const gimmeOne = gesture('gimme-one', 'Gimme one', [front({ arms: ONE, expr: 'o' }), front({ arms: ONE, expr: 'blink', fx: [fx('sparkle', 13, 1)] }), front({ arms: ONE, expr: 'grin', fx: [fx('heart', 12, 0)] })], [450, 500, 900])
const slideFive = gesture('slide-five', 'Slide five', [front({ arms: SLIDE, expr: 'grin' }), front({ arms: right([13.5, 8], [15.5, 6.5]), x: 1, expr: 'talk', fx: [fx('puff', 13, 9)] }), front({ arms: right([13.5, 6], [15, 3]), expr: 'smirk', fx: [star(14, 1), star(12, 3)] })], [300, 350, 900])
const bearHug = gesture('bear-hug', 'Bear hug', [front({ arms: WIDE, expr: 'grin' }), front({ arms: [leftArm([6, 10], [10.5, 8.5]), rightArm([10, 10], [5.5, 8.5])], x: -1, expr: 'blink', fx: [fx('heart', 12, 0)] }), front({ arms: [leftArm([6, 10], [10.5, 8.5]), rightArm([10, 10], [5.5, 8.5])], x: 1, expr: 'strain', fx: [fx('heart', 0, 1)] })], [400, 600, 700])
const poundHug = gesture('pound-hug', 'Pound hug', [front({ arms: POUND, expr: 'grin' }), front({ arms: [leftArm([4, 4.5], [8, 3]), rightArm([12, 9.5], [9.5, 8.5])], expr: 'blink', fx: [star(9, 1)] }), front({ arms: [leftArm([4, 5], [8.5, 4]), rightArm([12, 9.5], [9.5, 8.5])], expr: 'blink', fx: [star(10, 2)] }), front({ arms: POUND, expr: 'wink', fx: [fx('heart', 12, 0)] })], [300, 300, 300, 900])
const dap = gesture('dap', 'Dap', [front({ arms: DAP, expr: 'grin', fx: [fx('puff', 13, 0)] }), front({ arms: right([13.5, 8.5], [12, 7]), expr: 'talk' }), front({ arms: right([13.5, 8.5], [12, 7]), expr: 'smirk', fx: [star(13, 5), star(11, 5)] }), front({ arms: right([14, 6.5], [15.5, 7.5]), expr: 'wink' })], [300, 250, 300, 900])
const shakeOnIt = gesture('shake-on-it', 'Shake on it', [front({ arms: right([13.5, 8.5], [15, 7.5]), expr: 'talk' }), front({ arms: right([13.5, 10], [15, 10.5]), expr: 'grin' }), front({ arms: right([13.5, 8.5], [15, 7.5]), expr: 'talk' }), front({ arms: right([13.5, 10], [15, 10.5]), expr: 'grin' }), front({ arms: SHAKE_HAND, expr: 'wink', fx: [fx('sparkle', 13, 1)] })], [200, 200, 200, 200, 900])
const hipBump = gesture('hip-bump', 'Hip bump', [front({ arms: AKIMBO, legs: HIP_OUT, expr: 'smirk' }), front({ arms: AKIMBO, legs: HIP_OUT, x: 2, expr: 'o', fx: [star(15, 9), star(15, 12)] }), front({ arms: AKIMBO, expr: 'wink' })], [350, 450, 900])
const footBump = gesture('foot-bump', 'Foot bump', [front({ legs: FOOT_OUT, arms: arms([2.5, 9], [1.5, 7]), expr: 'grin' }), front({ legs: [LEGS[0], [[10, 12], [13, 13.5], [15, 13.5]]], arms: arms([2.5, 9], [1.5, 7]), expr: 'talk', fx: [star(15, 11), fx('puff', 13, 11)] }), front({ expr: 'wink' })], [350, 450, 900])
const thumbWar = gesture('thumb-war', 'Thumb war', [front({ arms: THUMB, expr: 'strain' }), front({ arms: right([13.5, 9.5], [14.5, 8]), expr: 'strain', fx: [fx('sweat', 4, 2)] }), front({ arms: THUMB, expr: 'o' }), front({ arms: right([13.5, 9.5], [14, 8.5]), expr: 'grin', fx: [star(14, 5), fx('sparkle', 0, 1)] })], [300, 300, 400, 900])
const armWrestle = gesture('arm-wrestle', 'Arm wrestle', [front({ arms: WRESTLE, expr: 'strain' }), front({ arms: right([14, 10.5], [13, 7]), expr: 'strain', fx: [fx('sweat', 3, 2)] }), front({ arms: right([14, 10.5], [15.5, 8.5]), expr: 'o', fx: [fx('puff', 13, 6)] }), front({ arms: right([14, 10.5], [15.5, 9]), expr: 'wink', fx: [star(0, 2)] })], [350, 350, 400, 900])
const handsIn = gesture('hands-in', 'Hands in', [front({ arms: HAND_IN, expr: 'grin', y: 1 }), front({ arms: arms([2, 4], [1.5, 1]), y: -1, expr: 'talk', fx: [fx('confetti', 0, 9), fx('confetti', 11, 9), star(8, 0)] }), front({ arms: arms([2, 4], [1.5, 1]), expr: 'grin', fx: [fx('confetti', 0, 11), fx('confetti', 11, 11)] })], [350, 500, 800])
const boop = gesture('boop', 'Boop', [front({ arms: BOOP, expr: 'smirk' }), front({ arms: right([13, 7], [11.5, 4.5]), expr: 'o', fx: [fx('sparkle', 10, 1)] }), front({ arms: BOOP, expr: 'blink', fx: [fx('heart', 12, 0)] })], [400, 450, 900])
const cheers = gesture('cheers', 'Cheers', [front({ arms: CHEERS, expr: 'grin', props: [{ kind: 'shake', at: [14, 2] }] }), front({ arms: right([13, 7], [12.5, 4]), expr: 'talk', props: [{ kind: 'shake', at: [12, 0] }], fx: [fx('sparkle', 13, 0)] }), { ...front({ arms: right([12.5, 6], [10, 4]), props: [{ kind: 'shake', at: [10, 1] }] }), head: { at: [5, 1], facing: 'front', expr: 'blink' } }, front({ arms: CHEERS, expr: 'wink', props: [{ kind: 'shake', at: [14, 2] }] })], [300, 400, 600, 700])
const lendLaurel = gesture('lend-laurel', 'Laurel, lent', [front({ arms: LAUREL_OUT, bare: true, expr: 'grin', props: [{ kind: 'laurel', at: [10, 0] }] }), front({ arms: right([14, 6], [15.5, 4]), bare: true, expr: 'o', props: [{ kind: 'laurel', at: [12, 2] }], fx: [fx('sparkle', 13, 4)] }), front({ arms: arms([2.5, 9], [3, 6.5]), bare: true, expr: 'wink', fx: [star(14, 0), star(14, 4)] })], [350, 450, 1000])
const SCISSORS = right([13.5, 8], [15.5, 7])
const rockPaperScissors = gesture('rock-paper-scissors', 'Rock, paper, scissors', [front({ arms: FIST_HIGH, expr: 'strain' }), front({ arms: right([13.5, 9], [13.5, 9.5]), expr: 'strain' }), front({ arms: FIST_HIGH, expr: 'strain' }), front({ arms: SCISSORS, expr: 'o', fx: [star(15, 5)] }), front({ arms: SCISSORS, expr: 'talk' })], [200, 200, 200, 500, 800])

const OFFERS: readonly Move[] = [
  offer('jump-five', 'Jump five', JUMP_UP, 'grin', { legs: CROUCH, y: 1 }),
  offer('low-ten', 'Low ten', LOW_TEN, 'grin', { y: 1 }),
  offer('gimme-one', 'Gimme one', ONE, 'o'),
  offer('slide-five', 'Slide five', SLIDE),
  offer('bear-hug', 'Bear hug', WIDE),
  offer('pound-hug', 'Pound hug', POUND),
  offer('dap', 'Dap', DAP, 'smirk'),
  offer('shake-on-it', 'Shake on it', SHAKE_HAND),
  offer('hip-bump', 'Hip bump', AKIMBO, 'smirk', { legs: HIP_OUT }),
  offer('foot-bump', 'Foot bump', arms([2.5, 9], [1.5, 7]), 'grin', { legs: FOOT_OUT }),
  offer('thumb-war', 'Thumb war', THUMB, 'smirk'),
  offer('arm-wrestle', 'Arm wrestle', WRESTLE, 'smirk'),
  offer('hands-in', 'Hands in', HAND_IN),
  offer('boop', 'Boop', BOOP, 'smirk'),
  offer('cheers', 'Cheers', CHEERS, 'grin', { props: [{ kind: 'shake', at: [14, 2] }] }),
  offer('lend-laurel', 'Laurel, lent', LAUREL_OUT, 'grin', { bare: true, props: [{ kind: 'laurel', at: [10, 0] }] }),
  offer('rock-paper-scissors', 'Rock, paper, scissors', FIST_HIGH, 'smirk'),
]

// ---------------------------------------------------------------------------------------------------------
// The shown ones: he just does it.

const DAB: [Limb, Limb] = [leftArm([2.5, 4.5], [0.5, 2]), rightArm([9.5, 3.5], [13.5, 2])]
const dab = gesture('dab', 'Dab', [front({ expr: 'grin' }), front({ arms: DAB, x: -1, y: 1, expr: 'blink', fx: [star(0, 0)] }), turned(front({ arms: DAB, x: -1, y: 1, expr: 'blink', fx: [star(0, 0)] }))], [300, 700, 700])

const FLOSS_R: [Limb, Limb] = [leftArm([6.5, 10], [9.5, 11.5]), rightArm([13, 10], [15, 11.5])]
const floss = gesture('floss', 'Floss', [front({ arms: FLOSS_R, x: -1, expr: 'talk' }), turned(front({ arms: FLOSS_R, x: -1, expr: 'grin' }))], [250, 250], 5)

const theWorm = gesture('the-worm', 'The worm', [lying({ chest: 3, expr: 'talk' }), lying({ hips: 3, expr: 'grin' }), lying({ chest: 1, expr: 'grin' }), lying({ chest: 3, expr: 'wink', fx: [fx('sparkle', 13, 0)] })], [350, 350, 350, 700])

const STAND_TEN = (x: number, expr: Expr): Figure => front({ arms: arms([2.5, 4.5], [2.5, 1.5]), legs: SPLAYED, x, expr })
const cartwheel = gesture('cartwheel', 'Cartwheel', [STAND_TEN(-3, 'grin'), upsideDown(0, 1), STAND_TEN(3, 'talk'), front({ expr: 'wink', fx: [fx('sparkle', 0, 1)] })], [300, 300, 300, 800])

const TUCK = front({ y: -1, arms: arms([3, 9], [5, 11]), legs: [[[6, 12], [5, 10.5], [6, 13]], [[10, 12], [11, 10.5], [10, 13]]], expr: 'strain' })
const backflip = gesture('backflip', 'Backflip', [front({ y: 2, arms: arms([3, 10], [4, 12]), legs: CROUCH, expr: 'grin' }), TUCK, upsideDown(0, -2), front({ arms: arms([2, 4], [1.5, 1]), expr: 'talk', fx: [fx('puff', 3, 14), fx('puff', 10, 14), star(0, 4), star(15, 4)] })], [300, 250, 300, 900])

const JAZZ = arms([2, 8.5], [0.5, 5])
const jazzHands = gesture('jazz-hands', 'Jazz hands', [front({ arms: JAZZ, expr: 'talk', fx: [star(0, 3), star(15, 4)] }), front({ arms: arms([2, 8.5], [1, 5.5]), x: 0, expr: 'grin', fx: [star(1, 4), star(14, 3)] })], [180, 180], 6)

const laurelTip = gesture('laurel-tip', 'Laurel tip', [front({ y: 1, arms: right([12.5, 4.5], [10, 1.5]), expr: 'smirk' }), front({ y: 1, arms: right([13, 3.5], [10.5, 0]), bare: true, expr: 'blink', props: [{ kind: 'laurel', at: [5, 0] }] }), front({ y: 1, arms: right([12.5, 4.5], [10, 1.5]), expr: 'wink', fx: [fx('sparkle', 0, 2)] })], [400, 800, 800])

const GUNS = arms([2.5, 8.5], [0.5, 8])
const fingerGuns = gesture('finger-guns', 'Finger guns', [front({ arms: GUNS, expr: 'smirk' }), front({ arms: arms([2.5, 8.5], [0.5, 6.5]), expr: 'wink', fx: [fx('puff', 0, 4), fx('puff', 13, 4)] }), front({ arms: GUNS, expr: 'smirk' }), front({ arms: arms([2.5, 8.5], [0.5, 6.5]), expr: 'talk', fx: [fx('puff', 0, 4), fx('puff', 13, 4)] })], [300, 400, 300, 800])

const ROBOT_A: [Limb, Limb] = [leftArm([1.5, 7], [1.5, 4]), rightArm([14.5, 7], [14.5, 10])]
const theRobot = gesture('the-robot', 'The robot', [front({ arms: ROBOT_A, expr: 'o' }), front({ arms: ROBOT_A, x: 1, expr: 'o' }), turned(front({ arms: ROBOT_A, expr: 'blink' })), turned(front({ arms: ROBOT_A, x: 1, expr: 'o' }))], [300, 300, 300, 300], 2)

const SPRINKLE_HEAD = leftArm([2.5, 4], [5, 2])
const sprinkler = gesture('sprinkler', 'Sprinkler', [front({ arms: [SPRINKLE_HEAD, rightArm([13.5, 6], [15.5, 4.5])], expr: 'smirk', fx: [fx('drop', 15, 2)] }), front({ arms: [SPRINKLE_HEAD, rightArm([13.5, 7], [15.5, 7])], expr: 'smirk', fx: [fx('drop', 15, 5)] }), front({ arms: [SPRINKLE_HEAD, rightArm([13.5, 8], [15.5, 9.5])], expr: 'smirk', fx: [fx('drop', 15, 11)] }), front({ arms: [SPRINKLE_HEAD, rightArm([13.5, 7], [15.5, 7])], expr: 'talk', fx: [fx('drop', 15, 2), fx('drop', 15, 5), fx('drop', 15, 11)] })], [250, 250, 250, 500], 2)

const spinToeStand = gesture('spin-toe-stand', 'Spin and toe stand', [STAND_SIDE({ expr: 'smirk' }), front({ expr: 'blink' }), turned(STAND_SIDE({ expr: 'smirk' })), front({ y: -1, arms: right([12.5, 4.5], [10, 1.5]), legs: [[[7, 12], [7.5, 14.5]], [[9, 12], [8.5, 14.5]]], expr: 'o', fx: [fx('sparkle', 13, 0), star(1, 12)] })], [200, 200, 200, 1200])

const BOTTLE = (dx: number): [Limb, Limb] => right([13.5, 6], [13.5 + dx, 3.5])
const bottle = (dx: number) => [{ kind: 'shake' as const, at: [13 + dx, 0] as P }]
const proteinPop = gesture('protein-pop', 'Protein pop', [front({ arms: BOTTLE(-1), expr: 'grin', props: bottle(-1) }), front({ arms: BOTTLE(1), expr: 'grin', props: bottle(1) }), front({ arms: BOTTLE(0), expr: 'o', props: bottle(0), fx: [fx('puff', 9, 0)] }), front({ arms: BOTTLE(0), expr: 'talk', props: bottle(0), fx: [fx('confetti', 0, 0), fx('confetti', 9, 3), fx('drop', 11, 1), fx('drop', 15, 5)] })], [200, 200, 400, 900])

const MEDAL = [{ kind: 'band', from: [6, 6.5], to: [7.5, 9.5] }, { kind: 'band', from: [10, 6.5], to: [8.5, 9.5] }] as const
const medalBite = gesture('medal-bite', 'Medal bite', [front({ expr: 'grin', props: MEDAL, fx: [fx('sparkle', 7, 9)] }), front({ arms: right([12.5, 7.5], [9.5, 5]), expr: 'blink', props: [{ kind: 'band', from: [6, 6.5], to: [8, 5] }, { kind: 'band', from: [10, 6.5], to: [8, 5] }], fx: [star(8, 4), fx('sparkle', 12, 0)] }), front({ expr: 'wink', props: MEDAL, fx: [fx('sparkle', 7, 9), star(1, 2)] })], [500, 900, 800])

const royalWave = gesture('royal-wave', 'Royal wave', [front({ arms: right([13.5, 8], [13, 5]), expr: 'smirk' }), front({ arms: right([13.5, 8], [14.5, 5.5]), expr: 'blink', fx: [fx('sparkle', 0, 1)] })], [350, 350], 3)

/** The crowd's hands, under him, taking turns. */
const CROWD = (isUp: boolean): Fx[] => [0, 5, 10].map(x => fx(isUp ? 'puff' : 'star', x + (isUp ? 0 : 1), isUp ? 12 : 13))
const crowdSurf = gesture('crowd-surf', 'Crowd surf', [-2, 0, 2].map((dx, i) => ({ ...shift(lying({ dy: -4, expr: i === 1 ? 'talk' : 'grin' }), dx, 0), fx: CROWD(i !== 1) })), [450, 450, 700])

const PLANE: [Limb, Limb] = [leftArm([2, 6], [0, 5]), rightArm([13.5, 8], [15.5, 9.5])]
const airplaneArms = gesture('airplane-arms', 'Airplane arms', [front({ arms: PLANE, x: -1, expr: 'talk', fx: [fx('puff', 13, 1)] }), turned(front({ arms: PLANE, x: -1, expr: 'grin', fx: [fx('puff', 13, 1)] }))], [450, 450], 3)

const fistPump = gesture('fist-pump', 'Fist pump', [front({ arms: right([13.5, 4.5], [13, 1.5]), expr: 'talk' }), front({ arms: right([13.5, 9.5], [12, 7]), y: 1, expr: 'strain' })], [250, 250], 4)

const doubleFistPump = gesture('double-fist-pump', 'Double fist pump', [front({ arms: arms([2, 4], [2.5, 1]), y: -1, legs: SPLAYED, expr: 'talk', fx: [star(0, 0), star(15, 0)] }), front({ arms: arms([2.5, 9.5], [4, 7]), y: 1, legs: CROUCH, expr: 'strain' })], [250, 250], 4)

const heelClick = gesture('heel-click', 'Heel click', [front({ y: 1, legs: CROUCH, expr: 'grin' }), front({ x: 1, y: -2, arms: right([13.5, 4.5], [14, 1.5]), legs: [[[6, 12], [8.5, 14.5]], [[10, 12], [9.5, 14.5]]], expr: 'talk', fx: [fx('sparkle', 11, 12), star(15, 3)] }), front({ expr: 'wink' })], [300, 600, 800])

const curtsy = gesture('curtsy', 'Curtsy', [front({ arms: arms([3.5, 10], [3, 11.5]), expr: 'grin' }), front({ y: 1.5, arms: arms([3, 10.5], [1.5, 12]), legs: [[[6, 12], [9, 13], [10, 14.5]], [[10, 12], [11, 13], [11, 14.5]]], expr: 'blink', fx: [fx('sparkle', 0, 0)] }), front({ arms: arms([3.5, 10], [3, 11.5]), expr: 'wink' })], [400, 900, 700])

const CLAP_HIGH_IN = arms([3.5, 4], [7, 1.5])
const CLAP_HIGH_OUT = arms([3, 4], [4.5, 1])
const SEATED: [Limb, Limb] = [
  [[6, 12], [3.5, 12.5], [4, 14.5]],
  [[10, 12], [12.5, 12.5], [12, 14.5]],
]
const standingOvation = gesture('standing-ovation', 'Standing ovation', [front({ y: 2, legs: SEATED, arms: arms([3, 9.5], [5.5, 9]), expr: 'o' }), front({ y: 2, arms: CLAP_HIGH_OUT, expr: 'talk' }), front({ y: 2, arms: CLAP_HIGH_IN, expr: 'grin', fx: [star(1, 1), star(14, 1)] }), front({ y: 2, arms: CLAP_HIGH_OUT, expr: 'talk' }), front({ y: 2, arms: CLAP_HIGH_IN, expr: 'grin', fx: [star(0, 3), star(15, 2), fx('confetti', 11, 10)] })], [500, 250, 250, 250, 900])

const HORN: [Limb, Limb] = [leftArm([5, 8.5], [8, 5]), rightArm([11, 8.5], [9, 5])]
const fanfare = gesture('fanfare', 'Fanfare', [front({ arms: HORN, expr: 'o', props: [{ kind: 'band', from: [9, 4.5], to: [14, 2] }] }), front({ arms: HORN, expr: 'o', props: [{ kind: 'band', from: [9, 4.5], to: [14, 2] }], fx: [fx('note', 13, 4)] }), front({ arms: HORN, expr: 'o', props: [{ kind: 'band', from: [9, 4.5], to: [14, 2] }], fx: [fx('note', 13, 5), fx('note', 0, 0)] }), front({ arms: arms([2, 4], [1.5, 1]), expr: 'talk', fx: [fx('note', 0, 6), fx('sparkle', 13, 4)] })], [350, 350, 400, 800])

const DRUM = [{ kind: 'kettlebell', at: [6.5, 10] }] as const
const drumRoll = gesture('drum-roll', 'Drum roll', [front({ arms: [leftArm([3.5, 9.5], [6, 8.5]), rightArm([12.5, 10], [9, 10])], props: DRUM, expr: 'strain' }), front({ arms: [leftArm([3.5, 10], [6.5, 10]), rightArm([12.5, 9.5], [9.5, 8.5])], props: DRUM, expr: 'strain', fx: [star(7, 9)] }), front({ arms: [leftArm([3.5, 9.5], [6, 8.5]), rightArm([12.5, 10], [9, 10])], props: DRUM, expr: 'strain', fx: [star(8, 9)] }), front({ arms: [leftArm([3.5, 10], [6.5, 10]), rightArm([14, 5], [15, 2])], props: DRUM, expr: 'talk', fx: [fx('sparkle', 13, 0), star(1, 2)] })], [150, 150, 150, 900], 2)

const SPARK_HAND = right([13.5, 4.5], [13, 1.5])
const sparkler = gesture('sparkler', 'Sparkler', [[11, 0], [13, -1], [14, 1], [12, 2]].map(([x, y], i) => front({ arms: SPARK_HAND, expr: i % 2 === 0 ? 'o' : 'grin', fx: [fx('sparkle', x ?? 0, y ?? 0), star(i % 2 === 0 ? 15 : 10, 3)] })), [220, 220, 220, 220], 3)

const BUTTERFLY = (y: number): [Limb, Limb] => [leftArm([4.5, y + 3], [7, y]), rightArm([11.5, y + 3], [8.5, y])]
const butterfly = gesture('butterfly', 'Butterfly', [front({ arms: BUTTERFLY(8), expr: 'o' }), front({ arms: [leftArm([3, 9], [5.5, 7]), rightArm([13, 9], [10, 7])], expr: 'o' }), front({ arms: BUTTERFLY(8), expr: 'grin' }), front({ arms: arms([2.5, 6], [1, 3]), expr: 'blink', fx: [fx('sparkle', 7, -1), fx('heart', 12, 1)] })], [250, 250, 250, 900])

const bigWave = gesture('big-wave', 'Big wave', [front({ arms: [leftArm([2.5, 9], [5, 10.5]), rightArm([14, 5], [15.5, 2])], expr: 'talk' }), front({ arms: [leftArm([2.5, 9], [5, 10.5]), rightArm([13.5, 4.5], [11.5, 1.5])], expr: 'grin' })], [300, 300], 4)

const peaceSign = gesture('peace-sign', 'Peace sign', [front({ arms: right([13.5, 6.5], [12, 3.5]), expr: 'wink' }), front({ arms: arms([2.5, 6.5], [3, 3.5]), expr: 'smirk', fx: [star(3, 1), star(12, 1)] }), front({ arms: arms([2.5, 6.5], [3, 3.5]), expr: 'wink', fx: [fx('sparkle', 0, 0), star(12, 1)] })], [600, 600, 900])

const HEART_HANDS = arms([4, 10.5], [7, 8])
const heartHands = gesture('heart-hands', 'Heart hands', [front({ arms: HEART_HANDS, expr: 'grin', fx: [fx('heart', 6.5, 7.5)] }), front({ arms: HEART_HANDS, expr: 'blink', fx: [fx('heart', 6.5, 7.5), fx('heart', 12, 1)] }), front({ arms: HEART_HANDS, expr: 'blink', fx: [fx('heart', 6.5, 7.5), fx('heart', 13, -1), fx('heart', 0, 2)] })], [500, 500, 900])

const blowKiss = gesture('blow-kiss', 'Blown kiss', [front({ arms: right([12.5, 7.5], [9.5, 4.5]), expr: 'o' }), front({ arms: right([14, 6], [15.5, 4]), expr: 'blink', fx: [fx('heart', 13, 0)] }), front({ arms: right([14, 6], [15.5, 4]), expr: 'wink', fx: [fx('heart', 13, 7)] })], [600, 400, 900])

const HORNS = right([13.5, 4.5], [14, 1.5])
const rockOn = gesture('rock-on', 'Rock on', [front({ arms: HORNS, expr: 'talk', fx: [fx('note', 0, 1)] }), front({ arms: HORNS, y: 1, expr: 'strain', fx: [fx('note', 1, 3)] })], [220, 220], 6)

const shaka = gesture('shaka', 'Shaka', [front({ arms: right([13.5, 8], [15.5, 7]), expr: 'smirk' }), front({ arms: right([13.5, 8], [15.5, 8]), expr: 'smirk', fx: [fx('note', 13, 2)] })], [300, 300], 4)

const LASSO_HAND = right([13.5, 4], [12, 1])
const lasso = gesture('lasso', 'Lasso', [front({ arms: LASSO_HAND, expr: 'talk', props: [{ kind: 'band', from: [12, 1], to: [15, 0] }, { kind: 'band', from: [12, 1], to: [8, 0] }] }), front({ arms: LASSO_HAND, expr: 'grin', props: [{ kind: 'band', from: [12, 1], to: [15, 2] }, { kind: 'band', from: [15, 2], to: [10, 0] }] }), front({ arms: LASSO_HAND, expr: 'talk', props: [{ kind: 'band', from: [12, 1], to: [9, 2] }, { kind: 'band', from: [9, 2], to: [15, 0] }] }), front({ arms: right([13.5, 7], [15.5, 7]), expr: 'wink', props: [{ kind: 'band', from: [15.5, 7], to: [15.5, 13] }], fx: [star(14, 3)] })], [250, 250, 250, 900], 1)

const titleBelt = gesture('title-belt', 'Title belt', [front({ arms: arms([2, 4], [2, 1.5]), expr: 'talk', props: [{ kind: 'band', from: [2, 1], to: [13, 1] }], fx: [fx('sparkle', 6.5, 0), star(0, 5)] }), front({ arms: arms([2, 4], [2, 1.5]), y: -1, expr: 'grin', props: [{ kind: 'band', from: [2, 1], to: [13, 1] }], fx: [fx('sparkle', 6.5, 0), star(15, 5)] }), front({ arms: AKIMBO, expr: 'smirk', props: [{ kind: 'band', from: [4.5, 10], to: [10.5, 10] }], fx: [fx('sparkle', 6.5, 9), star(1, 1)] })], [400, 400, 1100])

const MIRROR = { kind: 'wall', x: 15 } as const
const mirrorFlex = gesture('mirror-flex', 'Mirror flex', [STAND_SIDE({ expr: 'smirk', props: [MIRROR] }), STAND_SIDE({ expr: 'wink', props: [MIRROR], arms: [[[7, 7], [6.5, 9.5], [6.5, 11.5]], [[9, 7], [11.5, 6], [10.5, 3]]], fx: [fx('sparkle', 12, 0)] }), STAND_SIDE({ expr: 'grin', props: [MIRROR], arms: [[[7, 7], [6.5, 9.5], [6.5, 11.5]], [[9, 7], [11.5, 6], [10.5, 3]]], fx: [fx('heart', 12, 2)] })], [400, 700, 800])

const RIBBON_HAND = right([13.5, 5], [13.5, 2])
const ribbonTwirl = gesture('ribbon-twirl', 'Ribbon twirl', [front({ arms: RIBBON_HAND, expr: 'grin', props: [{ kind: 'band', from: [13.5, 1.5], to: [15, 0] }, { kind: 'band', from: [15, 0], to: [15, 6] }] }), front({ arms: RIBBON_HAND, expr: 'talk', props: [{ kind: 'band', from: [13.5, 1.5], to: [11, 0] }, { kind: 'band', from: [11, 0], to: [15, 3] }, { kind: 'band', from: [15, 3], to: [13, 9] }] }), turned(front({ arms: RIBBON_HAND, expr: 'grin', props: [{ kind: 'band', from: [13.5, 1.5], to: [15, 0] }, { kind: 'band', from: [15, 0], to: [15, 6] }] })), turned(front({ arms: RIBBON_HAND, expr: 'wink', props: [{ kind: 'band', from: [13.5, 1.5], to: [11, 0] }, { kind: 'band', from: [11, 0], to: [15, 3] }, { kind: 'band', from: [15, 3], to: [13, 9] }], fx: [fx('sparkle', 13, 11)] }))], [300, 300, 300, 600], 1)

const BATON = right([13.5, 4.5], [13.5, 1.5])
const paradeStep = (x: number, isLeftUp: boolean, fxs: readonly Fx[]): Figure =>
  front({
    x,
    arms: [ARMS_DOWN[0], BATON[1]],
    legs: isLeftUp ? [[[6, 12], [5.5, 13]], LEGS[1]] : [LEGS[0], [[10, 12], [10.5, 13]]],
    expr: isLeftUp ? 'talk' : 'grin',
    props: [{ kind: 'mic', at: [13 + x, isLeftUp ? -1 : 0] }],
    fx: fxs,
  })
const tinyParade = gesture('tiny-parade', 'Tiny parade', [paradeStep(-1, true, [fx('note', 0, 2)]), paradeStep(0, false, [fx('confetti', 0, 8)]), paradeStep(1, true, [fx('note', 1, 1)]), paradeStep(0, false, [fx('confetti', 0, 9), fx('note', 0, 2)])], [300, 300, 300, 300], 2)

/** Their gestures: not collected, played on the logged band. */
export const MORE_CELEBRATION_MOVES: readonly Move[] = [
  jumpFive,
  lowTen,
  gimmeOne,
  slideFive,
  bearHug,
  poundHug,
  dap,
  shakeOnIt,
  hipBump,
  footBump,
  thumbWar,
  armWrestle,
  handsIn,
  boop,
  cheers,
  lendLaurel,
  rockPaperScissors,
  ...OFFERS,
  dab,
  floss,
  theWorm,
  cartwheel,
  backflip,
  jazzHands,
  laurelTip,
  fingerGuns,
  theRobot,
  sprinkler,
  spinToeStand,
  proteinPop,
  medalBite,
  royalWave,
  crowdSurf,
  airplaneArms,
  fistPump,
  doubleFistPump,
  heelClick,
  curtsy,
  standingOvation,
  fanfare,
  drumRoll,
  sparkler,
  butterfly,
  bigWave,
  peaceSign,
  heartHands,
  blowKiss,
  rockOn,
  shaka,
  lasso,
  titleBelt,
  mirrorFlex,
  ribbonTwirl,
  tinyParade,
]

export const MORE_CELEBRATION_LINES = [
  { id: 'cel-jump-five', voice: 'swolomon', variants: ['Jump for it, {mate}! Up high!', 'Up here, {mate}. Jump!'] },
  { id: 'cel-jump-five-landed', voice: 'swolomon', variants: ['Airborne contact, {mate}! Rare stuff.', 'You left the ground for that, {mate}.'] },
  { id: 'cel-low-ten', voice: 'swolomon', variants: ['Both hands, way down, {mate}. Low ten!', 'Low ten, {mate}. Mind your knees.'] },
  { id: 'cel-low-ten-landed', voice: 'swolomon', variants: ['Ten fingers, ground level. Respect, {mate}.', 'Low and loud, {mate}. Perfect.'] },
  { id: 'cel-gimme-one', voice: 'swolomon', variants: ['Just one finger, {mate}. Gimme one.', 'One, {mate}. Fingertip to fingertip.'] },
  { id: 'cel-gimme-one-landed', voice: 'swolomon', variants: ['Contact. I feel a glow, {mate}.', 'One finger. Very moving, {mate}.'] },
  { id: 'cel-slide-five', voice: 'swolomon', variants: ['Slide it, {mate}. Smooth.', 'Slide five, {mate}. Slow and smooth.'] },
  { id: 'cel-slide-five-landed', voice: 'swolomon', variants: ['Smooth as a fresh mat, {mate}.', 'Slid right off. Silky, {mate}.'] },
  { id: 'cel-bear-hug', voice: 'swolomon', variants: ['Arms open, {mate}. Bear hug incoming.', 'Bring it in, {mate}. The big one.'] },
  { id: 'cel-bear-hug-landed', voice: 'swolomon', variants: ['Squeeze! Good set, {mate}. Good human.', 'Big squeeze, {mate}. You earned it.'] },
  { id: 'cel-pound-hug', voice: 'swolomon', variants: ['Clasp it, {mate}. Pound hug.', 'Hand here, {mate}. Then back pats.'] },
  { id: 'cel-pound-hug-landed', voice: 'swolomon', variants: ['Clasp, pull, two pats. Textbook, {mate}.', 'Pat pat. We are close now, {mate}.'] },
  { id: 'cel-dap', voice: 'swolomon', variants: ['Dap me up, {mate}.', 'Up here, {mate}. Dap.'] },
  { id: 'cel-dap-landed', voice: 'swolomon', variants: ['Clasp, slide, snap. Dapped, {mate}.', 'Clean dap, {mate}. The snap even worked.'] },
  { id: 'cel-shake-on-it', voice: 'swolomon', variants: ['Same time tomorrow? Shake on it, {mate}.', 'A deal, {mate}. Shake on it.'] },
  { id: 'cel-shake-on-it-landed', voice: 'swolomon', variants: ['Firm grip. Deal sealed, {mate}.', 'Shaken. My lawyer will call, {mate}.'] },
  { id: 'cel-hip-bump', voice: 'swolomon', variants: ['Hip out, {mate}. Bump it.', 'Hip bump, {mate}. On three.'] },
  { id: 'cel-hip-bump-landed', voice: 'swolomon', variants: ['Bump! Nearly lost my footing, {mate}.', 'Hips met, {mate}. Iconic.'] },
  { id: 'cel-foot-bump', voice: 'swolomon', variants: ['Foot out, {mate}. Tap it.', 'Shoe to shoe, {mate}. Foot bump.'] },
  { id: 'cel-foot-bump-landed', voice: 'swolomon', variants: ['Tap. Toes approve, {mate}.', 'Foot bump! Very hygienic, {mate}.'] },
  { id: 'cel-thumb-war', voice: 'swolomon', variants: ['One, two, three, four, thumb war, {mate}!', 'Thumbs ready, {mate}. No mercy.'] },
  { id: 'cel-thumb-war-landed', voice: 'swolomon', variants: ['Pinned! You win this one, {mate}.', 'My thumb lost. My heart won, {mate}.'] },
  { id: 'cel-arm-wrestle', voice: 'swolomon', variants: ['Elbow down, {mate}. Arm wrestle.', 'Grip it, {mate}. Best of one.'] },
  { id: 'cel-arm-wrestle-landed', voice: 'swolomon', variants: ["You won. I didn't let you, {mate}. Honest.", "Down I go! Strong grip, {mate}."] },
  { id: 'cel-hands-in', voice: 'swolomon', variants: ['Hands in, {mate}. Team on three.', 'Hand on mine, {mate}. Team huddle.'] },
  { id: 'cel-hands-in-landed', voice: 'swolomon', variants: ['One, two, three, TEAM! Go, {mate}!', 'Break! Team of two, {mate}.'] },
  { id: 'cel-boop', voice: 'swolomon', variants: ['Hold still, {mate}. Boop incoming.', 'Lean in, {mate}. One boop.'] },
  { id: 'cel-boop-landed', voice: 'swolomon', variants: ['Boop. You have been booped, {mate}.', 'Booped, {mate}. Official.'] },
  { id: 'cel-cheers', voice: 'swolomon', variants: ['Raise your shaker, {mate}. Cheers!', 'A toast, {mate}. To this set.'] },
  { id: 'cel-cheers-landed', voice: 'swolomon', variants: ['Clink! To you, {mate}.', 'Cheers. Vanilla, my favourite, {mate}.'] },
  { id: 'cel-lend-laurel', voice: 'swolomon', variants: ['Here. Hold my laurel, {mate}.', 'You earned a turn with the laurel, {mate}.'] },
  { id: 'cel-lend-laurel-landed', voice: 'swolomon', variants: ['It suits you, {mate}. Give it back later.', 'Laurelled! Looking divine, {mate}.'] },
  { id: 'cel-rock-paper-scissors', voice: 'swolomon', variants: ['Rock, paper, scissors, {mate}. Shoot!', 'Best of one, {mate}. Rock, paper...'] },
  { id: 'cel-rock-paper-scissors-landed', voice: 'swolomon', variants: ['Scissors. You win, {mate}. Naturally.', 'I threw scissors again. Your round, {mate}.'] },
  { id: 'cel-dab', voice: 'swolomon', variants: ['*Dab.* Still current, right, {mate}?', 'A dab for that set, {mate}.'] },
  { id: 'cel-floss', voice: 'swolomon', variants: ['The floss, {mate}! Hips one way, arms the other.', 'Flossing, {mate}. Dentist approved.'] },
  { id: 'cel-the-worm', voice: 'swolomon', variants: ['The worm, {mate}! Floor, meet Swolomon.', 'Doing the worm for you, {mate}.'] },
  { id: 'cel-cartwheel', voice: 'swolomon', variants: ['Cartwheel! Wheee, {mate}!', 'Hands, feet, hands, feet. For you, {mate}.'] },
  { id: 'cel-backflip', voice: 'swolomon', variants: ['Backflip, {mate}! Stuck the landing.', 'Watch this, {mate}. Hup!'] },
  { id: 'cel-jazz-hands', voice: 'swolomon', variants: ['Jazz hands, {mate}! Ta-da!', 'Sparkle fingers for {mate}!'] },
  { id: 'cel-laurel-tip', voice: 'swolomon', variants: ['*Tips laurel.* Well lifted, {mate}.', 'A laurel tip, {mate}. Most distinguished.'] },
  { id: 'cel-finger-guns', voice: 'swolomon', variants: ['Pew pew, {mate}. Nailed it.', 'Finger guns for {mate}. Bang bang.'] },
  { id: 'cel-the-robot', voice: 'swolomon', variants: ['Beep. Set complete, {mate}. Boop.', 'Doing the robot, {mate}. Beep boop.'] },
  { id: 'cel-sprinkler', voice: 'swolomon', variants: ['Tick tick tick tick... sprinkler, {mate}!', 'The sprinkler, {mate}. Watering your gains.'] },
  { id: 'cel-spin-toe-stand', voice: 'swolomon', variants: ['Spin, and... toes! Hee-hee, {mate}.', 'A spin for {mate}. And hold.'] },
  { id: 'cel-protein-pop', voice: 'swolomon', variants: ['Popping the good shaker for {mate}!', 'Pop! Vanilla everywhere, {mate}. Worth it.'] },
  { id: 'cel-medal-bite', voice: 'swolomon', variants: ['Gold. Biting it to check, {mate}.', 'A medal for {mate}. *Bites it.* Real.'] },
  { id: 'cel-royal-wave', voice: 'swolomon', variants: ['A podium wave for {mate}. Very regal.', 'Waving from the podium, {mate}.'] },
  { id: 'cel-crowd-surf', voice: 'swolomon', variants: ['Crowd surf! Catch me, {mate}!', 'The crowd carries me, {mate}. For you.'] },
  { id: 'cel-airplane-arms', voice: 'swolomon', variants: ['Airplane arms, {mate}! Whoosh!', 'Victory lap, {mate}. Wings out.'] },
  { id: 'cel-fist-pump', voice: 'swolomon', variants: ['YES! Fist pump, {mate}!', 'Yes, yes, yes, {mate}!'] },
  { id: 'cel-double-fist-pump', voice: 'swolomon', variants: ['Two fists, {mate}! Double yes!', 'Both fists, {mate}. Double the pump.'] },
  { id: 'cel-heel-click', voice: 'swolomon', variants: ['Heel click, {mate}! Yippee!', 'Click! Heels together for {mate}.'] },
  { id: 'cel-curtsy', voice: 'swolomon', variants: ['A curtsy, {mate}. You did that.', '*Curtsies.* Charmed, {mate}.'] },
  { id: 'cel-standing-ovation', voice: 'swolomon', variants: ['On my feet, {mate}! Bravo!', 'Standing ovation for {mate}. Encore!'] },
  { id: 'cel-fanfare', voice: 'swolomon', variants: ['Ba-da-da-DAAA! Fanfare for {mate}!', 'Trumpets, {mate}! Toot toot!'] },
  { id: 'cel-drum-roll', voice: 'swolomon', variants: ['Drum roll... *crash!* Done, {mate}!', 'Brrrrrr... TSSH! That set, {mate}.'] },
  { id: 'cel-sparkler', voice: 'swolomon', variants: ['A sparkler for {mate}! Fzzzt.', 'Sparkler lit, {mate}. Celebrate!'] },
  { id: 'cel-butterfly', voice: 'swolomon', variants: ['A butterfly, {mate}. Flutter flutter.', 'Look, {mate}. A butterfly. For you.'] },
  { id: 'cel-big-wave', voice: 'swolomon', variants: ['Hi! Hello! Big wave, {mate}!', 'Waving at {mate}! Over here!'] },
  { id: 'cel-peace-sign', voice: 'swolomon', variants: ['Peace, {mate}. Set done.', 'Peace and gains, {mate}.'] },
  { id: 'cel-heart-hands', voice: 'swolomon', variants: ['Heart hands for {mate}.', 'This heart? Yours, {mate}.'] },
  { id: 'cel-blow-kiss', voice: 'swolomon', variants: ['Mwah! Catch, {mate}.', 'Blowing {mate} a kiss. Catch it.'] },
  { id: 'cel-rock-on', voice: 'swolomon', variants: ['Rock on, {mate}! Horns up!', 'That set rocked, {mate}. Horns up.'] },
  { id: 'cel-shaka', voice: 'swolomon', variants: ['Shaka, {mate}. Stay loose.', 'Shaka, {mate}. Good vibes.'] },
  { id: 'cel-lasso', voice: 'swolomon', variants: ['Yeehaw, {mate}! Roped that set.', 'Lasso! Wrangled it, {mate}.'] },
  { id: 'cel-title-belt', voice: 'swolomon', variants: ['And STILL undisputed: {mate}!', 'The title belt goes to {mate}!'] },
  { id: 'cel-mirror-flex', voice: 'swolomon', variants: ['Mirror check, {mate}. Looking proud.', 'Flexing at the mirror for {mate}.'] },
  { id: 'cel-ribbon-twirl', voice: 'swolomon', variants: ['A ribbon twirl, {mate}. Graceful.', 'Twirl, twirl! A ten from me, {mate}.'] },
  { id: 'cel-tiny-parade', voice: 'swolomon', variants: ['A tiny parade for {mate}!', 'Parade! Population: me. For {mate}.'] },
] as const satisfies readonly LineEntry[]
